// Движок сценариев: маршрутизация по приоритету (см. PRIORITY в nlu.js) -> выбор варианта (select.js) ->
// сборка (assemble.js) -> проверка. Ничего не знает о сети и не запрашивает погоду: данные приходят в env.
// Возвращает null, если ответ должен дать прежний конвейер (старые builders в coachBrain.js).
import { pickVariant, age } from './select';
import { assemble, validate, variantApplies } from './assemble';
import { buildVars } from './vars';
import { weatherState, condName } from './weatherCtx';
import { answersPending, TOPIC_NAMES } from './nlu';
import { knownParam } from './memory';
import { SCENARIOS, BY_ID } from './scenarios';

const CONTROL_ID = { short: 'ctl_short', detailed: 'ctl_detailed', nojokes: 'ctl_nojokes', funnier: 'ctl_funnier', simpler: 'ctl_simpler', repeat: 'ctl_repeat', norepeat: 'ctl_norepeat', why: 'ctl_why', other: 'ctl_other', ok: 'ctl_ok', thanks: 'ctl_thanks', no: 'ctl_no', yes: 'ctl_yes' };
const TOPIC_TO_LEGACY = { sleep: 'sleep', train: 'train', steps: 'move', heart: 'heart', stress: 'stress', weight: 'weight', cycle: 'cycle', age: 'age', weather: 'today' };
const RECOMMEND_TOPICS = new Set(['today', 'train', 'sleep', 'move', 'heart', 'age', 'stress', 'weight', 'cycle']);
const ROUTED_GROUPS = new Set(['steps', 'sleep', 'recovery', 'habits', 'results', 'greeting', 'plan']);
const cap = (x) => (x ? x[0].toUpperCase() + x.slice(1) : x);
const textVar = (name, value) => ({ name, value, kind: 'text', unit: null, period: null, source: null, updatedAt: null, available: typeof value === 'string' && value.length > 0 });

// ───────────────────────── погода ─────────────────────────
// Эффективные условия: слова пользователя > свежие данные > неизвестно (старое/сохранённое НЕ используется как текущее).
function effective(env, W) {
  const uc = env.ctx.weather || {};
  if (uc.cond) return { src: 'user', cond: uc.cond, level: uc.level };
  if (W.status === 'current') return { src: 'cache', cond: W.cond, level: W.level, temp: W.temp };
  return { src: 'none', cond: null, level: null };
}

const isUnknownState = (env) => !!env.s && env.s.state === 'unknown';
function weatherRoute(env, W, known) {
  const { nlu, ctx } = env;
  const uc = ctx.weather || {};
  const wx = nlu.wx;
  if (wx.geo && (wx.ask || P_DENY.test(nlu.norm))) return 'wx_geo_denied';
  if (wx.ask && wx.otherPlace && !(W.place && W.place.toLowerCase().replace(/ё/g, 'е').slice(0, 4) === wx.otherPlace.slice(0, 4))) return 'wx_other_place';
  if (wx.missing && (wx.ask || nlu.tokens.length <= 6) && (!uc.cond || uc.cond === 'wind') && !env.legacyIntent) return 'wx_missing_field';
  if (wx.forecast && (wx.ask || env.legacyIntent === 'weather_train') && (!uc.cond || wx.askCond)) return 'wx_forecast';
  if (wx.walk && nlu.activity === 'walk' && (wx.ask || uc.cond)) return 'wx_walk';
  // свежая опасная погода важна и без слов о погоде, если человек собирается заниматься на улице
  const dangerNow = W.status === 'current' && W.level === 'danger' && !env.legacyIntent && (nlu.outdoorAct || known.place === 'outdoor');
  // «А если пойти на пробежку?», «А в зале?» после разговора о погоде: меняется место/занятие, условия те же
  const followAct = /^wx_/.test(String(env.mem.lastScenario || '')) && !wx.ask && (!!nlu.activity || !!nlu.place) && nlu.tokens.length <= 8 && !nlu.cont && !nlu.past && nlu.want !== 'neg';
  const train = env.legacyIntent === 'weather_train' || env.forceTrainWeather || dangerNow || followAct;
  if (train) {
    const e = effective(env, W);
    const place = known.place || (uc.indoor && !uc.outdoor ? 'indoor' : null);
    const indoor = ['home', 'gym', 'indoor'].includes(place);
    const outdoor = place === 'outdoor' || (!place && nlu.outdoorAct);
    // в помещении погода не влияет (нет данных, обычная, хорошая): о ней не говорим, отвечаем про тренировку
    if (indoor && e.level !== 'danger' && e.level !== 'inconvenient') return isUnknownState(env) ? 'train_unknown' : 'train_today';
    if (e.level === 'danger') return indoor ? 'wx_train_danger_indoor' : 'wx_train_danger_outdoor';
    if (e.level === 'inconvenient') return indoor ? 'wx_train_bad_indoor' : outdoor ? 'wx_train_bad_outdoor' : 'wx_train_bad_ask';
    if (e.level === 'good') return 'wx_train_good';
    if (e.src === 'cache') return 'wx_train_ordinary';
    return 'wx_train_unknown';
  }
  if (wx.ask) return W.status === 'current' ? 'wx_now' : 'wx_now_unknown';
  return null;
}
const P_DENY = /не дал|отказ|нет |запрет|выключ|не хочу|denied|declin|refus|no /;

