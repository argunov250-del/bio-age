// Сюжетные арки Хирона (spec 3.3, пункты 6 и 7): «Хирон устал» (сон) и «Возвращение» (после паузы).
// Конечный автомат без побочных эффектов: arcState(ctx, stored) считает состояние и новый stored,
// который вызывающий код сохраняет в 'arcs.v1' (lib/coach/dayStore.js). Усталым Хирон показан только как
// ОТДЕЛЬНЫЙ образ в карточке арки (chironMood), а не на фигуре пользователя. Без вины, без штрафов.
import { keyOf, shiftKey } from './quests';

export const TIRED_NIGHTS = 2;        // подряд ночей с коротким сном для предложения арки
export const COMEBACK_GAP_DAYS = 3;   // не открывали приложение столько дней (spec 3.3, п. 7)
export const COMEBACK_STEPS = 2000;   // параметр продукта (не медицинский порог)
export const ARC_COOLDOWN_DAYS = 7;   // нет повторной арки раньше
export const OFFER_TTL_DAYS = 3;      // предложение живёт столько дней, потом тихо снимается
export const ACTIVE_MAX_DAYS = 7;     // незавершённая арка тихо закрывается (без упрёков)
export const ARC_XP = { tired: 15, back: 10 }; // событие вне дневного потолка

const isN = (x) => typeof x === 'number' && isFinite(x);
const dayDiff = (a, b) => { // b - a в днях
  const f = (k) => { const [y, m, d] = String(k).split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((f(b) - f(a)) / 864e5);
};
const L = (ctx, ru, en) => (ctx.ru !== false ? ru : en);

const blankArc = (n) => ({ phase: 'idle', offeredKey: null, startKey: null, endKey: null, snoozeKey: null, done: new Array(n).fill(false), k2: null, checkin: false });
export const emptyArcs = () => ({ v: 1, tired: blankArc(3), back: blankArc(3), greetedKey: null });

const PHASES = ['idle', 'offered', 'active', 'done', 'closed', 'snoozed'];
const normKey = (k) => (typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k) ? k : null);
function normArc(o) {
  const b = blankArc(3);
  if (!o || typeof o !== 'object') return b;
  b.phase = PHASES.includes(o.phase) ? o.phase : 'idle';
  b.offeredKey = normKey(o.offeredKey); b.startKey = normKey(o.startKey); b.endKey = normKey(o.endKey); b.snoozeKey = normKey(o.snoozeKey);
  b.k2 = normKey(o.k2);
  b.checkin = !!o.checkin;
  if (Array.isArray(o.done)) b.done = b.done.map((_, i) => o.done[i] === true);
  if ((b.phase === 'active' || b.phase === 'done') && !b.startKey) b.phase = 'idle';
  return b;
}
/** Любой вход (строка JSON, объект, мусор) -> корректное состояние. */
export function normalizeArcs(input) {
  let o = input;
  if (typeof input === 'string') { try { o = JSON.parse(input); } catch (e) { o = null; } }
  const r = emptyArcs();
  if (!o || typeof o !== 'object' || o.v !== 1) return r;
  r.tired = normArc(o.tired); r.back = normArc(o.back); r.greetedKey = normKey(o.greetedKey);
  return r;
}

