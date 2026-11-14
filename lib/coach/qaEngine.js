// Движок «вопросов кнопками»: пользователь не пишет текст, а выбирает вопрос из каталога lib/coach/qa.
// answerQuestion — короткий ответ с данными человека + «Подробнее» (more, sources); suggestions — 4–6 контекстных вопросов.
// Чистые функции: память (coachState.v1) возвращается обновлённой, сохраняет её вызывающий код.
import { RU } from '../i18n';
import { FACTS } from '../knowledge';
import { analyze, reply } from '../coachBrain';
import { stepGoal } from '../goals';
import { selectHumor, hash } from '../humor/select';
import { normalizeMode } from '../humor/config';
import { deserialize, advance, RECENT_MAX } from './memory';
import { RANK_NAMES, rankIndexOf } from './greetExtra';
import { QA, QA_BY_ID, visible } from './qa';

const isN = (x) => typeof x === 'number' && isFinite(x);
const t = (ru, en, isRu) => (isRu ? ru : en);
const num1 = (x, ru) => String(Math.round(x * 10) / 10).replace('.', ru ? ',' : '.');
const hm = (h, ru) => { const m = Math.round(h * 60); return Math.floor(m / 60) + t(' ч ', ' h ', ru) + String(m % 60).padStart(2, '0') + t(' мин', ' min', ru); };
const grp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Окружение вопроса: { result, profile, s, extra, ru, memory, history, tone, perf }.
// perf — результат computePerf (lib/perf): восстановление, нагрузка, сон; может быть null.
export function makeEnv({ result, profile, extra, memory, history, tone, perf, now } = {}) {
  let s = {};
  try { s = analyze(result, profile || {}); } catch (e) { s = {}; }
  return { result, profile: profile || {}, s, extra: extra || null, ru: RU, memory, history: history || [], tone, perf: perf || null, now };
}

const ZONE_NAME = { green: ['зелёная', 'green'], yellow: ['жёлтая', 'yellow'], red: ['красная', 'red'] };

// Строки про восстановление, нагрузку и сон из lib/perf. Нет данных -> ключ не добавляется.
function perfVars(perf, ru) {
  const v = {};
  if (!perf || typeof perf !== 'object') return v;
  const rec = perf.recovery, st = perf.strain, tg = perf.strainTarget, sl = perf.sleep, wk = perf.weekly;
  if (rec && isN(rec.pct)) {
    const z = ZONE_NAME[rec.zone];
    v.recoveryLine = t(`Восстановление сегодня — ${Math.round(rec.pct)} %${z ? ', ' + z[0] + ' зона' : ''}.`, `Recovery today is ${Math.round(rec.pct)}%${z ? ', ' + z[1] + ' zone' : ''}.`, ru);
  }
  if (st && isN(st.day)) v.strainLine = t(`Нагрузка за день — ${num1(st.day, ru)} из 21.`, `Strain today is ${num1(st.day, ru)} out of 21.`, ru);
  if (tg && isN(tg.low) && isN(tg.high)) v.strainTargetLine = t(`Цель на сегодня — ${num1(tg.low, ru)}–${num1(tg.high, ru)}.`, `Today's target is ${num1(tg.low, ru)}–${num1(tg.high, ru)}.`, ru);
  if (sl) {
    const need = sl.tonight && isN(sl.tonight.needH) ? sl.tonight.needH : sl.needH;
    if (isN(need) && need > 0) v.sleepNeedLine = t(`Сегодня ночью тебе нужно примерно ${hm(need, ru)} сна.`, `Tonight you need about ${hm(need, ru)} of sleep.`, ru);
    if (isN(sl.performancePct)) v.sleepPerfLine = t(`Прошлой ночью ты спал(а) ${Math.round(sl.performancePct)} % от своей потребности.`, `Last night you slept ${Math.round(sl.performancePct)}% of your need.`, ru);
    if (isN(sl.debtH) && sl.debtH >= 0.1) v.sleepDebtLine = t(`Недосып за последние дни — около ${hm(sl.debtH, ru)}.`, `Your recent sleep debt is about ${hm(sl.debtH, ru)}.`, ru);
    if (isN(sl.efficiencyPct)) v.sleepEffLine = t(`Эффективность сна — ${Math.round(sl.efficiencyPct)} %.`, `Sleep efficiency is ${Math.round(sl.efficiencyPct)}%.`, ru);
    if (isN(sl.consistencyPct)) v.sleepConsLine = t(`Регулярность сна за последние ночи — ${Math.round(sl.consistencyPct)} %.`, `Your sleep consistency over recent nights is ${Math.round(sl.consistencyPct)}%.`, ru);
  }
  const mon = Array.isArray(perf.healthMonitor) ? perf.healthMonitor.filter((x) => x && (x.status === 'in' || x.status === 'out')) : [];
  if (mon.length) {
    const out = mon.filter((x) => x.status === 'out').length;
    v.monitorLine = out
      ? t(`Показателей вне личной нормы сегодня: ${out} из ${mon.length}.`, `Readings outside your personal range today: ${out} of ${mon.length}.`, ru)
      : t('Показатели монитора сегодня в твоей личной норме.', 'Your monitor readings are within your personal range today.', ru);
  }
  if (wk) {
    const parts = [];
    if (isN(wk.avgRecovery)) parts.push(t(`восстановление ${Math.round(wk.avgRecovery)} %`, `recovery ${Math.round(wk.avgRecovery)}%`, ru));
    if (isN(wk.avgStrain)) parts.push(t(`нагрузка ${num1(wk.avgStrain, ru)}`, `strain ${num1(wk.avgStrain, ru)}`, ru));
    if (isN(wk.avgSleepPerf)) parts.push(t(`сон ${Math.round(wk.avgSleepPerf)} % от потребности`, `sleep ${Math.round(wk.avgSleepPerf)}% of need`, ru));
    if (parts.length) v.weekLine = t('За неделю в среднем: ', 'Weekly average: ', ru) + parts.join(', ') + '.';
  }
  return v;
}

