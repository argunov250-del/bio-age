import { corrections, pace, yearsFromHR, hrMax, TOTAL_CAP, PACE_LIMITS, METRICS } from '../lib/formula';

const P = { age: 40, sex: 'm' };
const ok = (value) => ({ value, days: 30, ok: true });
const finite = (n) => typeof n === 'number' && Number.isFinite(n);

describe('yearsFromHR', () => {
  test('HR 1 = 0 years, HR 1.1 = 1 year, HR 1/1.1 = -1 year', () => {
    expect(yearsFromHR(1)).toBeCloseTo(0, 10);
    expect(yearsFromHR(1.1)).toBeCloseTo(1, 10);
    expect(yearsFromHR(1 / 1.1)).toBeCloseTo(-1, 10);
  });
  test('monotonic', () => {
    expect(yearsFromHR(1.5)).toBeGreaterThan(yearsFromHR(1.2));
  });
});

describe('hrMax', () => {
  test('Tanaka: 208 - 0.7 * age', () => {
    expect(hrMax(40)).toBeCloseTo(180, 10);
    expect(hrMax(20)).toBeCloseTo(194, 10);
  });
  test('decreases with age', () => {
    expect(hrMax(60)).toBeLessThan(hrMax(30));
  });
});

describe('corrections', () => {
  test('empty / missing values give zero total without throwing', () => {
    expect(corrections({}, P)).toEqual({ items: {}, total: 0 });
    expect(corrections({ steps: { ok: false, value: 5000 }, restingHr: null }, P).total).toBe(0);
  });

  test('typical values are near zero, items have hr/raw/years', () => {
    const r = corrections({ steps: ok(7842), sleepDuration: ok(7.5), restingHr: ok(65) }, P);
    expect(Math.abs(r.total)).toBeLessThan(0.5);
    expect(r.items.steps).toEqual(expect.objectContaining({ hr: expect.any(Number), raw: expect.any(Number), years: expect.any(Number) }));
  });

  test.each([
    ['steps', [12000, 8000, 5000, 3000]],
    ['sleepDuration', [7.5, 6.5, 5.5, 4.5]],
    ['restingHr', [50, 65, 80, 95]],
    ['zones13', [600, 225, 75, 0]],
    ['zones45', [300, 150, 75, 0]],
    ['vo2max', [55, 45, 38, 30]],
    ['sleepRegularity', [87, 71, 55, 41]],
    ['leanMass', [21, 18.9, 16, 14]],
  ])('worse %s -> not younger', (key, values) => {
    const totals = values.map((v) => corrections({ [key]: ok(v) }, P).total);
    for (let i = 1; i < totals.length; i++) expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1] - 1e-9);
    expect(totals[totals.length - 1]).toBeGreaterThan(totals[0]);
  });

  test('total is capped', () => {
    const awful = { steps: ok(0), sleepDuration: ok(4), sleepRegularity: ok(0), zones13: ok(0), restingHr: ok(100), vo2max: ok(10), leanMass: ok(5) };
    const great = { steps: ok(20000), sleepDuration: ok(7.5), sleepRegularity: ok(100), zones13: ok(900), zones45: ok(400), strength: ok(60), restingHr: ok(40), vo2max: ok(80), leanMass: ok(25) };
    expect(corrections(awful, P).total).toBeLessThanOrEqual(TOTAL_CAP.max);
    expect(corrections(great, P).total).toBeGreaterThanOrEqual(TOTAL_CAP.min);
    expect(corrections(great, P).total).toBeLessThan(0);
    expect(corrections(awful, P).total).toBeGreaterThan(0);
  });

  test('overlapping fitness metrics are discounted', () => {
    const a = corrections({ steps: ok(3000) }, P).total;
    const both = corrections({ steps: ok(3000), zones13: ok(0) }, P).total;
    const sumRaw = corrections({ steps: ok(3000), zones13: ok(0) }, P);
    expect(both).toBeGreaterThanOrEqual(a);
    expect(both).toBeLessThan(sumRaw.items.steps.raw + sumRaw.items.zones13.raw);
  });

  test('edge values never produce NaN or throw', () => {
    const profiles = [P, { age: 0, sex: 'f' }, {}, { age: NaN }, { age: 90, sex: 'x' }];
    for (const p of profiles) {
      for (const m of METRICS) {
        for (const v of [0, -5, NaN, Infinity, 1e9, undefined, null]) {
          let r;
          expect(() => { r = corrections({ [m.key]: { value: v, ok: true } }, p); }).not.toThrow();
          expect(finite(r.total)).toBe(true);
        }
      }
    }
  });
});

describe('pace', () => {
  test('no common metrics -> null', () => {
    expect(pace({}, {}, P)).toBeNull();
    expect(pace({ steps: ok(5000) }, { restingHr: ok(60) }, P)).toBeNull();
    expect(pace({ steps: { ok: false } }, { steps: ok(5000) }, P)).toBeNull();
  });
  test('unchanged habits -> pace 1', () => {
    expect(pace({ steps: ok(6000) }, { steps: ok(6000) }, P)).toBeCloseTo(1, 10);
  });
  test('worse recent habits -> faster aging, better -> slower', () => {
    const base = { steps: ok(7000) };
    const worse = pace(base, { steps: ok(4000) }, P);
    const better = pace(base, { steps: ok(11000) }, P);
    expect(worse).toBeGreaterThan(1);
    expect(better).toBeLessThan(1);
  });
  test('clamped to limits', () => {
    const hi = pace({ steps: ok(11000), restingHr: ok(45), sleepDuration: ok(7.5) }, { steps: ok(0), restingHr: ok(100), sleepDuration: ok(4) }, P);
    const lo = pace({ steps: ok(0), restingHr: ok(100), sleepDuration: ok(4) }, { steps: ok(11000), restingHr: ok(45), sleepDuration: ok(7.5) }, P);
    expect(hi).toBeLessThanOrEqual(PACE_LIMITS.max);
    expect(lo).toBeGreaterThanOrEqual(PACE_LIMITS.min);
  });
  test('NaN-safe', () => {
    const r = pace({ restingHr: ok(NaN) }, { restingHr: ok(NaN) }, {});
    expect(r === null || finite(r)).toBe(true);
  });
});
