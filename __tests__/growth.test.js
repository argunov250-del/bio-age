const mem = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mem ? mem[k] : null)),
    setItem: jest.fn(async (k, v) => { mem[k] = v; }),
  },
}), { virtual: true });

import { computeGrowth, updateGrowth, loadGrowth, awardEvent, levelFromXp, xpForLevel, TIERS, DAILY_CAP } from '../lib/growth';
import { setLang } from '../lib/i18n';
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (x) => { const d = new Date(x); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const KEY0 = '2026-01-01';
const shift = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n, 12)); };
// result с рядами за последние дни; spec(i) → { steps, sleep, workout } для дня i
function mkResult(today, spec, days = 8) {
  const steps = [], sleep = [], workouts = [];
  for (let j = days - 1; j >= 0; j--) {
    const key = shift(today, -j);
    const s = spec(key) || {};
    steps.push({ key, v: s.steps || 0 });
    sleep.push({ key, v: s.sleep || 0 });
    if (s.workout) { const [y, m, d] = key.split('-').map(Number); workouts.push({ type: 56, start: new Date(y, m - 1, d, 18).getTime() }); }
  }
  return { chrono: 35, series: { steps, sleep, workouts }, scores: { sleep: { norm: 7 } } };
}
const GOOD = { steps: 9000, sleep: 7.5, workout: true };

beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; setLang('ru'); });
afterAll(() => setLang('auto'));

test('first run: today counts immediately, previous days ignored', () => {
  const r = mkResult(KEY0, (k) => (k === KEY0 ? GOOD : { steps: 20000, sleep: 9, workout: true }));
  const { state, growth } = computeGrowth(null, r, {}, KEY0, [], [{ date: KEY0, type: 'weight' }]);
  expect(growth.xp).toBe(9 + 12 + 10 + 4); // вчерашние дни не дают XP; 9000 шагов = 9 XP
  expect(growth.xp).toBeGreaterThan(0);
  expect(growth.today.sources.filter((x) => x.done).length).toBe(4);
  expect(growth.today.sources.find((x) => x.id === 'workout').optional).toBe(true);
  expect(growth.today.sources.find((x) => x.id === 'achievement')).toBeUndefined();
  // повторный расчёт в тот же день не удваивает
  expect(computeGrowth(state, r, {}, KEY0, [], [{ date: KEY0, type: 'weight' }]).growth.xp).toBe(growth.xp);
  // новый день — идёт XP
  const d2 = shift(KEY0, 1);
  const next = computeGrowth(state, mkResult(d2, () => GOOD), {}, d2);
  expect(next.growth.xp).toBeGreaterThan(growth.xp);
});

test('first run without goals met: 0 XP, then grows during the day', () => {
  const none = mkResult(KEY0, (k) => (k === KEY0 ? {} : GOOD));
  const first = computeGrowth(null, none, {}, KEY0);
  expect(first.growth.xp).toBe(0);
  expect(first.growth.level).toBe(0);
  const later = computeGrowth(first.state, mkResult(KEY0, (k) => (k === KEY0 ? { steps: 9000 } : GOOD)), {}, KEY0);
  expect(later.growth.xp).toBe(9);
  const more = computeGrowth(later.state, mkResult(KEY0, (k) => (k === KEY0 ? { steps: 9000, sleep: 8 } : GOOD)), {}, KEY0);
  expect(more.growth.xp).toBe(21);
});