// ───────────────────────── защитная пауза ─────────────────────────
// После красного флага / боли / травмы в этой сессии нагрузка, тренировочные рекомендации и юмор заблокированы,
// пока человек сам не скажет, что всё прошло. Уточнения («что делать?», «это пройдёт?») получают осторожный ответ.
const HOLD_CONTROLS = ['other', 'norepeat', 'simpler', 'yes', 'why', 'detailed'];
const HOLD_LEGACY = ['weather_train', 'simplify', 'procrastination', 'plan_review', 'plan_change', 'achievement', 'return_habit'];
function holdRoute(env) {
  const { nlu } = env;
  if (nlu.passed && !nlu.isQuestion) return { id: 'sens_hold_release', release: true };
  if (nlu.cont && nlu.pure) return HOLD_CONTROLS.includes(nlu.cont) ? { id: 'sens_hold_followup' } : null;
  if (nlu.gibberish || nlu.capability || nlu.dataLimit || nlu.unsupported) return null;
  if (SCENARIOS.some((sc) => sc.group === 'greeting' && sc.match && sc.match(nlu, env))) return null;
  const nonTrain = nlu.topics.length > 0 && !nlu.topics.includes('train') && !nlu.activity && !nlu.want && !nlu.avoid && !nlu.whyShort;
  return nonTrain ? null : { id: 'sens_hold_followup' };
}
const trainishScenario = (sc) => !!sc && (['train', 'today'].includes(sc.recommends) || ['training', 'plan', 'motivation'].includes(sc.group) || /^wx_train|^wx_walk$|^follow_(short|want)|^train_tomorrow/.test(sc.id));
const trainishLegacy = (env) => HOLD_LEGACY.includes(env.legacyIntent) || ['train', 'today'].includes(env.legacyTopicId);