// ───────────────────────── тексты ─────────────────────────
const DEF = {
  tired: {
    title: ['Хирон устал', 'Chiron is tired'],
    steps: [
      { id: 'ritual', ru: 'Вечерний ритуал: 20 минут без экрана перед сном', en: 'Evening ritual: 20 minutes without a screen before bed', auto: false },
      { id: 'bedtime', ru: 'Ровный отбой: лечь примерно в обычное время', en: 'Steady bedtime: go to bed around your usual time', auto: false },
      { id: 'sleep', ru: 'Выспаться: ночь сна не ниже твоей нормы', en: 'Get a good night: sleep at or above your own norm', auto: true },
    ],
    offer: ['Хирон последние ночи спал плохо и ходит сонный. Поможешь ему восстановиться? Три мягких шага за три дня, без спешки.', 'Chiron has slept badly the last few nights and is walking around sleepy. Will you help him recover? Three gentle steps over three days, no rush.'],
    note: ['Если плохой сон держится долго, стоит обсудить его с врачом.', 'If poor sleep lasts a long time, it is worth discussing with a doctor.'],
    active: ['Хирон потихоньку приходит в себя. Любой порядок, можно по одному шагу в день.', 'Chiron is slowly coming around. Any order is fine, one step a day works.'],
    healed: ['Хирон выспался и бодр. Спасибо, что помог.', 'Chiron has slept well and feels fresh. Thank you for helping.'],
    journal: ['Хирон выспался', 'Chiron is well rested'],
  },
  back: {
    title: ['Возвращение', 'Welcome back'],
    steps: [
      { id: 'enter', ru: 'Просто зайти', en: 'Just stop by', auto: true },
      { id: 'step', ru: 'Шаг навстречу: любые 2000 шагов за день', en: 'A step toward each other: any 2000 steps in a day', auto: true },
      { id: 'rhythm', ru: 'Вернуть ритм: любой день с записью или целью по шагам', en: 'Find your rhythm: any day with an entry or your steps goal', auto: true },
    ],
    offer: ['Хирон скучал по тебе. Давай пройдёмся в своём темпе, без счёта дней.', 'Chiron missed you. Let us walk at your own pace, no counting days.'],
    checkin: ['С возвращением. Как ты?', 'Welcome back. How are you?'],
    active: ['С возвращением. Дни не считаю, мне важнее, что ты здесь.', 'Welcome back. I am not counting days; what matters is that you are here.'],
    healed: ['Хирон рад тебе. Ритм вернулся.', 'Chiron is glad to have you. The rhythm is back.'],
    journal: ['Хирон рад тебе', 'Chiron is glad to see you'],
  },
};

const stepList = (id, ctx, st) => DEF[id].steps.map((s, i) => ({ id: s.id, title: L(ctx, s.ru, s.en), done: !!st.done[i], auto: s.auto }));
const pair = (ctx, p) => (ctx.ru !== false ? p[0] : p[1]);
const both = (p) => ({ ru: p[0], en: p[1] });

const none = (stored, extra) => ({ id: null, stage: 'none', title: '', text: '', quests: [], chironMood: 'ok', stored, changed: false, blocked: false, reward: null, ...(extra || {}) });

// ───────────────────────── триггеры ─────────────────────────
function tiredTrigger(ctx) {
  const ss = (ctx.series && ctx.series.sleep) || [];
  const norm = ctx.sleep && ctx.sleep.norm;
  if (!isN(norm) || !ss.length) return false;
  const by = new Map(ss.map((x) => [x.key, Number(x.v) || 0]));
  const last = by.has(ctx.dayKey) ? ctx.dayKey : shiftKey(ctx.dayKey, -1);
  for (let i = 0, k = last; i < TIRED_NIGHTS; i++, k = shiftKey(k, -1)) {
    const v = by.get(k);
    if (!(v > 0 && v < norm - 0.5)) return false;
  }
  return true;
}

// -> { gap: true, prevKey } если до сегодняшнего дня приложение не открывали >= COMEBACK_GAP_DAYS дней.
function comebackTrigger(ctx) {
  if (!Array.isArray(ctx.opens) || !ctx.opens.length) return null;
  const startOfDay = (() => { const [y, m, d] = ctx.dayKey.split('-').map(Number); return new Date(y, m - 1, d).getTime(); })();
  const prev = ctx.opens.filter((t) => t < startOfDay);
  if (!prev.length) return null;
  const prevKey = keyOf(Math.max(...prev));
  return dayDiff(prevKey, ctx.dayKey) >= COMEBACK_GAP_DAYS ? { prevKey } : null;
}

const cooledDown = (st, dayKey) => !st.endKey || dayDiff(st.endKey, dayKey) >= ARC_COOLDOWN_DAYS;