test('same day is not double counted; late yesterday data counts once', () => {
  let { state } = computeGrowth(null, mkResult(KEY0, () => ({})), {}, KEY0);
  const d1 = shift(KEY0, 1), d2 = shift(KEY0, 2);
  const only = (key) => (k) => (k === key ? { steps: 9000 } : {});
  let a = computeGrowth(state, mkResult(d1, only(d1)), {}, d1);
  const xp1 = a.growth.xp;
  expect(xp1).toBe(9);
  a = computeGrowth(a.state, mkResult(d1, only(d1)), {}, d1);
  expect(a.growth.xp).toBe(xp1);
  // следующий день: данные за вчера пришли позже (сон) — засчитываются один раз
  const late = (k) => (k === d1 ? { steps: 9000, sleep: 8 } : {});
  let b = computeGrowth(a.state, mkResult(d2, late), {}, d2);
  expect(b.growth.xp).toBe(xp1 + 12);
  b = computeGrowth(b.state, mkResult(d2, late), {}, d2);
  expect(b.growth.xp).toBe(xp1 + 12);
});

test('daily cap', () => {
  const { state } = computeGrowth(null, mkResult(KEY0, () => ({})), {}, KEY0);
  const d1 = shift(KEY0, 1);
  const fresh = ['a', 'b', 'c', 'd', 'e'];
  const entries = [{ date: d1, type: 'weight' }];
  const out = computeGrowth(state, mkResult(d1, (k) => (k === d1 ? GOOD : {})), {}, d1, fresh, entries);
  // достижения вне потолка: 35 за день + 5 × 25 событий
  expect(out.growth.today.xp).toBe(35);
  expect(out.growth.today.bonus).toBe(125);
  expect(out.growth.xp).toBe(35 + 125);
  expect(out.growth.today.cap).toBe(DAILY_CAP);
  expect(out.growth.today.sources.every((s) => typeof s.label === 'string' && s.label)).toBe(true);
});

test('curve is monotonic, 0..100', () => {
  let prev = -1;
  for (let L = 0; L <= 100; L++) { const x = xpForLevel(L); expect(x).toBeGreaterThan(prev); prev = x; expect(levelFromXp(x)).toBe(L); }
  expect(levelFromXp(xpForLevel(100) * 5)).toBe(100);
  expect(levelFromXp(-5)).toBe(0);
  expect(levelFromXp(NaN)).toBe(0);
  expect(xpForLevel(1)).toBeLessThanOrEqual(34);
});

function simulate(habit, maxDays = 1500) {
  let today = KEY0;
  let { state, growth } = computeGrowth(null, mkResult(today, () => ({})), {}, today);
  const spec = {};
  const entries = [];
  for (let i = 1; i <= maxDays; i++) {
    today = shift(KEY0, i);
    spec[today] = habit(i);
    if (spec[today] && spec[today].log) entries.push({ date: today, type: 'weight' });
    ({ state, growth } = computeGrowth(state, mkResult(today, (k) => spec[k]), {}, today, [], entries));
    if (growth.level >= 100) return i;
  }
  return Infinity;
}

test('good habits reach level 100 in about 12-18 months; partial habits take much longer', () => {
  const good = simulate((i) => ({ steps: i % 7 === 6 ? 3000 : 9000, sleep: i % 8 === 7 ? 6 : 7.5, workout: i % 7 === 2 || i % 7 === 4 || i % 7 === 6 || i % 7 === 0 ? i % 14 !== 0 : false, log: i % 2 === 0 }));
  expect(good).toBeGreaterThanOrEqual(365);
  expect(good).toBeLessThanOrEqual(550);
  const partial = simulate((i) => ({ steps: i % 7 < 3 ? 9000 : 3000, sleep: i % 7 < 3 ? 7.5 : 5.5, workout: i % 14 === 0, log: i % 5 === 0 }));
  expect(partial).toBeGreaterThan(good * 1.6);
});