// ───────────────────────── маршрутизация ─────────────────────────
function route(env, W, known) {
  const { nlu, mem, ctx } = env;
  if (env.death === 'joke') return { id: 'sens_death_joke' };
  if (env.death === 'cautious') return { id: 'sens_unsure' };
  if (env.forceHold) return { id: 'sens_hold_followup' };
  if (mem.hold && mem.hold.kind === 'soft') { if (nlu.passed && !nlu.isQuestion) return { id: 'sens_soft_release', release: true }; }
  else if (mem.hold) { const h = holdRoute(env); if (h) return h; }
  if (nlu.cont && nlu.pure) return { id: CONTROL_ID[nlu.cont], control: nlu.cont };
  if (mem.pending && !nlu.cont) {
    const a = answersPending(nlu, mem.pending);
    if (a) return { resume: a, pending: mem.pending };
  }
  if (nlu.gibberish) return { id: 'scope_gibberish' };
  if (nlu.userData && (nlu.userData.sleep || nlu.userData.steps)) return { id: 'data_user_stated' };
  if (nlu.capability && !(env.sens && nlu.capability !== 'cap_diagnose')) return { id: nlu.capability };
  if (nlu.dataLimit && !(nlu.dataLimit === 'data_source_unavailable' && env.legacyIntent === 'weather_train')) return { id: nlu.dataLimit };
  for (const sc of SCENARIOS) if (sc.group === 'follow' && sc.match && sc.match(nlu, env)) return { id: sc.id };
  if (nlu.whyShort && mem.lastScenario && !nlu.cont) return { id: 'ctl_why', control: 'why' };
  const wx = weatherRoute(env, W, known);
  if (wx) return { id: wx, weather: true };
  for (const sc of SCENARIOS) if ((sc.group === 'motivation' || sc.group === 'training') && sc.match && sc.match(nlu, env)) return { id: sc.id };
  for (const sc of SCENARIOS) if (ROUTED_GROUPS.has(sc.group) && sc.match && sc.match(nlu, env)) return { id: sc.id }; // шаги, сон, восстановление, привычки, результаты
  if (ctx.sensitive.noJokes && !env.legacyIntent && !env.legacyTopic) return { id: 'ctl_nojokes', control: 'nojokes' };
  if (nlu.multiTopic && (nlu.topics.length >= 3 || !env.legacyIntent)) return { id: 'scope_multi' };
  if (env.legacyIntent) return null;
  if (nlu.unsupported && !nlu.topics.length) return { id: nlu.unsupported === 'joke_order' ? 'scope_joke_order' : 'scope_unsupported' };
  if (env.legacyTopic) return null;
  if (nlu.ambiguous) return { id: 'scope_ambiguous' };
  return { id: 'scope_unknown' };
}

// ───────────────────────── отрисовка сценария ─────────────────────────
function render(sc, env, vars, opts) {
  const o = opts || {};
  const ru = env.ru;
  const wenv = { place: o.place, s: env.s, level: o.level, src: o.src, wstatus: o.wstatus, env };
  let cands = sc.variants.filter((v) => variantApplies(v, vars, ru) && (!v.when || v.when(wenv)));
  if (o.only && cands.some((c) => c.id === o.only)) cands = cands.filter((c) => c.id === o.only);
  if (!cands.length) return null;
  const tried = [];
  const recent = env.mem.recent;
  for (let guard = 0; guard < cands.length; guard++) {
    const rest = cands.filter((c) => !tried.includes(c.id));
    if (!rest.length) break;
    const v = pickVariant(rest, recent, { exclude: o.exclude, safety: sc.sensitive });
    let sel = null;
    if (sc.humor && !sc.sensitive && v.humorOk !== false && env.pickHumor) sel = env.pickHumor(sc.humor, sc.danger ? ['danger', 'danger_weather'] : []);
    const joke = sel ? { text: sel.text, placement: sel.placement } : null;
    const out = assemble(v, { ru, vars, brevity: env.mem.brevity, joke, wantExplain: o.wantExplain, danger: !!sc.danger, adviceFirst: sc.group === 'weather' || sc.adviceFirst, onlyExplain: o.onlyExplain });
    if (validate(out.paras, { jokeCount: out.jokeUsed ? 1 : 0 }).ok) return { v, paras: out.paras, sel: out.jokeUsed ? sel : null, explained: out.explained };
    tried.push(v.id);
  }
  return null;
}

const dampenOf = (c) => (c === 'nojokes' ? true : c === 'funnier' ? false : undefined);

