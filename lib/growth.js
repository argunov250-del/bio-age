// «Рост»: персонаж (силуэт на главной) растёт от 0 до 100 уровня за здоровые привычки.
// XP начисляется с первого дня запуска функции (история до него не считается), а сегодняшний день
// считается в реальном времени уже с первого запуска; окно 7 дней для «опоздавших» данных.
//
// Дневные источники (потолок 50 XP/день, один раз на источник в день, дробные — дельтой):
//   шаги 1 XP/1000 (макс. 12), сон ≥ нормы 12, запись 4, вода по цели 6 (половина 3),
//   витамины 2, дыхание ≥5 мин 4, цифровая пауза ≥15 мин 4, тренировка 10 (необязательный бонус),
//   серия 7 дней шагов +6 (внутри потолка, не пункт списка — growth.streak).
// Достижения +25 — событие ВНЕ потолка и списка (today.bonus), один раз на id; секретные — так же.
//
// Математика (симуляция в __tests__/growthXp.test.js, xpForLevel(100) = 13 000 XP):
//   хорошие привычки без воды (≈ 9000 шагов, сон, тренировки 3 раза в неделю, запись через день) ≈ 507 дней;
//   те же + вода/витамины/дыхание ≈ 389 дней (≈ 13 мес.); частичные привычки ≈ 1064 дня (≈ 3 года).
//
// Форма growth: { level, xp, xpInLevel, xpToNext, progress, maxed,
//   today: { xp, cap, bonus, sources: [{ id, label, xp(=макс.), max, got, done, optional? }] },
//   streak: { days, target: 7, bonusXp },
//   rank: { index, name, nextAt },                 // см. lib/ranks.js
//   events: [{ type: 'levelUp'|'rankUp'|'achievement'|'secret', ... }],  // только за этот расчёт
//   journal: [{ type, day, at, level?|rank?|id?, xp? }],                 // последние 60 дней
//   tier, tiers, startedAt }
// computeGrowth(..., opts = { activities, seenRank }); rank.seen.v1 хранит индекс увиденного ранга.
import { RU } from './i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEntries } from './storage';
import { stepGoal, sleepGoal } from './goals';
import { rankFor } from './ranks';
import { SECRET_IDS } from './achievements';

const t = (ru, en) => (RU ? ru : en);
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (x) => {
  const d = new Date(x);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MAX_LEVEL = 100;
export const DAILY_CAP = 50;
export const XP = { steps: 12, sleep: 12, workout: 10, log: 4, streak: 6, achievement: 25, water: 6, vitamins: 2, breath: 4, pause: 4 };
export const STEPS_PER_XP = 1000;
export const STEPS_XP_MAX = 12;
const JOURNAL_DAYS = 60;
const RANK_SEEN_KEY = 'rank.seen.v1';
const STREAK_LEN = 7;
const WINDOW_DAYS = 7; // «опоздавшие» данные за последние дни ещё засчитываются (один раз)
const KEY = 'growth.v1';

export const xpForLevel = (L) => {
  const n = Math.max(0, Math.min(MAX_LEVEL, Math.floor(Number(L) || 0)));
  return Math.round(25 * n + 1.05 * n * n);
};

export function levelFromXp(xp) {
  const x = Number(xp);
  if (!isFinite(x) || x <= 0) return 0;
  let lo = 0, hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xpForLevel(mid) <= x) lo = mid; else hi = mid - 1;
  }
  return lo;
}

const mkTier = (id, minLevel, ru, en, dru, den) => ({
  id, minLevel,
  get name() { return t(ru, en); },
  get description() { return t(dru, den); },
});

