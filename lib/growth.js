// «Рост»: персонаж (силуэт на главной) растёт от 0 до 100 уровня за здоровые привычки.
// XP начисляется с первого дня запуска функции (история до него не считается), а сегодняшний день
// считается в реальном времени уже с первого запуска.
//
// Математика. Базовый хороший день: шаги 12 + сон 12 + любая запись 4 = 28 XP, тренировка
// +10 (3–4 раза в неделю ≈ +5,7/день), бонус за 7 дней шагов подряд +6 (раз в 7 дней ≈ +0,9/день),
// достижения +25 разово. Итого ≈ 34–35 XP/день при стабильных привычках.
// Всего до 100 уровня: xpForLevel(100) = 25·100 + 1,05·100² = 13 000 XP → ≈ 450 дней (≈ 15 месяцев).
// Кривая: xpForLevel(L) = round(25·L + 1,05·L²); цена уровня L растёт с 26 до ≈ 235 XP:
// 1-й уровень — за первый хороший день, последние — по ≈ 7 дней каждый.
// Частичные привычки (≈ 16 XP/день) дают сотню лишь за ≈ 2,5 года и дольше.
// Потолок — 50 XP в день, поэтому накрутить нельзя; день считается один раз (по ключу даты).
import { RU } from './i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadEntries } from './storage';
import { stepGoal, sleepGoal } from './goals';

const t = (ru, en) => (RU ? ru : en);
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (x) => {
  const d = new Date(x);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const MAX_LEVEL = 100;
export const DAILY_CAP = 50;
export const XP = { steps: 12, sleep: 12, workout: 10, log: 4, streak: 6, achievement: 25 };
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

// ---------- условия за день ----------
// Возвращает { steps, sleep, workout, log, streak } — выполнено ли в этот день (по готовым данным).
function metDay(key, startKey, result, profile, entries) {
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
  let streak = 0;
  for (let k = key; k >= startKey && streak < 400; k = shiftKey(k, -1)) {
    if (stepsOf(k) >= sg) streak++; else break;
  }
  return {
    steps: stepsOf(key) >= sg,
    sleep: sleepV > 0 && sleepV >= slg,
    workout,
    log: list.some((e) => e && e.date === key),
    streak: streak > 0 && streak % STREAK_LEN === 0 && stepsOf(key) >= sg,
  };
}

const LABELS = {
  steps: () => t('Цель по шагам', 'Steps goal'),
  sleep: () => t('Сон не меньше нормы', 'Sleep at or above your norm'),
  workout: () => t('Тренировка', 'Workout'),
  log: () => t('Запись в дневнике', 'Manual log entry'),
  streak: () => t('7 дней шагов подряд', '7-day steps streak'),
  achievement: () => t('Новое достижение', 'New achievement'),
};
const ORDER = ['steps', 'sleep', 'workout', 'log', 'streak', 'achievement'];

// ---------- сборка результата ----------
function buildGrowth(state, todayKey) {
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
    return { id, label: LABELS[id](), xp: XP[id], done: got > 0 || (rec.base || []).includes(id) };
  });
  let index = 0;
  TIERS.forEach((x, i) => { if (level >= x.minLevel) index = i; });
  const tr = TIERS[index];
  return {
    level, xp, xpInLevel, xpToNext, progress, maxed,
    today: { xp: Math.min(DAILY_CAP, Math.max(0, num(rec.xp))), cap: DAILY_CAP, sources },
    tier: { id: tr.id, name: tr.name, minLevel: tr.minLevel, index },
    tiers: TIERS.map((x) => ({
      id: x.id, name: x.name, description: x.description, minLevel: x.minLevel,
      unlocked: level >= x.minLevel,
      progress: level >= x.minLevel ? 1 : Math.max(0, Math.min(1, xp / Math.max(1, xpForLevel(x.minLevel)))),
    })),
    startedAt: num(state.startedAt),
  };
}

// Чистая функция: (состояние, расчёт, профиль, сегодняшний ключ, новые достижения, ручные записи).
export function computeGrowth(state, result, profile, todayKey, fresh = [], entries = []) {
  let s = state && typeof state === 'object' && state.startKey ? state : null;
  const freshIds = Array.isArray(fresh) ? fresh.filter((x) => typeof x === 'string') : [];
  if (!s) {
    // Первый запуск: прошлые дни не считаются, а сегодняшний день засчитывается сразу (и растёт в течение дня).
    s = { v: 1, startKey: todayKey, startedAt: keyMs(todayKey), xp: 0, days: {} };
  }
  const days = {};
  for (const k of Object.keys(s.days || {})) days[k] = { ...s.days[k], got: { ...(s.days[k].got || {}) }, ach: [...(s.days[k].ach || [])] };
  let total = num(s.xp);
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const key = shiftKey(todayKey, -i);
    if (key < s.startKey) continue;
    const rec = days[key] || (days[key] = { xp: 0, got: {}, base: [], ach: [] });
    const m = metDay(key, s.startKey, result, profile, entries);
    const award = (id, amount) => {
      const room = DAILY_CAP - rec.xp;
      const x = Math.min(amount, room);
      if (x <= 0) return;
      rec.xp += x; rec.got[id] = num(rec.got[id]) + x; total += x;
    };
    for (const id of ORDER) {
      if (id === 'achievement' || !m[id]) continue;
      if (rec.got[id] || (rec.base || []).includes(id)) continue;
      award(id, XP[id]);
    }
    if (key === todayKey) {
      for (const a of freshIds) {
        if (rec.ach.includes(a)) continue;
        rec.ach.push(a);
        award('achievement', XP.achievement);
      }
    }
  }
  const oldest = shiftKey(todayKey, -(WINDOW_DAYS + 3));
  for (const k of Object.keys(days)) if (k < oldest) delete days[k];
  const next = { ...s, xp: Math.min(xpForLevel(MAX_LEVEL) + 1000000, total), days };
  return { state: next, growth: buildGrowth(next, todayKey) };
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

export async function updateGrowth(result, profile, now = Date.now(), fresh = []) {
  try {
    const st = store();
    let state = null;
    try { const raw = await st.getItem(KEY); state = raw ? JSON.parse(raw) : null; } catch (e) { state = null; }
    let entries = [];
    try { entries = await loadEntries(); } catch (e) { entries = []; }
    const out = computeGrowth(state, result, profile, dayKey(now), fresh, entries);
    await st.setItem(KEY, JSON.stringify(out.state));
    lastGrowth = out.growth;
    return out.growth;
  } catch (e) {
    return lastGrowth;
  }
}
