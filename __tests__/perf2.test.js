import { computePerf } from '../lib/perf/index';
import { wellnessScore, wellnessFromDays, strainBalance, forecastEnergy, hrRangeOf, rrOf, stressPctOf, activityGrid, mindfulnessGrid, journalScore } from '../lib/perf/wellness';

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d; };
const NOW = new Date(2026, 5, 20, 14, 0, 0); // суббота
const today = startOfDay(NOW);
const keyAt = (i) => dayKey(addDays(today, i));
const noNaN = (o) => JSON.stringify(o, (_, v) => (typeof v === 'number' && !isFinite(v) ? 'BAD' : v)).indexOf('"BAD"') === -1;

function build(nights = 20) {
  const ds = { now: NOW, hr: {}, sleep: {}, nights: {}, rhr: {}, nightHr: {}, extra: { HeartRateVariabilityRmssd: [], RespiratoryRate: [] }, workouts: [], hrToday: [] };
  for (let i = -nights + 1; i <= 0; i++) {
    const k = keyAt(i);
    const a = new Uint8Array(288); a.fill(1, 0, 90); ds.sleep[k] = a;
    ds.nights[k] = { start: addDays(today, i - 1).getTime() + 23 * 3600000, end: addDays(today, i).getTime() + 7 * 3600000, stages: { light: 250, deep: 90, rem: 100, awake: 30 } };
    ds.hr[k] = { z13: 60, z45: 0, cover: 900, load: 100, rhrEst: 55 };
    ds.nightHr[k] = 52;
    ds.extra.HeartRateVariabilityRmssd.push({ t: addDays(today, i).getTime() + 3 * 3600000, v: 60, night: true });
  }
  return ds;
}
const P = { birth: '1990-01-01' };

describe('wellness', () => {
  test('weights and reweighting', () => {
    expect(wellnessScore({ recovery: 100, sleep: 100, strain: 100, consistency: 100, activity: 100, journal: 100 }).score).toBe(100);
    expect(wellnessScore({ recovery: 80, sleep: 60 }).score).toBe(Math.round((80 * 0.35 + 60 * 0.25) / 0.6));
    expect(wellnessScore({}).score).toBeNull();
    expect(wellnessScore({ recovery: NaN, sleep: 50 }).score).toBe(50);
  });
  test('strain balance penalizes both sides', () => {
    expect(strainBalance(10, 8, 12)).toBe(100);
    expect(strainBalance(2, 8, 12)).toBeLessThan(strainBalance(6, 8, 12));
    expect(strainBalance(18, 8, 12)).toBeLessThan(strainBalance(13, 8, 12));
    expect(strainBalance(null, 8, 12)).toBeNull();
  });
  test('delta vs previous 7 days', () => {
    const days = [];
    for (let i = 0; i < 8; i++) days.push({ key: 'd' + i, recovery: i === 7 ? 80 : 50 });
    const w = wellnessFromDays(days);
    expect(w.score).toBe(80); expect(w.deltaWeekPct).toBe(60); expect(w.label).toBe('excellent');
    expect(wellnessFromDays([{ key: 'a' }])).toBeNull();
  });
  test('journalScore', () => {
    expect(journalScore(null)).toBeNull();
    expect(journalScore({ alcohol: 2, lateMeal: true })).toBe(30);
    expect(journalScore({ meditation: 10 })).toBe(70);
  });
});

describe('forecast', () => {
  const wake = NOW.getTime() + 17 * 3600000;
  const base = { rec: 70, recSeries: [60, 62, 64, 66, 68, 70, 70], strain: 8, target: { low: 8, high: 12 }, needH: 8, wakeTs: wake, eff: 0.9, bedTs: wake - 8.5 * 3600000 };
  test('clamps and range', () => {
    const f = forecastEnergy({ ...base, rec: 100, recSeries: [100, 100, 100, 100, 100] });
    expect(f.pct).toBeLessThanOrEqual(99);
    const g = forecastEnergy({ ...base, rec: 2, recSeries: [2, 2, 2], strain: 21, journalTonight: { alcohol: 3, lateMeal: true }, bedTs: wake - 2 * 3600000 });
    expect(g.pct).toBeGreaterThanOrEqual(1);
    expect(f.range[0]).toBeGreaterThanOrEqual(0); expect(f.range[1]).toBeLessThanOrEqual(100); expect(f.range[0]).toBeLessThanOrEqual(f.pct);
    expect(forecastEnergy({ rec: null })).toBeNull();
  });
  test('drivers: overstrain and alcohol lower', () => {
    const a = forecastEnergy(base), b = forecastEnergy({ ...base, strain: 18 }), c = forecastEnergy({ ...base, journalTonight: { alcohol: 2 } });
    expect(b.pct).toBeLessThan(a.pct); expect(c.pct).toBeLessThan(a.pct);
    expect(c.drivers.find((d) => d.id === 'journal').effect).toBeLessThan(0);
  });
  test('scenarios monotonic: earlier bed -> higher', () => {
    const opts = [2, 4, 6, 7, 8, 9].map((h) => ({ id: 'h' + h, ts: wake - h * 3600000, hhmm: 'x' }));
    const f = forecastEnergy({ ...base, bedOptions: opts });
    const p = f.scenarios.map((s) => s.pct);
    for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThanOrEqual(p[i - 1]);
    expect(p[p.length - 1]).toBeGreaterThan(p[0]);
  });
  test('computePerf integrates', () => {
    const r = computePerf(build(), {}, P, NOW, { journal: { [keyAt(0)]: { alcohol: 1 } } });
    expect(r.forecast.pct).toBeGreaterThan(0);
    expect(r.forecast.scenarios.length).toBe(4);
    const s = r.forecast.scenarios.filter((x) => x.id !== 'plan').map((x) => x.pct);
    expect(s[0]).toBeGreaterThanOrEqual(s[1]); expect(s[1]).toBeGreaterThanOrEqual(s[2]);
    expect(noNaN(r)).toBe(true);
  });
});