export const TIERS = [
  mkTier('outline', 0, 'Контур', 'Outline', 'Едва заметный набросок: путь только начинается.', 'A faint sketch: the journey is just beginning.'),
  mkTier('spark', 3, 'Искра', 'Spark', 'Появился первый огонёк — привычки зажигаются.', 'The first spark appears as habits ignite.'),
  mkTier('sprout', 8, 'Росток', 'Sprout', 'Силуэт тянется вверх и набирает форму.', 'The silhouette reaches upward and takes shape.'),
  mkTier('stride', 15, 'Шаг', 'Stride', 'Уверенная осанка, ровное дыхание, лёгкая походка.', 'Steady posture, even breathing, an easy gait.'),
  mkTier('glow', 25, 'Свечение', 'Glow', 'Тело излучает мягкий свет — режим работает.', 'The body gives off a soft glow: your routine works.'),
  mkTier('bloom', 40, 'Расцвет', 'Bloom', 'Сила и энергия расцветают на глазах.', 'Strength and energy bloom for all to see.'),
  mkTier('flame', 55, 'Пламя', 'Flame', 'Яркий внутренний огонь не гаснет неделями.', 'A bright inner fire that stays lit for weeks.'),
  mkTier('aura', 75, 'Аура', 'Aura', 'Вокруг силуэта собирается сияющая аура.', 'A radiant aura gathers around the silhouette.'),
  mkTier('radiant', 100, 'Сияние', 'Radiance', 'Максимум: сияющий образ как награда за год привычек.', 'The peak: a radiant look earned by a year of habits.'),
];


// ---------- даты ----------
const shiftKey = (key, n) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n, 12));
};
const keyMs = (key) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, m - 1, d, 12).getTime();
};
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// ---------- 2.3: чистые функции начисления ----------
// XP за шаги дня: floor(шаги / 1000), не больше 12; мусор и отрицательные -> 0.
export const stepsXp = (steps) => {
  const n = Number(steps);
  return isFinite(n) && n > 0 ? Math.min(STEPS_XP_MAX, Math.floor(n / STEPS_PER_XP)) : 0;
};

// Вода: цель достигнута 6, половина цели 3.
export const waterXp = (ml, goal) => {
  const m = num(ml), g = num(goal);
  if (m <= 0 || g <= 0) return 0;
  return m >= g ? XP.water : m >= g / 2 ? Math.round(XP.water / 2) : 0;
};

/**
 * Начислить XP за день по «целевым» значениям источников (накопительно за день).
 * Порядок ключей = приоритет при потолке. Начисляется только разница с rec.got[id].
 * -> { xp, got, added }
 */
export function applyDailyXp(rec, earned, cap = DAILY_CAP) {
  const out = { xp: num(rec && rec.xp), got: { ...((rec && rec.got) || {}) }, added: 0 };
  for (const id of Object.keys(earned || {})) {
    const target = Math.max(0, Math.floor(num(earned[id])));
    const delta = target - num(out.got[id]);
    if (delta <= 0) continue;
    const x = Math.min(delta, cap - out.xp);
    if (x <= 0) continue;
    out.xp += x; out.got[id] = num(out.got[id]) + x; out.added += x;
  }
  return out;
}

// Событийный бонус (достижение): ВНЕ потолка, один раз на id. -> { bonus, ach, added }
export function applyBonusXp(rec, achId, amount = XP.achievement) {
  const ach = [...((rec && rec.ach) || [])];
  let bonus = num(rec && rec.bonus), added = 0;
  if (typeof achId === 'string' && !ach.includes(achId)) { ach.push(achId); bonus += amount; added = amount; }
  return { bonus, ach, added };
}

// ---------- условия за день ----------
// Возвращает числа/флаги за день (по готовым данным). act — запись активностей дня (вода/витамины/дыхание/пауза).
function metDay(key, startKey, result, profile, entries, act) {
  const se = (result && result.series) || {};
  const stepsArr = Array.isArray(se.steps) ? se.steps : [];
  const sleepArr = Array.isArray(se.sleep) ? se.sleep : [];
  const age = result && result.chrono != null ? result.chrono : profile && profile.age;
  const sg = stepGoal(age);
  const norm = result && result.scores && result.scores.sleep ? result.scores.sleep.norm : null;
  const slg = sleepGoal(norm);
  const stepsOf = (k) => { const x = stepsArr.find((s) => s && s.key === k); return x ? num(x.v) : 0; };
  const sleepEntry = sleepArr.find((x) => x && x.key === key);
  const sleepV = sleepEntry ? num(sleepEntry.v) : 0;
  const workouts = Array.isArray(se.workouts) ? se.workouts : [];
  const list = Array.isArray(entries) ? entries : [];
  const workout = workouts.some((w) => w && isFinite(w.start) && dayKey(w.start) === key)
    || list.some((e) => e && e.type === 'workout' && e.date === key);
  let run = 0;
  for (let k = key; k >= startKey && run < 400; k = shiftKey(k, -1)) {
    if (stepsOf(k) >= sg) run++; else break;
  }
  const a = act && typeof act === 'object' ? act : {};
  return {
    stepsN: stepsOf(key),
    stepsGoal: stepsOf(key) >= sg,
    sleep: sleepV > 0 && sleepV >= slg,
    workout,
    log: list.some((e) => e && e.date === key),
    run,
    streak: run > 0 && run % STREAK_LEN === 0,
    water: waterXp(a.waterMl, a.waterGoalMl),
    vitamins: a.vitamins === true,
    breath: num(a.breathMin) >= 5,
    pause: num(a.pauseMin) >= 15,
  };
}

