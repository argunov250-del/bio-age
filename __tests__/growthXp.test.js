const mem = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mem ? mem[k] : null)),
    setItem: jest.fn(async (k, v) => { mem[k] = v; }),
  },
}), { virtual: true });

import { stepsXp, waterXp, applyDailyXp, applyBonusXp, computeGrowth, updateGrowth, DAILY_CAP, XP } from '../lib/growth';
import { rankFor, RANKS } from '../lib/ranks';
import { evaluate, withUnlocks, SECRET_IDS } from '../lib/achievements';
import { setLang } from '../lib/i18n';

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (x) => { const d = new Date(x); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shift = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n, 12)); };
const KEY0 = '2026-01-01';
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

beforeEach(() => { for (const k of Object.keys(mem)) delete mem[k]; setLang('ru'); });
afterAll(() => setLang('auto'));

test('шаги: 1 XP за 1000, не больше 12', () => {
  expect(stepsXp(0)).toBe(0);
  expect(stepsXp(999)).toBe(0);
  expect(stepsXp(1000)).toBe(1);
  expect(stepsXp(8200)).toBe(8);
  expect(stepsXp(11999)).toBe(11);
  expect(stepsXp(12000)).toBe(12);
  expect(stepsXp(30000)).toBe(12);
});
test('шаги: мусор -> 0', () => {
  [NaN, null, undefined, -5, 'abc', Infinity].forEach((v) => expect(stepsXp(v)).toBe(0));
});
test('вода: цель 6, половина 3', () => {
  expect(waterXp(2000, 2000)).toBe(6);
  expect(waterXp(1000, 2000)).toBe(3);
  expect(waterXp(999, 2000)).toBe(0);
  expect(waterXp(500, 0)).toBe(0);
});
test('в течение дня начисляется только разница, данные вниз ничего не отнимают', () => {
  let r = applyDailyXp({ xp: 0, got: {} }, { steps: stepsXp(3500) });
  expect(r.xp).toBe(3);
  r = applyDailyXp(r, { steps: stepsXp(8200) });
  expect(r.added).toBe(5);
  expect(r.got.steps).toBe(8);
  r = applyDailyXp(r, { steps: stepsXp(5000) });
  expect(r.added).toBe(0);
  expect(r.xp).toBe(8);
  r = applyDailyXp(r, { steps: stepsXp(8200) });
  expect(r.added).toBe(0);
});
test('полный хороший день = 44 XP, меньше потолка', () => {
  const r = applyDailyXp({ xp: 0, got: {} }, { steps: 12, sleep: 12, workout: 10, log: 4, streak: 6 });
  expect(r.xp).toBe(44);
  expect(r.xp).toBeLessThanOrEqual(DAILY_CAP);
});
test('дневной потолок 50: лишнее не начисляется, приоритет по порядку ключей', () => {
  const r = applyDailyXp({ xp: 48, got: {} }, { sleep: 12, log: 4 });
  expect(r.xp).toBe(50);
  expect(r.got.sleep).toBe(2);
  expect(r.got.log).toBeUndefined();
  expect(r.added).toBe(2);
});
test('достижение — вне потолка и один раз', () => {
  const day = { xp: 50, ach: [], bonus: 0 };
  let b = applyBonusXp(day, 'steps10k');
  expect(b.added).toBe(25);
  expect(b.bonus).toBe(25);
  b = applyBonusXp({ ...day, ach: b.ach, bonus: b.bonus }, 'steps10k');
  expect(b.added).toBe(0);
});