// ───────────────────────── прогресс ─────────────────────────
function progressTired(ctx, st) {
  const done = st.done.slice();
  const norm = ctx.sleep && ctx.sleep.norm;
  const ss = (ctx.series && ctx.series.sleep) || [];
  if (isN(norm) && ss.some((x) => x.key > st.startKey && x.key <= ctx.dayKey && Number(x.v) >= norm - 0.5)) done[2] = true;
  return { ...st, done };
}
function progressBack(ctx, st) {
  const done = st.done.slice();
  done[0] = true;
  let k2 = st.k2;
  const arr = (ctx.series && ctx.series.steps) || [];
  const goal = ctx.steps && ctx.steps.goal;
  if (!done[1]) {
    const hit = arr.filter((x) => x.key >= st.startKey && x.key <= ctx.dayKey && Number(x.v) >= COMEBACK_STEPS).map((x) => x.key).sort()[0];
    if (hit) { done[1] = true; k2 = hit; }
  }
  if (done[1] && !done[2] && k2) {
    const logged = new Set(ctx.activityDays || []);
    const ok = arr.some((x) => x.key > k2 && x.key <= ctx.dayKey && isN(goal) && Number(x.v) >= goal) || [...logged].some((k) => k > k2 && k <= ctx.dayKey);
    if (ok) done[2] = true;
  }
  return { ...st, done, k2 };
}
const progress = (id, ctx, st) => (id === 'tired' ? progressTired(ctx, st) : progressBack(ctx, st));
const doneCount = (st) => st.done.filter(Boolean).length;
const moodOf = (id, stage, st) => {
  if (stage === 'healed') return 'happy';
  if (id === 'tired') return stage === 'active' && doneCount(st) >= 2 ? 'ok' : 'tired';
  return stage === 'active' && doneCount(st) >= 2 ? 'happy' : 'ok';
};

function view(id, stage, ctx, st, stored, extra) {
  const d = DEF[id];
  const text = stage === 'offer' ? pair(ctx, d.offer) : stage === 'checkin' ? pair(ctx, d.checkin) : stage === 'healed' ? pair(ctx, d.healed) : pair(ctx, d.active);
  return {
    id, stage, title: pair(ctx, d.title), text,
    note: id === 'tired' && stage === 'offer' ? pair(ctx, d.note) : null,
    quests: stage === 'offer' || stage === 'checkin' ? (stage === 'checkin' ? [] : stepList(id, ctx, blankArc(3))) : stepList(id, ctx, st),
    chironMood: moodOf(id, stage, st), stored, changed: false, blocked: false, reward: null,
    i18n: { ru: { title: d.title[0], text: stage === 'offer' ? d.offer[0] : stage === 'checkin' ? d.checkin[0] : stage === 'healed' ? d.healed[0] : d.active[0] }, en: { title: d.title[1], text: stage === 'offer' ? d.offer[1] : stage === 'checkin' ? d.checkin[1] : stage === 'healed' ? d.healed[1] : d.active[1] } },
    ...(extra || {}),
  };
}

const withArc = (stored, id, st) => ({ ...stored, [id]: st });

/**
 * Состояние арок на сегодня.
 * @param ctx контекст из buildContext(): dayKey, rest/hold, body.state, sleep, series, opens, steps, activityDays
 * @param stored содержимое 'arcs.v1' (объект/строка/null)
 * @returns {{ id: 'tired'|'back'|null, stage: 'none'|'offer'|'checkin'|'active'|'healed', title, text, note?, quests: [{id,title,done,auto}],
 *   chironMood: 'tired'|'ok'|'happy', stored, changed, blocked, reward: {xp, eventId, journal}|null }}
 *   stored — новое состояние для сохранения; reward — только в момент завершения (один раз).
 */