const LABELS = {
  steps: () => t('Шаги', 'Steps'),
  sleep: () => t('Сон не меньше нормы', 'Sleep at or above your norm'),
  water: () => t('Вода по норме', 'Water goal'),
  log: () => t('Запись в дневнике', 'Manual log entry'),
  vitamins: () => t('Чек-ин витаминов', 'Vitamins check-in'),
  breath: () => t('Дыхание 5 минут', 'Breathing, 5 min'),
  pause: () => t('Цифровая пауза 15 минут', 'Digital pause, 15 min'),
  workout: () => t('Тренировка', 'Workout'),
};
// Список заданий дня. streak и achievement — не задания (см. growth.streak и бонусы).
const ORDER = ['steps', 'sleep', 'water', 'log', 'vitamins', 'breath', 'pause', 'workout'];
const OPTIONAL = { workout: true };
// Порядок приоритета при упоре в потолок (streak последним среди дневных).
const AWARD_ORDER = ['steps', 'sleep', 'water', 'log', 'vitamins', 'breath', 'pause', 'workout', 'streak'];

// ---------- сборка результата ----------
function buildGrowth(state, todayKey, events = []) {
  const xp = Math.max(0, Math.round(num(state.xp)));
  const level = levelFromXp(xp);
  const maxed = level >= MAX_LEVEL;
  const cur = xpForLevel(level), next = xpForLevel(Math.min(MAX_LEVEL, level + 1));
  const xpInLevel = maxed ? 0 : xp - cur;
  const xpToNext = maxed ? 0 : Math.max(0, next - xp);
  const progress = maxed ? 1 : next > cur ? Math.max(0, Math.min(1, xpInLevel / (next - cur))) : 0;
  const rec = (state.days && state.days[todayKey]) || { xp: 0, got: {}, base: [] };
  const sources = ORDER.map((id) => {
    const got = num(rec.got && rec.got[id]);
    const item = {
      id, label: LABELS[id](), xp: XP[id], max: XP[id], got,
      done: got >= XP[id] || got > 0 && id !== 'steps' && id !== 'water' || !!(rec.met && rec.met[id]) || (rec.base || []).includes(id),
    };
    if (OPTIONAL[id]) item.optional = true;
    return item;
  });
  let index = 0;
  TIERS.forEach((x, i) => { if (level >= x.minLevel) index = i; });
  const tr = TIERS[index];
  const rk = rankFor(level);
  const run = num(rec.run);
  return {
    level, xp, xpInLevel, xpToNext, progress, maxed,
    today: { xp: Math.min(DAILY_CAP, Math.max(0, num(rec.xp))), cap: DAILY_CAP, bonus: num(rec.bonus), sources },
    streak: { days: run > 0 ? ((run - 1) % STREAK_LEN) + 1 : 0, target: STREAK_LEN, bonusXp: XP.streak },
    rank: { index: rk.index, name: rk.name, nextAt: rk.nextAt },
    events,
    journal: Array.isArray(state.journal) ? state.journal.map((e) => ({ ...e })) : [],
    tier: { id: tr.id, name: tr.name, minLevel: tr.minLevel, index },
    tiers: TIERS.map((x) => ({
      id: x.id, name: x.name, description: x.description, minLevel: x.minLevel,
      unlocked: level >= x.minLevel,
      progress: level >= x.minLevel ? 1 : Math.max(0, Math.min(1, xp / Math.max(1, xpForLevel(x.minLevel)))),
    })),
    startedAt: num(state.startedAt),
  };
}