test('новые источники (вода, витамины, дыхание, пауза) начисляются один раз и в окне 7 дней', () => {
  const act = { [KEY0]: { waterMl: 2000, waterGoalMl: 2000, vitamins: true, breathMin: 5, pauseMin: 15 } };
  const a = computeGrowth(null, mkResult(KEY0, () => ({})), {}, KEY0, [], [], { activities: act });
  expect(a.growth.xp).toBe(6 + 2 + 4 + 4);
  const b = computeGrowth(a.state, mkResult(KEY0, () => ({})), {}, KEY0, [], [], { activities: act });
  expect(b.growth.xp).toBe(16);
  // половина воды = 3, потом цель = +3
  const h = computeGrowth(null, null, {}, KEY0, [], [], { activities: { [KEY0]: { waterMl: 1000, waterGoalMl: 2000 } } });
  expect(h.growth.xp).toBe(3);
  const f = computeGrowth(h.state, null, {}, KEY0, [], [], { activities: { [KEY0]: { waterMl: 2100, waterGoalMl: 2000 } } });
  expect(f.growth.xp).toBe(6);
  // поздние данные за вчера
  const d1 = shift(KEY0, 1);
  const late = computeGrowth(f.state, null, {}, d1, [], [], { activities: { [KEY0]: { waterMl: 2100, waterGoalMl: 2000, vitamins: true } } });
  expect(late.growth.xp).toBe(8);
});

test('серия 7 дней: не пункт списка, отдельное поле, бонус 6 внутри потолка', () => {
  let state = null, last;
  const spec = () => ({ steps: 9000 });
  for (let i = 0; i < 7; i++) {
    const day = shift(KEY0, i);
    last = computeGrowth(state, mkResult(day, spec), {}, day);
    state = last.state;
    expect(last.growth.today.sources.some((x) => x.id === 'streak')).toBe(false);
  }
  expect(last.growth.streak).toEqual({ days: 7, target: 7, bonusXp: XP.streak });
  expect(last.growth.today.xp).toBe(9 + 6);
  const mid = computeGrowth(null, mkResult(KEY0, spec), {}, KEY0);
  expect(mid.growth.streak.days).toBe(1);
});

test('достижения: +25 вне потолка, вне списка, не отнимают потолок', () => {
  const day = KEY0;
  const r = mkResult(day, () => ({ steps: 12000, sleep: 8, workout: true }));
  const a = computeGrowth(null, r, {}, day, ['steps10k'], [{ date: day, type: 'weight' }, { date: day, type: 'workout' }]);
  expect(a.growth.today.xp).toBe(12 + 12 + 10 + 4);
  expect(a.growth.today.bonus).toBe(25);
  expect(a.growth.xp).toBe(38 + 25);
  const b = computeGrowth(a.state, r, {}, day, ['steps10k'], []);
  expect(b.growth.xp).toBe(38 + 25);
});

test('ранги: 10 титулов, границы, RU/EN', () => {
  expect(RANKS.length).toBe(10);
  expect(rankFor(0).index).toBe(0);
  expect(rankFor(9).index).toBe(0);
  expect(rankFor(10).index).toBe(1);
  expect(rankFor(34)).toMatchObject({ index: 3, name: 'Травник', nextAt: 40 });
  expect(rankFor(89).index).toBe(8);
  expect(rankFor(90).index).toBe(9);
  expect(rankFor(100)).toMatchObject({ index: 9, nextAt: null });
  expect(rankFor(NaN).index).toBe(0);
  setLang('en');
  expect(rankFor(34).name).toBe('Herbalist');
});

