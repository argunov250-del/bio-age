import { recSeries14 } from '../lib/perf/index';
test('week dots source: trends fallback when today recovery is null', () => {
  const tr = Array.from({ length: 90 }, (_, i) => ({ key: 'k' + i, v: i }));
  expect(recSeries14({ recovery: null, trends: { recovery: tr } })).toEqual(tr.slice(-14));
  expect(recSeries14({ recovery: { series14: [{ key: 'a', v: 1 }] }, trends: { recovery: tr } })).toEqual([{ key: 'a', v: 1 }]);
  expect(recSeries14(null)).toBeNull();
});