// Переменные ответа. Нет данных -> '' (строка опускается). Неизвестное никогда не заменяется нулём.
export function buildQaVars(env) {
  const ru = env.ru !== false;
  const s = env.s || {};
  const p = env.profile || {};
  const v = {};
  if (isN(s.sleep7)) v.sleepAvgLine = t(`В среднем за неделю ты спишь ${hm(s.sleep7, ru)}.`, `Over the past week you slept ${hm(s.sleep7, ru)} on average.`, ru);
  else if (isN(s.sleepH)) v.sleepAvgLine = t(`Прошлой ночью ты спал(а) ${hm(s.sleepH, ru)}.`, `Last night you slept ${hm(s.sleepH, ru)}.`, ru);
  if (isN(s.steps7)) v.stepsAvgLine = t(`За неделю у тебя в среднем ${grp(s.steps7)} шагов в день.`, `Over the week you average ${grp(s.steps7)} steps a day.`, ru);
  if (isN(s.rhr7)) v.restHrLine = t(`Твой пульс покоя за неделю — около ${Math.round(s.rhr7)} уд/мин.`, `Your resting heart rate this week is about ${Math.round(s.rhr7)} bpm.`, ru);
  if (isN(s.hrv7)) {
    const base = isN(s.hrvBase) ? t(`, обычно около ${Math.round(s.hrvBase)}`, `, usually about ${Math.round(s.hrvBase)}`, ru) : '';
    v.hrvLine = t(`Твой HRV за неделю — около ${Math.round(s.hrv7)} мс${base}.`, `Your HRV this week is about ${Math.round(s.hrv7)} ms${base}.`, ru);
  }
  if (isN(s.vo2)) v.vo2Line = t(`Оценка VO2max по данным приложения — ${num1(s.vo2, ru)} мл/кг/мин.`, `Your VO2max estimate from the app is ${num1(s.vo2, ru)} ml/kg/min.`, ru);
  if (isN(s.bio) && isN(s.age)) v.bioAgeLine = t(`Возраст тела сейчас ${Math.round(s.bio)} при паспортных ${Math.round(s.age)}.`, `Your body age is ${Math.round(s.bio)} against ${Math.round(s.age)} by the calendar.`, ru);
  if (isN(s.readiness)) v.readinessLine = t(`Готовность сегодня — ${Math.round(s.readiness)} из 100.`, `Today's readiness is ${Math.round(s.readiness)} out of 100.`, ru);
  v.stepGoal = grp(isN(s.stepGoal) ? s.stepGoal : stepGoal(isN(s.age) ? s.age : null));
  if (isN(s.sleepNorm)) v.sleepNorm = hm(s.sleepNorm, ru);
  if (isN(p.weight) && p.weight >= 25 && p.weight <= 350) v.waterGoal = t(`около ${num1(p.weight * 0.03, ru)} л`, `about ${num1(p.weight * 0.03, ru)} L`, ru);
  const lvl = env.extra && isN(env.extra.level) ? env.extra.level : null;
  Object.assign(v, perfVars(env.perf, ru));
  if (lvl != null) { v.curLevel = String(Math.floor(lvl)); const i = rankIndexOf(lvl); if (i != null) v.curRank = RANK_NAMES[i][ru ? 0 : 1]; }
  return v;
}