test('rank-up: событие один раз относительно rank.seen.v1, журнал', async () => {
  const { xpForLevel } = require('../lib/growth');
  const now = new Date(2026, 0, 1, 12).getTime();
  mem['growth.v1'] = JSON.stringify({ v: 1, startKey: KEY0, startedAt: now, xp: xpForLevel(9) + 1, days: {}, journal: [] });
  mem['rank.seen.v1'] = '0';
  const act = (key) => ({ [key]: { vitamins: true, waterMl: 3000, waterGoalMl: 2000, breathMin: 9, pauseMin: 20 } });
  // докинуть XP до 10 уровня: задаём состояние чуть ниже границы
  mem['growth.v1'] = JSON.stringify({ v: 1, startKey: KEY0, startedAt: now, xp: xpForLevel(10) - 3, days: {}, journal: [] });
  const { computeGrowth: cg } = require('../lib/growth');
  const out = cg(JSON.parse(mem['growth.v1']), null, {}, KEY0, [], [], { activities: act(KEY0), seenRank: 0 });
  expect(out.growth.level).toBeGreaterThanOrEqual(10);
  expect(out.growth.events.filter((e) => e.type === 'rankUp')).toEqual([{ type: 'rankUp', rank: { index: 1, name: 'Ученик Пелиона' } }]);
  expect(out.growth.events.some((e) => e.type === 'levelUp' && e.level === 10)).toBe(true);
  expect(out.growth.journal.filter((e) => e.type === 'rankUp').length).toBe(1);
  expect(out.growth.journal.some((e) => e.type === 'levelUp')).toBe(true);
  expect(out.growth.rank).toMatchObject({ index: 1, nextAt: 20 });
  // уже виден
  const again = cg(out.state, null, {}, KEY0, [], [], { seenRank: 1 });
  expect(again.growth.events.filter((e) => e.type === 'rankUp')).toEqual([]);
  expect(again.growth.journal.filter((e) => e.type === 'rankUp').length).toBe(1);
  // через updateGrowth
  const g = await require('../lib/growth').updateGrowth(null, {}, now);
  expect(g.events.some((e) => e.type === 'rankUp')).toBe(false);
  expect(mem['rank.seen.v1']).toBe('0');
});

test('журнал: достижения, секреты, 60 дней', () => {
  const a = computeGrowth(null, null, {}, KEY0, ['steps10k', 'steps20k'], []);
  const types = a.growth.journal.map((e) => `${e.type}:${e.id || e.level}`);
  expect(types).toContain('achievement:steps10k');
  expect(types).toContain('secret:steps20k');
  expect(a.growth.xp).toBe(50);
  expect(a.growth.events.filter((e) => e.type === 'secret').length).toBe(1);
  const far = shift(KEY0, 61);
  const b = computeGrowth(a.state, null, {}, far);
  expect(b.growth.journal.find((e) => e.id === 'steps10k')).toBeUndefined();
  const c = computeGrowth(a.state, null, {}, shift(KEY0, 30));
  expect(c.growth.journal.find((e) => e.id === 'steps10k')).toBeDefined();
});

describe('секретные достижения', () => {
  const nights = (n, v) => Array.from({ length: n }, (_, i) => ({ key: shift(KEY0, i), v }));
  const get = (list, id) => list.find((x) => x.id === id);
  test('Двадцатка', () => {
    const res = { chrono: 35, series: { steps: [{ key: KEY0, v: 20000 }], sleep: [], workouts: [] }, scores: {} };
    expect(get(evaluate(res, {}, []), 'steps20k').done).toBe(true);
    res.series.steps[0].v = 19999;
    expect(get(evaluate(res, {}, []), 'steps20k').done).toBe(false);
  });
  test('30 ночей подряд по норме', () => {
    const mk = (s) => ({ chrono: 35, series: { steps: [], sleep: s, workouts: [] }, scores: { sleep: { norm: 7.5 } } });
    expect(get(evaluate(mk(nights(30, 7.5)), {}, []), 'sleepNorm30').done).toBe(true);
    const broken = nights(30, 7.5); broken[15].v = 6;
    expect(get(evaluate(mk(broken), {}, []), 'sleepNorm30').done).toBe(false);
  });
  test('ранняя птица: нужен подъём до 5:00, сон по норме и прогулка; без данных не открывается', () => {
    const end = new Date(2026, 0, 5, 4, 30).getTime();
    const walk = { type: 79, start: new Date(2026, 0, 5, 7, 0).getTime() };
    const mk = (ln, w) => ({ chrono: 35, series: { steps: [], sleep: [], workouts: w, lastNight: ln }, scores: { sleep: { norm: 7.5 } } });
    expect(get(evaluate(mk({ end, hours: 7.2 }, [walk]), {}, []), 'earlyBird').done).toBe(true);
    expect(get(evaluate(mk({ end, hours: 5 }, [walk]), {}, []), 'earlyBird').done).toBe(false);
    expect(get(evaluate(mk({ end, hours: 7.5 }, []), {}, []), 'earlyBird').done).toBe(false);
    expect(get(evaluate(mk({ end: new Date(2026, 0, 5, 6, 0).getTime(), hours: 8 }, [walk]), {}, []), 'earlyBird').done).toBe(false);
    expect(get(evaluate(mk(null, [walk]), {}, []), 'earlyBird').done).toBe(false);
  });
  test('скрыты («???») до открытия, открываются через withUnlocks', () => {
    const res = { chrono: 35, series: { steps: [{ key: KEY0, v: 20000 }], sleep: [], workouts: [] }, scores: {} };
    const list = evaluate(res, {}, []);
    const locked = withUnlocks(list.map((x) => (x.id === 'steps20k' ? { ...x, done: false } : x)), {});
    const h = get(locked.list, 'steps20k');
    expect(h.hidden).toBe(true);
    expect(h.title).toBe('???');
    expect(h.value).toBe(0);
    const open = withUnlocks(list, {});
    expect(open.fresh).toContain('steps20k');
    expect(get(open.list, 'steps20k').title).not.toBe('???');
    expect(SECRET_IDS.length).toBe(3);
  });
});

