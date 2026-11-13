import { computePerf, strainFromLoad, strainLevel, recoveryZone, zonesFromLoad, strainTargetFor, strainAddH, debtAddH } from '../lib/perf/index';

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d; };
const NOW = new Date(2026, 5, 20, 14, 0, 0);
const today = startOfDay(NOW);
const keyAt = (i) => dayKey(addDays(today, i));

function night(ds, i, { asleep = 7.5, bedH = 23, wakeH = 7, stages } = {}) {
  const k = keyAt(i);
  const a = new Uint8Array(288);
  a.fill(1, 0, Math.round(asleep * 12));
  ds.sleep[k] = a;
  const end = addDays(today, i).getTime() + wakeH * 3600000;
  const start = addDays(today, i - 1).getTime() + bedH * 3600000;
  ds.nights[k] = { start, end, stages: stages || { light: 250, deep: 90, rem: 100, awake: 30 } };
}
function build({ nights = 20, hrv = true, rhr = true, last = {} } = {}) {
  const ds = { now: NOW, hr: {}, sleep: {}, nights: {}, rhr: {}, nightHr: {}, extra: { HeartRateVariabilityRmssd: [], RespiratoryRate: [] }, workouts: [], hrToday: [] };
  for (let i = -nights + 1; i <= 0; i++) {
    night(ds, i);
    ds.hr[keyAt(i)] = { z13: 60, z45: 0, cover: 900, load: 100, rhrEst: 55 };
    if (rhr) ds.nightHr[keyAt(i)] = 52;
    const t = addDays(today, i).getTime() + 3 * 3600000;
    if (hrv) ds.extra.HeartRateVariabilityRmssd.push({ t, v: 60, night: true });
    ds.extra.RespiratoryRate.push({ t, v: 14, night: true });
  }
  const k = keyAt(0);
  if (last.hrv != null) ds.extra.HeartRateVariabilityRmssd[ds.extra.HeartRateVariabilityRmssd.length - 1].v = last.hrv;
  if (last.rhr != null) ds.nightHr[k] = last.rhr;
  return ds;
}
const P = { birth: '1990-01-01' };
const run = (ds, p = P) => computePerf(ds, {}, p, NOW);
const noNaN = (o) => JSON.stringify(o, (_, v) => (typeof v === 'number' && !isFinite(v) ? 'BAD' : v)).indexOf('"BAD"') === -1;

describe('strain', () => {
  test('calibration', () => {
    expect(strainFromLoad(60)).toBeGreaterThanOrEqual(4); expect(strainFromLoad(60)).toBeLessThanOrEqual(6);
    expect(strainFromLoad(180)).toBeGreaterThanOrEqual(10); expect(strainFromLoad(180)).toBeLessThanOrEqual(12);
    expect(strainFromLoad(540)).toBeGreaterThanOrEqual(17); expect(strainFromLoad(540)).toBeLessThanOrEqual(19.5);
  });
  test('monotonic, saturating below 21', () => {
    let prev = -1;
    for (const l of [0, 10, 50, 100, 300, 800, 2000, 5000]) { const s = strainFromLoad(l); expect(s).toBeGreaterThanOrEqual(prev); expect(s).toBeLessThanOrEqual(21); prev = s; }
    expect(strainFromLoad(100000)).toBeLessThanOrEqual(21);
    expect(strainFromLoad(600) - strainFromLoad(500)).toBeLessThan(strainFromLoad(100) - strainFromLoad(0));
  });
  test('bad input and levels', () => {
    expect(strainFromLoad(NaN)).toBe(0); expect(strainFromLoad(-5)).toBe(0);
    expect(strainLevel(9.9)).toBe('light'); expect(strainLevel(10)).toBe('moderate'); expect(strainLevel(14)).toBe('high'); expect(strainLevel(18)).toBe('allout'); expect(strainLevel(null)).toBeNull();
  });
  test('zones sum to active minutes', () => {
    const z = zonesFromLoad(60, 180, 0); expect(z.reduce((a, b) => a + b, 0)).toBeCloseTo(60, 0);
    expect(zonesFromLoad(0, 0)).toEqual([0, 0, 0, 0, 0]);
    const z2 = zonesFromLoad(60, 180); expect(z2[2]).toBeGreaterThan(50);
  });
  test('day strain and workouts in result', () => {
    const ds = build();
    ds.hr[keyAt(0)].load = 180;
    ds.workouts.push({ type: 8, start: today.getTime() + 8 * 3600000, end: today.getTime() + 9 * 3600000, hrSum: 7200, hrN: 60, hrMax: 170, load: 180, activeMin: 60 });
    const r = run(ds);
    expect(r.strain.day).toBe(strainFromLoad(180)); expect(r.strain.level).toBe('moderate');
    expect(r.strain.workouts).toHaveLength(1); expect(r.strain.workouts[0].durationMin).toBe(60); expect(r.strain.workouts[0].hrAvg).toBe(120);
    expect(r.strain.series14).toHaveLength(14);
  });
});