function control(c, env, vars, known) {
  const { mem, legacy } = env;
  const rec = mem.lastRecommendation;
  const base = (id, opts) => render(BY_ID[id], env, vars, opts);
  const result = (r, paras, extra) => ({ scenario: r.v ? scenarioOf(r.v.id) : null, variant: r.v.id, paras, ...(extra || {}) });
  const ack = base(CONTROL_ID[c]);
  if (!ack) return null;
  const withAck = (extraParas, extra) => result(ack, [ack.paras[0], ...extraParas].filter(Boolean), extra);
  const ctxLost = () => { const r = base('ctl_context_lost'); return result(r, r.paras); };
  const reAsk = (id) => { const r = base(id); return result(r, r.paras, { pending: r.v.pending ? { key: r.v.pending.key, topic: id } : null }); };
  const why = () => (rec && legacy.why ? legacy.why(rec.topic) : null);
  const lastCoach = () => { const l = [...(env.history || [])].reverse().find((h) => h && h.from === 'coach'); return l && Array.isArray(l.text) ? l.text.join(' ') : ''; };
  const sameAsLast = (paras) => { const lt = lastCoach(); return !!lt && paras.length > 0 && paras.every((x) => lt.includes(x)); };
  const alt = () => {
    const sc = BY_ID[mem.lastScenario];
    if (sc && sc.group !== 'control' && !String(sc.id).startsWith('wx_') && sc.variants.length > 1) {
      const tried = [mem.lastVariant];
      for (let i = 0; i < sc.variants.length; i++) {
        const r = render(sc, env, vars, { exclude: tried, place: known.place, src: 'none' });
        if (!r || tried.includes(r.v.id)) break;
        if (!sameAsLast(r.paras)) { env._altVid = r.v.id; return r.paras; }
        tried.push(r.v.id);
      }
    }
    const li = !sc && legacy.altIntent ? legacy.altIntent(mem.lastScenario) : null;
    if (li) return li;
    const la = rec && legacy.alt ? legacy.alt(rec.topic, known.place) : null;
    return la && !sameAsLast(la) ? la : null;
  };
  // «Другого варианта нет»: честно говорим об этом и предлагаем другой шаг (если он есть), а не повторяем тот же текст
  const noOther = () => {
    const r = base('ctl_no_other');
    const said = (env.history || []).filter((h) => h && h.from === 'coach').slice(-8).map((h) => (Array.isArray(h.text) ? h.text.join(' ') : '')).join(' ');
    const fresh = (paras) => Array.isArray(paras) && paras.length > 0 && paras.every((x) => !said.includes(x));
    const cands = rec ? [legacy.alt && legacy.alt(rec.topic, known.place), legacy.simpler && legacy.simpler(rec.topic), legacy.step && legacy.step(rec.topic)] : [];
    const step = cands.find(fresh);
    if (step) return result(r, [r.paras[0], ...step]);
    const t = base('ctl_no_other_topic');
    return result(r, [r.paras[0], t.paras[0]]);
  };
  switch (c) {
    case 'short': return withAck([], { brevity: 'short' });
    case 'detailed': { const w = why(); return withAck(w || [], { brevity: 'detailed' }); }
    case 'nojokes': return withAck([], { humorMode: 'off', dampen: true });
    case 'funnier':
      if (env.tone === 'off') { const r = base('ctl_funnier_blocked'); return result(r, r.paras); }
      return withAck([], { humorMode: 'playful', dampen: false });
    case 'simpler': {
      const sp = mem.lastTopic && legacy.simpler ? legacy.simpler(mem.lastTopic) : null;
      return sp ? withAck(sp) : reAsk('ctl_simpler_ask');
    }
    case 'repeat': {
      const last = [...(env.history || [])].reverse().find((h) => h && h.from === 'coach');
      const txt = last && Array.isArray(last.text) ? last.text.filter((x) => typeof x === 'string' && x.trim()) : null;
      return txt && txt.length ? withAck(txt) : ctxLost();
    }
    case 'norepeat': { const a = alt(); return a ? withAck(a) : rec || mem.lastScenario ? noOther() : ctxLost(); }
    case 'why': {
      const w = why() || (!BY_ID[mem.lastScenario] && legacy.whyIntent ? legacy.whyIntent(mem.lastScenario) : null);
      if (w) return withAck(w);
      const sc = BY_ID[mem.lastScenario];
      if (sc && sc.group !== 'control') {
        // объясняем именно тот ответ, который был показан (его вариант), одним абзацем-объяснением
        const own = render(sc, env, vars, { wantExplain: true, only: mem.lastVariant, onlyExplain: true });
        if (own && own.explained) return result(ack, [ack.paras[0], ...own.paras]);
        const r = render(sc, env, vars, { wantExplain: true });
        if (r && r.paras.length) return result(ack, [ack.paras[0], ...r.paras]);
      }
      const r = base('ctl_why_unknown');
      return result(r, r.paras);
    }
    case 'other': { const a = alt(); return a ? withAck(a) : rec || mem.lastScenario ? noOther() : ctxLost(); }
    case 'no': {
      if (env.nlu.reject && !mem.pending) { const a = alt(); if (a) return withAck(a, { resolved: true }); }
      if (mem.pending || rec) return withAck([], { resolved: true });
      const r = base('ctl_no_lost');
      return result(r, r.paras, { resolved: true });
    }
    case 'yes': {
      if (mem.pending) return ctxLost();
      const st = rec && legacy.step ? legacy.step(rec.topic) : null;
      if (st) return withAck(st);
      const r = base('ctl_yes_lost');
      return result(r, r.paras);
    }
    default: return withAck([]);
  }
}
const scenarioOf = (variantId) => (SCENARIOS.find((s) => s.variants.some((v) => v.id === variantId)) || {}).id || null;