// Длина пути до 100 уровня (симуляция правил 2.3 + вода).
function simulate(habit, maxDays = 2000) {
  let today = KEY0;
  let { state, growth } = computeGrowth(null, mkResult(today, () => ({})), {}, today);
  const spec = {}, entries = [], acts = {};
  for (let i = 1; i <= maxDays; i++) {
    today = shift(KEY0, i);
    const h = habit(i);
    spec[today] = h;
    if (h.log) entries.push({ date: today, type: 'weight' });
    acts[today] = { waterMl: h.water || 0, waterGoalMl: 2000, vitamins: !!h.vit, breathMin: h.breath || 0, pauseMin: h.pause || 0 };
    ({ state, growth } = computeGrowth(state, mkResult(today, (k) => spec[k]), {}, today, [], entries.slice(-30), { activities: acts }));
    if (growth.level >= 100) return i;
  }
  return Infinity;
}
const goodBase = (i) => ({ steps: i % 7 === 6 ? 3000 : 9000, sleep: i % 8 === 7 ? 6 : 7.5, workout: [2, 4, 6, 0].includes(i % 7) && i % 14 !== 0, log: i % 2 === 0 });
const goodWater = (i) => ({ ...goodBase(i), water: i % 5 === 0 ? 1000 : 2000, vit: i % 3 !== 0, breath: i % 4 === 0 ? 5 : 0 });
const partial = (i) => ({ steps: i % 7 < 3 ? 9000 : 3000, sleep: i % 7 < 3 ? 7.5 : 5.5, workout: i % 14 === 0, log: i % 5 === 0 });

test('симуляция: дней до 100 уровня', () => {
  const a = simulate(goodBase), b = simulate(goodWater), c = simulate(partial);
  expect(a).toBeGreaterThan(450); expect(a).toBeLessThan(560);   // ≈ 507
  expect(b).toBeGreaterThan(340); expect(b).toBeLessThan(440);   // ≈ 389
  expect(c).toBeGreaterThan(900);                                // ≈ 1064
  expect(b).toBeLessThan(a);
  expect(c).toBeGreaterThan(b);
});

test('updateGrowth без модуля activities не падает', async () => {
  const g = await updateGrowth(mkResult(KEY0, () => ({ steps: 5000 })), {}, new Date(2026, 0, 1, 12).getTime());
  expect(g.today.sources.find((x) => x.id === 'steps').got).toBe(5);
});