/**
 * Чистая функция: (состояние, расчёт, профиль, ключ сегодня, новые достижения, ручные записи, опции).
 * opts = { activities: { [dayKey]: { waterMl, waterGoalMl, vitamins, breathMin, pauseMin } }, seenRank: число|null }
 */
export function computeGrowth(state, result, profile, todayKey, fresh = [], entries = [], opts = {}) {
  let s = state && typeof state === 'object' && state.startKey ? state : null;
  const freshIds = Array.isArray(fresh) ? fresh.filter((x) => typeof x === 'string') : [];
  const activities = (opts && opts.activities && typeof opts.activities === 'object') ? opts.activities : {};
  if (!s) {
    s = { v: 1, startKey: todayKey, startedAt: keyMs(todayKey), xp: 0, days: {}, journal: [] };
  }
  const days = {};
  for (const k of Object.keys(s.days || {})) {
    const d = s.days[k] || {};
    days[k] = { ...d, got: { ...(d.got || {}) }, met: { ...(d.met || {}) }, ach: [...(d.ach || [])] };
  }
  const levelBefore = levelFromXp(num(s.xp));
  let journal = Array.isArray(s.journal) ? s.journal.map((e) => ({ ...e })) : [];
  let total = num(s.xp);
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const key = shiftKey(todayKey, -i);
    if (key < s.startKey) continue;
    const rec = days[key] || (days[key] = { xp: 0, got: {}, met: {}, base: [], ach: [] });
    const m = metDay(key, s.startKey, result, profile, entries, activities[key]);
    const earned = {
      steps: stepsXp(m.stepsN),
      sleep: m.sleep ? XP.sleep : 0,
      water: m.water,
      log: m.log ? XP.log : 0,
      vitamins: m.vitamins ? XP.vitamins : 0,
      breath: m.breath ? XP.breath : 0,
      pause: m.pause ? XP.pause : 0,
      workout: m.workout ? XP.workout : 0,
      streak: m.streak && m.stepsGoal ? XP.streak : 0,
    };
    const ordered = {};
    for (const id of AWARD_ORDER) if (!(rec.base || []).includes(id)) ordered[id] = earned[id];
    const r = applyDailyXp(rec, ordered);
    rec.xp = r.xp; rec.got = r.got; total += r.added;
    if (m.stepsGoal) rec.met.steps = true;
    if (key === todayKey) {
      rec.run = m.stepsGoal ? m.run : (() => {
        // серия «до вчера»: показываем накопленное, пока день не закончен
        const se = (result && result.series) || {};
        const arr = Array.isArray(se.steps) ? se.steps : [];
        const age = result && result.chrono != null ? result.chrono : profile && profile.age;
        const sg = stepGoal(age);
        let n = 0;
        for (let k = shiftKey(key, -1); k >= s.startKey && n < 400; k = shiftKey(k, -1)) {
          const x = arr.find((q) => q && q.key === k);
          if (x && num(x.v) >= sg) n++; else break;
        }
        return n;
      })();
      for (const a of freshIds) {
        const b = applyBonusXp(rec, a);
        if (!b.added) continue;
        rec.ach = b.ach; rec.bonus = b.bonus; total += b.added;
        journal.push({ type: SECRET_IDS.includes(a) ? 'secret' : 'achievement', id: a, xp: b.added, day: key, at: keyMs(key) });
      }
    }
  }
  const oldest = shiftKey(todayKey, -(WINDOW_DAYS + 3));
  for (const k of Object.keys(days)) if (k < oldest) delete days[k];
  total = Math.min(xpForLevel(MAX_LEVEL) + 1000000, total);
  const levelAfter = levelFromXp(total);
  const events = [];
  for (let L = levelBefore + 1; L <= levelAfter; L++) {
    journal.push({ type: 'levelUp', level: L, day: todayKey, at: keyMs(todayKey) });
    events.push({ type: 'levelUp', level: L });
  }
  for (const a of freshIds) {
    const j = journal.find((e) => (e.type === 'achievement' || e.type === 'secret') && e.id === a && e.day === todayKey);
    if (j) events.push({ type: j.type, id: a, xp: j.xp });
  }
  const rk = rankFor(levelAfter);
  const seen = opts && typeof opts.seenRank === 'number' ? opts.seenRank : null;
  if (seen != null && rk.index > seen) {
    events.push({ type: 'rankUp', rank: { index: rk.index, name: rk.name } });
    if (!journal.some((e) => e.type === 'rankUp' && e.rank === rk.index)) {
      journal.push({ type: 'rankUp', rank: rk.index, day: todayKey, at: keyMs(todayKey) });
    }
  }
  const cutoff = shiftKey(todayKey, -JOURNAL_DAYS);
  journal = journal.filter((e) => e && e.day >= cutoff);
  const next = { ...s, xp: total, days, journal };
  return { state: next, growth: buildGrowth(next, todayKey, events) };
}