const PH = /\{([A-Za-z0-9_]+)\}/g;
// Подставляет переменные; отсутствующие -> '' и аккуратная чистка пробелов/знаков.
export function fill(text, vars) {
  const out = String(text == null ? '' : text).replace(PH, (_, k) => (vars[k] != null ? vars[k] : ''));
  return out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:!?])/g, '$1').replace(/\s*\n\s*/g, '\n').replace(/([.!?])\s*[,;]/g, '$1').trim();
}

const srcOf = (list) => (Array.isArray(list) ? list : []).map((x) => {
  if (typeof x === 'string') { const f = FACTS[x]; return f ? { text: f.text, source: f.source } : null; }
  return x && typeof x === 'object' && x.title ? x : null;
}).filter(Boolean);

export const lang = (x, ru) => (x ? (ru ? x.ru : x.en) : '');

// -> { id, text[], more, sources[], follow[], humorId, memory }
export function answerQuestion(id, env, memory) {
  const q = QA_BY_ID[id];
  if (!q) return null;
  const e = env || makeEnv({});
  const ru = e.ru !== false;
  const mem0 = deserialize(memory || e.memory);
  const vars = buildQaVars(e);
  // ротация коротких вариантов: берём тот, что использовался давнее всего (LRU по mem.qaRecent)
  const idx = [];
  q.short.forEach((sv, i) => { if (fill(lang(sv, ru), vars)) idx.push(i); });
  const pool = idx.length ? idx : [0];
  const pos = (i) => mem0.qaRecent.lastIndexOf(q.id + '#' + i);
  const k = pool.slice().sort((a, b) => pos(a) - pos(b) || a - b)[0];
  let text = fill(lang(q.short[k], ru), vars).split('\n').filter(Boolean);
  if (!text.length) text = [lang(q.q, ru)];
  // юмор: общие правила (режим, паузы, частота, чувствительность); вопросы кнопками шутку не вызывают сами, но каталог может подойти по ситуации
  let humorId = null;
  try {
    const mode = e.tone === 'off' ? 'off' : normalizeMode(mem0.humorMode || e.tone);
    const blocked = !!mem0.hold || q.humorOk === false;
    if (!blocked && mode !== 'off') {
      const sel = selectHumor({ input: q.id, ctx: { blocked: false, situations: [q.id, ...(q.tags || [])], flags: [] }, intent: null, mode, history: e.history, session: { dampened: !!(e.session && e.session.dampened) }, ru });
      if (sel) {
        const pl = sel.placement === 'inline' && text.length < 2 ? 'lead' : sel.placement;
        if (pl === 'lead') text = [sel.text, ...text]; else if (pl === 'inline') text.splice(1, 0, sel.text); else text.push(sel.text);
        humorId = sel.item.id;
      }
    }
  } catch (err) { humorId = null; }
  const next = advance(mem0, { now: typeof e.now === 'number' ? e.now : undefined });
  next.qaRecent = [...mem0.qaRecent, q.id + '#' + k].slice(-RECENT_MAX);
  next.qaAsked = [...mem0.qaAsked.filter((x) => x !== q.id), q.id].slice(-RECENT_MAX);
  const follow = (q.follow || []).filter((f) => QA_BY_ID[f] && visible(e, [QA_BY_ID[f]]).length);
  return { id: q.id, text, more: fill(lang(q.more, ru), vars), sources: srcOf(q.sources), follow, humorId, memory: next };
}

// Сигналы по данным -> веса разделов.
function sectionWeights(e) {
  const s = e.s || {};
  const w = {};
  const add = (k, x) => { w[k] = (w[k] || 0) + x; };
  if ((isN(s.sleepH) && isN(s.sleepNorm) && s.sleepH < s.sleepNorm - 0.5) || (isN(s.sleepScore) && s.sleepScore < 60) || (isN(s.sleep7) && s.sleep7 < 7)) add('sleep', 3);
  if (s.load === 'high' || s.state === 'tired' || (isN(s.readiness) && s.readiness < 40)) { add('recovery', 3); add('training', 1); }
  if (s.state === 'fresh') add('training', 2);
  if (isN(s.steps7) && isN(s.stepGoal) && s.steps7 < s.stepGoal * 0.7) add('activity', 2);
  if ((isN(s.hrvDev) && s.hrvDev < -10) || (isN(s.nightHrDiff) && s.nightHrDiff > 3)) add('heart', 2);
  if (s.stress === 'high' || (isN(s.stress) && s.stress >= 7)) add('stress', 2);
  if (isN(s.delta) && s.delta > 0) add('bodyage', 2);
  if (!s.has) { add('app', 3); add('chiron', 1); }
  const p = e.perf;
  if (p && p.recovery && p.recovery.zone === 'red') { add('recovery', 3); add('training', 1); }
  if (p && p.sleep && isN(p.sleep.debtH) && p.sleep.debtH >= DEBT_HIGH_H) add('sleep', 2);
  return w;
}

