jest.mock('react-native', () => ({ Platform: { OS: 'android' }, Linking: {} }), { virtual: true });
jest.mock('react-native-health-connect', () => ({}), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => ({}), { virtual: true });

import { compute } from '../lib/compute';
import { ageAt } from '../lib/metrics';

const day = (n) => { const d = new Date(Date.now() - n * 86400000); return d.toISOString().slice(0, 10); };
test('compute returns the result shape used by the app', () => {
  const now = new Date();
  const ds = { now, start: new Date(now.getTime() - 182 * 86400000), granted: new Set(), steps: {}, sleep: {}, hr: {}, rhr: {}, strength: {}, vo2: [], lbm: [], nights: {}, hrToday: [], lastHr: null, workouts: [], asleep: [], nightHr: {}, extra: {}, distance: {}, calories: {}, debug: {}, errors: {} };
  for (let i = 0; i < 40; i++) { ds.steps[day(i)] = 8000; }
  const profile = { birth: '1985-05-05', sex: 'f' };
  const r = compute(ds, profile);
  expect(r.chrono).toBe(ageAt(profile.birth, ds.now));
  expect(r.bio).toBeCloseTo(r.chrono + r.corr180.total, 10);
  expect(r.cycle).toBeNull();
  for (const k of ['v180', 'v30', 'trend', 'series', 'advice', 'metrics', 'scores', 'computedAt', 'pace']) expect(r).toHaveProperty(k);
  expect(Array.isArray(r.trend)).toBe(true);
});