// ---------- хранение ----------
let lastGrowth = null;
const store = () => AsyncStorage;

export async function loadGrowth() {
  try {
    const raw = await store().getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.startKey) return null;
    lastGrowth = buildGrowth(s, dayKey(Date.now()));
    return lastGrowth;
  } catch (e) {
    return lastGrowth;
  }
}

async function loadActs() {
  try {
    const mod = require('./activities');
    const fn = mod && mod.loadActivities;
    if (typeof fn !== 'function') return {};
    const a = await fn();
    return a && typeof a === 'object' ? a : {};
  } catch (e) {
    return {};
  }
}

export async function updateGrowth(result, profile, now = Date.now(), fresh = []) {
  try {
    const st = store();
    let state = null;
    try { const raw = await st.getItem(KEY); state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
    let entries = [];
    try { entries = await loadEntries(); } catch (e) { entries = []; }
    let seenRank = null;
    try { const r = await st.getItem(RANK_SEEN_KEY); if (r != null && isFinite(Number(r))) seenRank = Number(r); } catch (e) { seenRank = null; }
    const activities = await loadActs();
    const out = computeGrowth(state, result, profile, dayKey(now), fresh, entries, { activities, seenRank });
    await st.setItem(KEY, JSON.stringify(out.state));
    // ранг запоминается только вперёд; первый запуск фиксирует текущий без события
    const idx = out.growth.rank.index;
    if (seenRank == null || idx > seenRank) { try { await st.setItem(RANK_SEEN_KEY, String(idx)); } catch (e) { /* ignore */ } }
    lastGrowth = out.growth;
    return out.growth;
  } catch (e) {
    return lastGrowth;
  }
}

// Награда за событие вне потолка (арки Хирона): один раз на eventId, строка в журнале.
// text — { ru, en } для журнала. -> новый growth (с событиями levelUp) либо прежний, если награда уже была.
export async function awardEvent(eventId, xp, text, now = Date.now()) {
  try {
    const st = store();
    const todayKey = dayKey(now);
    let state = null;
    try { const raw = await st.getItem(KEY); state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
    if (!state || !state.startKey) state = { v: 1, startKey: todayKey, startedAt: keyMs(todayKey), xp: 0, days: {}, journal: [] };
    const days = { ...(state.days || {}) };
    const rec = { xp: 0, got: {}, met: {}, base: [], ach: [], ...(days[todayKey] || {}) };
    const b = applyBonusXp(rec, eventId, Math.max(0, Math.round(num(xp))));
    if (!b.added) return lastGrowth;
    rec.ach = b.ach; rec.bonus = b.bonus;
    days[todayKey] = rec;
    const before = levelFromXp(num(state.xp));
    const total = num(state.xp) + b.added;
    const after = levelFromXp(total);
    const journal = Array.isArray(state.journal) ? state.journal.map((e) => ({ ...e })) : [];
    journal.push({ type: 'arc', id: eventId, xp: b.added, day: todayKey, at: now, text: text && typeof text === 'object' ? { ru: String(text.ru || ''), en: String(text.en || '') } : null });
    const events = [];
    for (let L = before + 1; L <= after; L++) {
      journal.push({ type: 'levelUp', level: L, day: todayKey, at: now });
      events.push({ type: 'levelUp', level: L });
    }
    const next = { ...state, xp: total, days, journal };
    await st.setItem(KEY, JSON.stringify(next));
    lastGrowth = buildGrowth(next, todayKey, events);
    return lastGrowth;
  } catch (e) {
    return lastGrowth;
  }
}