// Вопросы, которые стоит показать первыми по данным perf: красное восстановление, большой недосып, нагрузка заметно ниже цели вечером.
export const DEBT_HIGH_H = 1;      // недосып (ч), с которого предлагаем разобрать потребность во сне
export const STRAIN_GAP = 3;       // насколько ниже нижней границы цели считается «далеко»
export const EVENING_HOUR = 18;    // с этого часа вечер
function perfLeads(e) {
  const p = e.perf;
  if (!p || typeof p !== 'object') return [];
  const out = [];
  if (p.recovery && p.recovery.zone === 'red') out.push('recovery_red_zone', 'recovery_pct_zones');
  if (p.sleep && isN(p.sleep.debtH) && p.sleep.debtH >= DEBT_HIGH_H) out.push('sleep_need_today');
  const tg = p.strainTarget, cur = p.strain && p.strain.day;
  const hour = new Date(isN(e.now) ? e.now : Date.now()).getHours();
  if (tg && isN(tg.low) && isN(cur) && cur < tg.low - STRAIN_GAP && hour >= EVENING_HOUR) out.push('training_strain_target');
  return out;
}

// 4–6 id вопросов: продолжения последнего, затем по данным; недавно заданные исключены; один 'pro' — если человек уже спрашивал pro.
export function suggestions(env, memory, lastId, n = 5) {
  const e = env || makeEnv({});
  const mem = deserialize(memory || e.memory);
  const avail = visible(e, QA);
  if (!avail.length) return [];
  const want = Math.max(4, Math.min(6, n));
  const recentSet = new Set(mem.qaAsked.slice(-Math.max(12, want * 3)));
  const askedPro = mem.qaAsked.some((id) => QA_BY_ID[id] && QA_BY_ID[id].level === 'pro');
  const w = sectionWeights(e);
  const turn = mem.turn || 0;
  const score = (q) => (w[q.section] || 0) + (q.level === 'base' ? 1 : askedPro ? 0.5 : -5) + (q.section === 'app' || q.section === 'chiron' ? 0.3 : 0) + (hash(q.id + '|' + turn) % 100) / 200;
  const out = [];
  const push = (id) => { if (out.length < want && !out.includes(id) && id !== lastId && QA_BY_ID[id] && avail.includes(QA_BY_ID[id])) out.push(id); };
  const last = lastId && QA_BY_ID[lastId];
  perfLeads(e).filter((id) => !recentSet.has(id)).slice(0, 2).forEach(push);
  if (last) (last.follow || []).filter((f) => !recentSet.has(f)).slice(0, 3).forEach(push);
  const rank = (list) => list.slice().sort((a, b) => score(b) - score(a) || (a.id < b.id ? -1 : 1));
  const fresh = rank(avail.filter((q) => !recentSet.has(q.id) && q.id !== lastId && (q.level === 'base' || askedPro)));
  const perSec = {};
  out.forEach((id) => { const s2 = QA_BY_ID[id].section; perSec[s2] = (perSec[s2] || 0) + 1; });
  if (askedPro && !out.some((id) => QA_BY_ID[id].level === 'pro')) {
    const pro = fresh.find((q) => q.level === 'pro');
    if (pro) { push(pro.id); perSec[pro.section] = (perSec[pro.section] || 0) + 1; }
  }
  fresh.forEach((q) => { if ((perSec[q.section] || 0) < 2 && out.length < want && !(q.level === 'pro' && out.some((id) => QA_BY_ID[id].level === 'pro'))) { push(q.id); perSec[q.section] = (perSec[q.section] || 0) + 1; } });
  fresh.forEach((q) => { if (out.length < want && !(q.level === 'pro' && askedPro === false)) push(q.id); }); // догон, если разделов мало
  if (out.length < Math.min(want, 4)) rank(avail.filter((q) => q.id !== lastId && q.level === 'base')).forEach((q) => push(q.id)); // всё спрашивали — не оставляем пусто
  return out;
}

// «Мне плохо»: красные флаги (103/112) и кризисный ответ из существующих сценариев. Ничего не сохраняет, ничего не считает.
export function safetyAnswer(env) {
  const e = env || makeEnv({});
  const o = { history: [], tone: 'off', session: {} };
  const red = reply('Мне плохо, боль в груди, трудно дышать', e.result, e.profile, o).text;
  const crisis = reply('Не хочу жить', e.result, e.profile, o).text;
  return [t('Мне жаль, что тебе сейчас плохо. Я рядом.', "I'm sorry you feel bad right now. I'm here.", e.ru !== false), ...red, ...crisis];
}
