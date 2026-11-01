jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

import { corrections, pace, yearsFromHR, hrMax, metricTarget, METRICS } from '../lib/formula';
import { fmt, signed, valueText, targetText } from '../lib/format';
import { isNum } from '../lib/num';
import { mean } from '../lib/metrics';

const P = { age: 40, sex: 'm' };
const ok = (value) => ({ value, days: 30, ok: true });
const BAD = [NaN, Infinity, -Infinity, null, undefined, 'abc', {}];

test('isNum', () => {
  expect([1, 0, -2.5].every(isNum)).toBe(true);
  expect(BAD.some(isNum)).toBe(false);
});

describe('formula with non-finite input', () => {
  test.each(METRICS.map((m) => m.key))('%s: bad value is treated as missing', (key) => {
    for (const bad of BAD) {
      const other = key === 'steps' ? 'restingHr' : 'steps';
      const r = corrections({ [key]: ok(bad), [other]: ok(other === 'steps' ? 9000 : 80) }, P);
      expect(r.items[key]).toBeUndefined();
      expect(r.items[other]).toBeDefined();
      expect(Number.isFinite(r.total)).toBe(true);
      for (const it of Object.values(r.items)) {
        expect(Number.isFinite(it.raw) && Number.isFinite(it.hr) && Number.isFinite(it.years)).toBe(true);
      }
    }
  });
  test('bad age/sex profile does not produce NaN', () => {
    const r = corrections({ vo2max: ok(40), leanMass: ok(18), restingHr: ok(60) }, { age: NaN, sex: 'm' });
    expect(r.items.vo2max).toBeUndefined();
    expect(Number.isFinite(r.total)).toBe(true);
    expect(metricTarget('vo2max', { age: NaN, sex: 'm' }).lo).toBeNull();
  });
  test('valid data is unchanged', () => {
    const r = corrections({ restingHr: ok(75) }, P);
    expect(r.items.restingHr.raw).toBeCloseTo(Math.log(Math.pow(1.09, 1)) / Math.log(1.1), 10);
  });
  test('yearsFromHR / hrMax', () => {
    for (const bad of BAD) { expect(yearsFromHR(bad)).toBe(0); expect(hrMax(bad)).toBeNull(); }
    expect(yearsFromHR(0)).toBe(0);
    expect(hrMax(40)).toBeCloseTo(180, 10);
  });
  test('pace ignores NaN metrics', () => {
    expect(pace({ restingHr: ok(NaN) }, { restingHr: ok(60) }, P)).toBeNull();
    const v = pace({ restingHr: ok(NaN), steps: ok(5000) }, { restingHr: ok(60), steps: ok(9000) }, P);
    expect(Number.isFinite(v)).toBe(true);
  });
});

describe('formatters with non-finite input', () => {
  test('fmt', () => {
    for (const bad of [NaN, Infinity, -Infinity, null, undefined, 'abc', '']) expect(fmt(bad, 1)).toBe('—');
    expect(fmt(0)).not.toBe('—');
    expect(fmt(1234.56, 1)).toMatch(/1.234[.,]6/);
  });
  test('signed', () => {
    for (const bad of [NaN, Infinity, -Infinity, null, undefined]) expect(signed(bad)).toBe('—');
    expect(signed(1.5)).toBe('+' + fmt(1.5, 1));
    expect(signed(-1.5)).toBe('−' + fmt(1.5, 1));
  });
  test('valueText / targetText never show NaN or Infinity', () => {
    for (const key of ['steps', 'vo2max', 'restingHr']) {
      for (const bad of [NaN, Infinity, null, undefined]) {
        expect(valueText(key, bad)).toBe('—');
        expect(targetText(key, { lo: bad, hi: bad })).toBe('—');
        expect(targetText(key, { lo: bad, hi: 55 })).not.toMatch(/NaN|Infinity/);
      }
    }
  });
});

describe('metrics.mean', () => {
  test('empty / non-finite -> null, valid unchanged', () => {
    expect(mean([])).toBeNull();
    expect(mean([1, NaN])).toBeNull();
    expect(mean([2, 4])).toBe(3);
  });
});