describe('recovery', () => {
  test('zone boundaries', () => {
    expect(recoveryZone(33)).toBe('red'); expect(recoveryZone(34)).toBe('yellow'); expect(recoveryZone(66)).toBe('yellow'); expect(recoveryZone(67)).toBe('green');
    expect(recoveryZone(0)).toBe('red'); expect(recoveryZone(100)).toBe('green'); expect(recoveryZone(null)).toBeNull();
  });
  test('higher HRV and lower RHR give better recovery', () => {
    const good = run(build({ last: { hrv: 75, rhr: 49 } })).recovery;
    const base = run(build()).recovery;
    const bad = run(build({ last: { hrv: 38, rhr: 60 } })).recovery;
    expect(good.pct).toBeGreaterThan(base.pct); expect(base.pct).toBeGreaterThan(bad.pct);
    expect(bad.zone).toBe('red'); expect(good.zone).toBe('green');
    expect(base.drivers.hrv.baseline).toBeCloseTo(60, 0); expect(bad.drivers.hrv.dev).toBeLessThan(0);
    expect(good.series14).toHaveLength(14);
  });
  test('null when baseline < 4 nights, with reason', () => {
    const r = run(build({ nights: 3 }));
    expect(r.recovery).toBeNull(); expect(r.recoveryNull.reason).toBe('baseline_short'); expect(r.strainTarget.suggestion).toBe('no_recovery');
  });
  test('works with RHR only', () => {
    const r = run(build({ hrv: false }));
    expect(r.recovery).not.toBeNull(); expect(r.recovery.drivers.hrv).toBeNull();
  });
});

describe('sleep', () => {
  test('performance, efficiency, stages, restorative', () => {
    const r = run(build()).sleep;
    expect(r.actualH).toBe(7.5);
    expect(r.performancePct).toBe(Math.round(Math.min(100, (7.5 / r.needH) * 100)));
    expect(r.efficiencyPct).toBe(Math.round(440 / 470 * 100));
    expect(r.stages.pct.deep).toBeCloseTo(90 / 470 * 100, 0);
    expect(r.restorativeH).toBeCloseTo(190 / 60, 1);
  });
  test('performance drops when sleeping less, capped at 100', () => {
    const ds = build(); night(ds, 0, { asleep: 5 });
    expect(run(ds).sleep.performancePct).toBeLessThan(70);
    const ds2 = build(); night(ds2, 0, { asleep: 11 });
    expect(run(ds2).sleep.performancePct).toBe(100);
  });
  test('need grows with strain', () => {
    const a = build(); a.hr[keyAt(-1)].load = 50;
    const b = build(); b.hr[keyAt(-1)].load = 700;
    expect(run(b).sleep.needH).toBeGreaterThan(run(a).sleep.needH);
    expect(strainAddH(20)).toBeGreaterThan(strainAddH(8)); expect(strainAddH(3)).toBe(0);
  });
  test('need and debt grow with sleep debt', () => {
    const a = build();
    const b = build(); for (let i = -4; i <= -1; i++) night(b, i, { asleep: 5 });
    const ra = run(a).sleep, rb = run(b).sleep;
    expect(rb.debtH).toBeGreaterThan(ra.debtH); expect(rb.needH).toBeGreaterThan(ra.needH);
    expect(debtAddH(4)).toBeGreaterThan(debtAddH(1));
  });
  test('consistency: regular high, erratic low', () => {
    const reg = run(build()).sleep.consistencyPct;
    const ds = build(); night(ds, 0, { bedH: 23, wakeH: 7 }); night(ds, -1, { bedH: 2.5, wakeH: 10 }); night(ds, -2, { bedH: 21, wakeH: 5 }); night(ds, -3, { bedH: 1, wakeH: 9 });
    const err = run(ds).sleep.consistencyPct;
    expect(reg).toBe(100); expect(err).toBeLessThan(70);
  });
  test('tonight bed: earlier for higher target, uses plan wake', () => {
    const t = run(build(), { ...P, sleepPlan: { on: true, bed: '23:00', wake: '06:30' } }).sleep.tonight;
    expect(t.wakeHHMM).toBe('06:30'); expect(t.wakeSource).toBe('plan');
    expect(t.recommendedBed[100].ts).toBeLessThan(t.recommendedBed[85].ts);
    expect(t.recommendedBed[85].ts).toBeLessThan(t.recommendedBed[70].ts);
    expect(t.recommendedBed[100].ts).toBeLessThan(t.wakeTs);
    const u = run(build()).sleep.tonight; expect(u.wakeSource).toBe('usual'); expect(u.wakeHHMM).toBe('07:00');
  });
});