describe('hr / rr / stress', () => {
  test('hrRange samples and approx', () => {
    const pts = Array.from({ length: 20 }, (_, i) => [i, 60 + i]);
    expect(hrRangeOf(pts, 55, [])).toMatchObject({ lowest: 60, peak: 79, approx: false });
    expect(hrRangeOf([], 55, [150])).toMatchObject({ lowest: 55, peak: 150, avg: null, approx: true });
    expect(hrRangeOf([], null, [])).toBeNull();
  });
  test('rr', () => {
    expect(rrOf({ avg: 75 }, 55, 60, -5).ms).toBe(800);
    expect(rrOf(null, 60, null, null)).toMatchObject({ ms: 1000, basis: 'rest', rmssd: null });
    expect(rrOf(null, null, 1, 1)).toBeNull();
    expect(rrOf(null, 0, 1, 1)).toBeNull();
  });
  test('stressPct', () => {
    expect(stressPctOf(null)).toBeNull();
    expect(stressPctOf({ score: 0, meanBpm: 60, restBpm: 60 }, 10).pct).toBe(0);
    expect(stressPctOf({ score: 3, meanBpm: 100, restBpm: 60 }, -40).pct).toBe(100);
    expect(stressPctOf({ score: 1.5 }, null)).toMatchObject({ pct: 50, basis: 'hr' });
  });
});

describe('activity grid', () => {
  test('states and layout', () => {
    const v = { [keyAt(0)]: 12, [keyAt(-1)]: 6, [keyAt(-2)]: 2, [keyAt(-3)]: NaN };
    const g = activityGrid(v, { goal: 10, weeks: 5, now: NOW });
    expect(g.weeks.length).toBe(5); g.weeks.forEach((w) => expect(w.days.length).toBe(7));
    const all = g.weeks.flatMap((w) => w.days), at = (i) => all.find((d) => d.key === keyAt(i));
    expect(at(0).state).toBe('full'); expect(at(-1).state).toBe('partial'); expect(at(-2).state).toBe('none'); expect(at(-3).state).toBe('none');
    expect(all[0].key).toBe(dayKey(addDays(today, -5 - 28))); // понедельник 4 недели назад (сегодня сб)
    expect(all.filter((d) => d.future).length).toBe(1);
    expect(g.full).toBe(1); expect(g.partial).toBe(1);
  });
  test('mindfulness and empty', () => {
    const g = mindfulnessGrid({ [keyAt(0)]: { breathMin: 4, pauseMin: 7 }, [keyAt(-1)]: { breathMin: 3 } }, { now: NOW });
    const all = g.weeks.flatMap((w) => w.days);
    expect(all.find((d) => d.key === keyAt(0)).state).toBe('full'); expect(all.find((d) => d.key === keyAt(-1)).state).toBe('none');
    expect(activityGrid(null, { goal: 0, weeks: 99, now: NOW }).weeks.length).toBe(8);
    expect(computePerf(build(), {}, P, NOW, { activities: {} }).activityGrid.weeks.length).toBe(6);
  });
});

describe('empty data', () => {
  test('nulls, no NaN', () => {
    const r = computePerf({ now: NOW }, {}, {}, NOW);
    expect(r.wellness).toBeNull(); expect(r.forecast).toBeNull(); expect(r.hrRange).toBeNull(); expect(r.rr).toBeNull(); expect(r.stressPct).toBeNull(); expect(r.activityGrid).toBeNull();
    expect(noNaN(r)).toBe(true);
    expect(noNaN(computePerf(null, null, null, NOW, { journal: 5 }))).toBe(true);
  });
  test('full data gives wellness', () => {
    const r = computePerf(build(), {}, P, NOW);
    expect(r.wellness.score).toBeGreaterThan(0); expect(r.wellness.score).toBeLessThanOrEqual(100);
    expect(r.wellness.series14.length).toBe(14); expect(r.rr.basis).toBe('rest');
  });
});