test('tiers: unlock and progress', () => {
  expect(TIERS.length).toBe(9);
  expect(TIERS.map((x) => x.minLevel)).toEqual([0, 3, 8, 15, 25, 40, 55, 75, 100]);
  const { state } = computeGrowth(null, null, null, KEY0);
  const out = computeGrowth({ ...state, xp: xpForLevel(10) + 2 }, null, null, KEY0).growth;
  expect(out.level).toBe(10);
  expect(out.tier.id).toBe('sprout');
  expect(out.tier.index).toBe(2);
  expect(out.tiers.map((x) => x.unlocked)).toEqual([true, true, true, false, false, false, false, false, false]);
  expect(out.tiers[3].progress).toBeGreaterThan(0);
  expect(out.tiers[3].progress).toBeLessThan(1);
  expect(out.tiers[0].progress).toBe(1);
  const max = computeGrowth({ ...state, xp: xpForLevel(100) }, null, null, KEY0).growth;
  expect(max.maxed).toBe(true);
  expect(max.progress).toBe(1);
  expect(max.xpToNext).toBe(0);
  expect(max.tier.id).toBe('radiant');
  expect(out.progress).toBeGreaterThanOrEqual(0);
  expect(out.progress).toBeLessThanOrEqual(1);
  expect(out.xpInLevel + out.xpToNext).toBe(xpForLevel(11) - xpForLevel(10));
});

test('no NaN with empty or broken result', () => {
  for (const r of [null, undefined, {}, { series: {} }, { series: { steps: [{ key: KEY0, v: NaN }], sleep: null, workouts: [{}] } }]) {
    const a = computeGrowth(null, r, null, KEY0);
    const b = computeGrowth(a.state, r, null, shift(KEY0, 1), ['x'], [null, {}]);
    const bad = JSON.stringify(b.growth, (k, v) => (typeof v === 'number' && !isFinite(v) ? '__NaN__' : v));
    expect(bad).not.toContain('__NaN__');
    expect(b.growth.today.xp).toBeLessThanOrEqual(DAILY_CAP);
  }
});

test('RU/EN labels', () => {
  const { growth: ru } = computeGrowth(null, null, null, KEY0);
  setLang('en');
  const { growth: en } = computeGrowth(null, null, null, KEY0);
  expect(ru.tier.name).toBe('Контур');
  expect(en.tier.name).toBe('Outline');
  expect(ru.today.sources[0].label).not.toBe(en.today.sources[0].label);
  expect(TIERS[1].name).toBe('Spark');
  setLang('ru');
  expect(TIERS[1].name).toBe('Искра');
  expect(TIERS.every((x) => x.id && x.name && x.description)).toBe(true);
});

test('updateGrowth persists, never throws, loadGrowth reads it', async () => {
  expect(await loadGrowth()).toBeNull();
  const now = new Date(2026, 0, 1, 12).getTime();
  const g = await updateGrowth(mkResult(KEY0, () => GOOD), {}, now);
  expect(g.xp).toBeGreaterThan(0);
  expect(mem['growth.v1']).toBeTruthy();
  const g2 = await updateGrowth(null, null, now);
  expect(g2.level).toBe(g.level);
  const l = await loadGrowth();
  expect(l.xp).toBe(g.xp);
  mem['growth.v1'] = '{bad';
  await expect(updateGrowth({}, {}, now)).resolves.toBeTruthy();
});

test('awardEvent: награда арки вне потолка, один раз на eventId, строка журнала', async () => {
  setLang('ru');
  for (const k of Object.keys(mem)) delete mem[k];
  const now = new Date(2026, 5, 10, 12).getTime();
  await updateGrowth(mkResult(dayKey(now), () => ({})), {}, now);
  const before = JSON.parse(mem['growth.v1']).xp;
  const g = await awardEvent('arc.tired.2026-06-08', 15, { ru: 'Хирон выспался', en: 'Chiron is well rested' }, now);
  expect(g.xp).toBe(before + 15);
  expect(g.today.bonus).toBe(15);
  const j = g.journal.find((e) => e.type === 'arc');
  expect(j.text.ru).toBe('Хирон выспался');
  const g2 = await awardEvent('arc.tired.2026-06-08', 15, null, now);
  expect(g2.xp).toBe(before + 15);
  expect(g2.journal.filter((e) => e.type === 'arc').length).toBe(1);
});