describe('strain target', () => {
  test('by recovery zone', () => {
    const red = strainTargetFor(20, 0), yel = strainTargetFor(50, 0), grn = strainTargetFor(90, 0);
    expect(red.high).toBeLessThan(yel.high); expect(yel.high).toBeLessThan(grn.high); expect(red.low).toBeLessThan(grn.low);
    expect(red.label).toBe('restore'); expect(grn.label).toBe('push');
    expect(grn.suggestion).toBe('room_to_push'); expect(red.suggestion).toBe('keep_easy');
  });
  test('remaining and in/over range', () => {
    const g = strainTargetFor(90, 0);
    expect(strainTargetFor(90, 15).remaining).toBeCloseTo(g.high - 15, 1);
    expect(strainTargetFor(90, g.low + 0.5).suggestion).toBe('in_range');
    expect(strainTargetFor(90, 21).suggestion).toBe('over_target_recover'); expect(strainTargetFor(90, 21).remaining).toBe(0);
  });
});

describe('health monitor', () => {
  test('in and out of range', () => {
    const inR = run(build()).healthMonitor.find((x) => x.id === 'hrv');
    expect(inR.status).toBe('in');
    const out = run(build({ last: { hrv: 20, rhr: 70 } })).healthMonitor;
    expect(out.find((x) => x.id === 'hrv').status).toBe('out'); expect(out.find((x) => x.id === 'rhr').status).toBe('out');
    expect(out.find((x) => x.id === 'spo2').status).toBe('nodata'); expect(out.find((x) => x.id === 'temp').status).toBe('nodata');
    expect(out.map((x) => x.id)).toEqual(['rhr', 'hrv', 'resp', 'spo2', 'temp']);
  });
});

describe('stress and weekly', () => {
  test('stress null when insufficient, value when enough', () => {
    expect(run(build()).stress).toBeNull();
    const ds = build();
    for (let m = 0; m < 120; m++) ds.hrToday.push([today.getTime() + 9 * 3600000 + m * 60000, 90]);
    const s = run(ds).stress;
    expect(s.score).toBeGreaterThan(0); expect(s.score).toBeLessThanOrEqual(3);
    ds.hrToday = ds.hrToday.map(([t]) => [t, 54]);
    expect(run(ds).stress.level).toBe('low');
  });
  test('weekly aggregates', () => {
    const w = run(build()).weekly;
    expect(w.avgStrain).toBe(strainFromLoad(100)); expect(w.avgRecovery).not.toBeNull(); expect(w.avgSleepPerf).not.toBeNull(); expect(w.bestDay.key).toMatch(/^\d{4}-/); expect(['up', 'down', 'stable']).toContain(w.trend);
  });
});

describe('empty / partial', () => {
  test('empty ds: no NaN, nulls, deterministic', () => {
    const e = { now: NOW, hr: {}, sleep: {}, nights: {}, rhr: {}, nightHr: {}, extra: {}, workouts: [] };
    const r = run(e);
    expect(noNaN(r)).toBe(true);
    expect(r.strain.day).toBeNull(); expect(r.recovery).toBeNull(); expect(r.sleep.actualH).toBeNull(); expect(r.sleep.performancePct).toBeNull();
    expect(r.sleep.tonight).toBeNull(); expect(r.stress).toBeNull(); expect(r.meta.dataQuality).toBe('none'); expect(r.meta.missing).toContain('hr');
    expect(JSON.stringify(run(e))).toBe(JSON.stringify(r));
  });
  test('totally undefined input does not throw', () => {
    const r = computePerf({}, undefined, undefined, NOW);
    expect(noNaN(r)).toBe(true); expect(r.strainTarget.low).toBeNull();
  });
  test('garbage values stay finite', () => {
    const ds = build(); ds.hr[keyAt(0)].load = NaN; ds.extra.HeartRateVariabilityRmssd[0].v = NaN;
    expect(noNaN(run(ds))).toBe(true);
  });
  test('full ds sanity and quality', () => {
    const r = run(build()); expect(noNaN(r)).toBe(true); expect(r.meta.dataQuality).toBe('good');
  });
});