// ───────────────────────── точка входа ─────────────────────────
export function respond(env) {
  const { nlu, mem } = env;
  const W = weatherState(env.weather, env.now);
  const known = { place: nlu.place || (nlu.outdoorAct && !nlu.avoid ? 'outdoor' : null) || knownParam(mem, 'place'), activity: nlu.activity || knownParam(mem, 'activity') };
  let r = route(env, W, known);
  if (mem.hold && !env.forceHold) {
    // защитная пауза: тренировочные сценарии и рекомендации заменяются осторожным ответом
    const hid = mem.hold.kind === 'soft' ? 'sens_soft_train' : 'sens_hold_followup';
    if (!r && trainishLegacy(env)) r = { id: hid };
    else if (r && r.id && !r.resume && trainishScenario(BY_ID[r.id])) r = { id: hid };
  }
  if (!r) return null;
  const newKnown = {};
  if (nlu.place) newKnown.place = nlu.place;
  if (nlu.activity) newKnown.activity = nlu.activity;
  let resolved = false;
  if (r.resume) {
    // ответ на уточнение: параметр запоминаем и продолжаем сценарий, который спрашивал
    const key = r.pending.key;
    resolved = true;
    if (key === 'which_topic') {
      const t = r.resume === 'first' ? ((r.pending.data && r.pending.data.topics) || [])[0] : r.resume;
      const lt = TOPIC_TO_LEGACY[t];
      return lt ? { kind: 'legacyTopic', topic: lt, resolved: true } : null;
    }
    if (key === 'place') { newKnown.place = r.resume; known.place = r.resume; }
    if (key === 'activity') { newKnown.activity = r.resume; known.activity = r.resume; }
    const asked = r.pending.topic;
    if (key === 'simplify_what') r = { id: r.resume === 'workout' ? 'mot_simplify_workout' : 'mot_simplify_daily' };
    else if (asked && String(asked).startsWith('wx_train')) {
      env.forceTrainWeather = true;
      const d = r.pending.data;
      if (d && d.src === 'user' && d.cond) env.ctx.weather = { ...env.ctx.weather, cond: d.cond, level: d.level };
      r = { id: weatherRoute(env, W, known), weather: true }; }
    else r = { id: asked || 'scope_unknown' };
    if (!r.id) return null;
  }
  const sc = BY_ID[r.id];
  if (!sc) return null;
  const e = effective(env, W);
  const place = known.place || null;
  const outdoor = place === 'outdoor' || (!place && nlu.outdoorAct);
  const vars = buildVars(env.s, W, known, { sleep: nlu.userData && nlu.userData.sleep, steps: nlu.userData && nlu.userData.steps }, env.ru);
  const x = (name, value) => { vars[name] = textVar(name, value); };
  const legacy = env.legacy || {};
  // Формулировки одной и той же рекомендации чередуются по давности использования (основной блок, а не только хвост)
  const usedAlts = [];
  const altVar = (name, key, alts, fallback) => {
    if (!alts || !alts.length) { x(name, fallback || ''); return; }
    let best = 0; let bestAge = -1;
    alts.forEach((a, i) => { const ag = age(env.mem.recentMain, key + ':' + i); if (ag > bestAge) { best = i; bestAge = ag; } });
    x(name, alts[best]);
    usedAlts.push({ key: key + ':' + best, text: alts[best] });
  };
  altVar('baseTrain', 'train:' + ((env.s && env.s.state) || 'unknown'), legacy.trainLines ? legacy.trainLines() : null, legacy.trainLine ? legacy.trainLine() : '');
  altVar('sleepTips', 'sleeptips', legacy.sleepAlts ? legacy.sleepAlts() : null, '');
  x('dangerWhy', legacy.dangerWhy ? legacy.dangerWhy(e.cond) || '' : '');
  x('wxCond', e.src === 'cache' ? condName(e.cond, env.ru) || condName(W.kind, env.ru) : '');
  const cc = e.cond ? condName(e.cond, env.ru) : '';
  x('curCond', cc);
  x('curCondCap', cap(cc));
  x('askPlace', !place && !outdoor && !['wx_train_danger_outdoor'].includes(sc.id) ? 'yes' : '');
  x('askActivity', !known.activity ? 'yes' : '');
  x('topicList', nlu.topics.map((t) => (TOPIC_NAMES[t] ? TOPIC_NAMES[t][env.ru ? 0 : 1] : null)).filter(Boolean).slice(0, 4).join(', '));
  const dangerous = e.level === 'danger' && !!sc.danger;

  let out;
  if (r.control) out = control(r.control, env, vars, known);
  else {
    const rr = render(sc, env, vars, { place: place || (nlu.outdoorAct ? 'outdoor' : null), level: e.level, src: e.src, wstatus: W.status });
    out = rr ? { scenario: sc.id, variant: rr.v.id, paras: rr.paras, humor: rr.sel, noRec: !!rr.v.noRec, pending: rr.v.pending ? { key: rr.v.pending.key, topic: sc.id, data: rr.v.pending.key === 'which_topic' ? { topics: nlu.topics.slice(0, 4) } : rr.v.pending.key === 'place' && e.src === 'user' ? { src: 'user', cond: e.cond, level: e.level } : null } : null } : null;
  }
  if (!out) return null;
  const outText = out.paras.join(' ');
  const mainKeys = usedAlts.filter((a) => outText.includes(a.text)).map((a) => a.key);
  const isControl = !!r.control;
  const final = {
    kind: 'engine', scenario: out.scenario || sc.id, variant: out.variant, paras: out.paras, humor: out.humor || null,
    pending: out.pending || null, resolved: resolved || !!out.resolved, known: newKnown, mainKeys, release: !!r.release,
    altVariant: isControl && env._altVid ? env._altVid : null, brevity: out.brevity, humorMode: out.humorMode, dampen: out.dampen !== undefined ? out.dampen : dampenOf(r.control),
    topic: isControl ? null : sc.topic, sensitive: !!sc.sensitive, danger: dangerous || !!sc.danger,
    recommends: !isControl && sc.recommends && !out.noRec ? { topic: sc.recommends, kind: sc.id } : (!isControl && ['train', 'weather'].includes(sc.topic) && /^(wx_train|train_alt|mot_)/.test(sc.id) ? { topic: 'train', kind: sc.id } : isControl ? undefined : null),
    next: sc.topic === 'weather' || sc.topic === 'train' ? ['train', 'today', 'move'] : undefined,
  };
  return final;
}

export { RECOMMEND_TOPICS };