export function arcState(ctx, stored) {
  const c = ctx || {};
  const st0 = normalizeArcs(stored);
  if (!c.dayKey) return none(st0);
  // защитная пауза, день отдыха и усталость по здоровью: арки не начинаются и не продолжаются
  if (c.rest || c.hold || (c.body && c.body.state === 'tired')) return none(st0, { blocked: true });
  let s = st0;
  let changed = false;
  const day = c.dayKey;
  const set = (id, a) => { s = withArc(s, id, a); changed = true; };

  // 1) активная арка продолжается
  for (const id of ['tired', 'back']) {
    const a = s[id];
    if (a.phase !== 'active') continue;
    const p = progress(id, c, a);
    if (p.done.every(Boolean)) {
      set(id, { ...p, phase: 'done', endKey: day });
      return { ...view(id, 'healed', c, s[id], s), changed: true, reward: { xp: ARC_XP[id], eventId: `arc.${id}.${a.startKey}`, journal: both(DEF[id].journal) } };
    }
    if (dayDiff(a.startKey, day) > ACTIVE_MAX_DAYS) { set(id, { ...p, phase: 'closed', endKey: day }); continue; }
    if (JSON.stringify(p) !== JSON.stringify(a)) set(id, p);
    return { ...view(id, 'active', c, s[id], s), changed };
  }
  // 2) завершённая арка в день завершения показывается «выздоровевшей» (без повторной награды)
  for (const id of ['tired', 'back']) {
    const a = s[id];
    if (a.phase === 'done' && a.endKey === day) return { ...view(id, 'healed', c, a, s), changed };
  }
  // 3) предложение (одна арка за раз): сохранённое или новое
  for (const id of ['back', 'tired']) {
    let a = s[id];
    if (a.phase === 'offered' && dayDiff(a.offeredKey, day) > OFFER_TTL_DAYS) { set(id, { ...blankArc(3), endKey: a.endKey }); a = s[id]; }
    if (a.phase === 'snoozed' && a.snoozeKey !== day) { a = { ...a, phase: 'idle' }; set(id, a); }
    if (a.phase === 'snoozed') continue;
    if (a.phase === 'offered') return { ...view(id, a.checkin ? 'checkin' : 'offer', c, a, s), changed };
    if ((a.phase === 'idle' || a.phase === 'done' || a.phase === 'closed') && cooledDown(a, day)) {
      let fire = null;
      if (id === 'back') {
        const t = comebackTrigger(c);
        if (t) fire = { checkin: !!(c.lastRestKey && dayDiff(c.lastRestKey, t.prevKey) >= 0 && dayDiff(c.lastRestKey, t.prevKey) <= 1) };
      } else if (tiredTrigger(c)) fire = { checkin: false };
      // другая арка уже идёт или ждёт ответа — новую не начинаем
      const other = id === 'back' ? 'tired' : 'back';
      if (fire && !['offered', 'active'].includes(s[other].phase)) {
        const n = { ...blankArc(3), phase: 'offered', offeredKey: day, endKey: a.endKey, checkin: fire.checkin };
        set(id, n);
        return { ...view(id, fire.checkin ? 'checkin' : 'offer', c, n, s), changed: true };
      }
    }
  }
  return none(s, { changed });
}

/**
 * Действие пользователя -> новый stored.
 * action: 'accept' (начать), 'later' (не сегодня), 'close' (закрыть), 'answer' (ответил на «Как ты?» в арке «Возвращение»),
 * 'check' (отметить шаг арки «Хирон устал»: opts.index 0..1; шаг 3 определяется по данным сна).
 */
export function arcAct(stored, id, action, now = Date.now(), opts = {}) {
  if (id !== 'tired' && id !== 'back') return normalizeArcs(stored);
  const s = normalizeArcs(stored);
  const a = s[id];
  const day = keyOf(now);
  if (action === 'accept' && a.phase === 'offered' && !a.checkin) {
    return withArc(s, id, { ...a, phase: 'active', startKey: day, done: id === 'back' ? [true, false, false] : [false, false, false] });
  }
  if (action === 'answer' && id === 'back' && a.phase === 'offered' && a.checkin) return withArc(s, id, { ...a, checkin: false });
  if (action === 'later' && a.phase === 'offered') return withArc(s, id, { ...a, phase: 'snoozed', snoozeKey: day });
  if (action === 'close' && (a.phase === 'offered' || a.phase === 'active' || a.phase === 'snoozed')) return withArc(s, id, { ...a, phase: 'closed', endKey: day });
  if (action === 'check' && id === 'tired' && a.phase === 'active') {
    const i = opts.index;
    if (i === 0 || i === 1) { const done = a.done.slice(); done[i] = true; return withArc(s, id, { ...a, done }); }
  }
  return s;
}

/** Приветствие Хирона упоминает арку не чаще раза в день. */
export const arcMarkGreeted = (stored, dayKey) => ({ ...normalizeArcs(stored), greetedKey: normKey(dayKey) });
