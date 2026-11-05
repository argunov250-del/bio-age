const mem = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k) => (k in mem ? mem[k] : null)),
    setItem: jest.fn(async (k, v) => { mem[k] = v; }),
  },
}), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android' }, AppState: {} }), { virtual: true });
jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(async () => true),
  getGrantedPermissions: jest.fn(async () => []),
  requestPermission: jest.fn(async () => []),
  insertRecords: jest.fn(async () => ['r1']),
  readRecords: jest.fn(async () => ({ records: [] })),
  deleteRecordsByIds: jest.fn(async () => {}),
}), { virtual: true });
const mockPlatform = require('react-native').Platform;
const mockHc = require('react-native-health-connect');

import { waterGoalMl, addWater, undoWater, setVitamins, addBreath, addPause, loadActivities, subscribe, dayKey } from '../lib/activities';
import { getWater, addWaterSynced, undoWaterSynced, askWaterSync, _resetForTests } from '../lib/water';
import * as T from '../lib/timers';

const GRANT = [{ recordType: 'Hydration', accessType: 'read' }, { recordType: 'Hydration', accessType: 'write' }];
beforeEach(() => {
  for (const k of Object.keys(mem)) delete mem[k];
  Object.values(mockHc).forEach((f) => f.mockClear());
  mockHc.getGrantedPermissions.mockImplementation(async () => []);
  mockHc.readRecords.mockImplementation(async () => ({ records: [] }));
  mockPlatform.OS = 'android';
  _resetForTests();
});

test('goal formula', () => {
  expect(waterGoalMl({ weightKg: 70 })).toBe(2300);
  expect(waterGoalMl({ weightKg: 40 })).toBe(1500);
  expect(waterGoalMl({ weightKg: 150 })).toBe(3500);
  [null, undefined, {}, { weightKg: 'x' }, { weightKg: 10 }].forEach((p) => expect(waterGoalMl(p)).toBe(2000));
});

test('local store: water, undo, vitamins, breath, pause, subscribe, pruning', async () => {
  const fn = jest.fn();
  const un = subscribe(fn);
  await addWater(250, { weightKg: 70 });
  let d = await addWater();
  expect(d.waterMl).toBe(500);
  expect(d.waterGoalMl).toBe(2300);
  d = await undoWater();
  expect(d.waterMl).toBe(250);
  expect(d.undone.ml).toBe(250);
  await undoWater();
  d = await undoWater();
  expect(d.waterMl).toBe(0);
  await setVitamins(true);
  await addBreath(3); await addBreath(3);
  d = await addPause(20);
  expect(d).toMatchObject({ vitamins: true, breathMin: 6, pauseMin: 20 });
  expect(fn).toHaveBeenCalled();
  un();
  mem['activities.v1'] = JSON.stringify({ '2000-01-01': { waterMl: 5 } });
  await addWater();
  const map = await loadActivities();
  expect(map['2000-01-01']).toBeUndefined();
  expect(map[dayKey()].waterMl).toBe(250);
});

test('no Health Connect: local only', async () => {
  mockPlatform.OS = 'ios'; _resetForTests();
  const r = await addWaterSynced({ waterSync: true });
  expect(r.synced).toBe(false);
  const w = await getWater({});
  expect(w).toMatchObject({ ml: 250, source: 'local' });
  expect((await askWaterSync())).toEqual({ read: false, write: false });
});

test('HC throwing never breaks', async () => {
  mockHc.getGrantedPermissions.mockImplementation(async () => { throw new Error('x'); });
  const r = await addWaterSynced({ waterSync: true });
  expect(r.day.waterMl).toBe(250);
});

test('sync off: no write even with permission', async () => {
  mockHc.getGrantedPermissions.mockImplementation(async () => GRANT);
  await addWaterSynced({ waterSync: false });
  expect(mockHc.insertRecords).not.toHaveBeenCalled();
});

test('sync on: write called, undo deletes own record, no double count', async () => {
  mockHc.getGrantedPermissions.mockImplementation(async () => GRANT);
  const p = { waterSync: true, weightKg: 70 };
  const r = await addWaterSynced(p, 250);
  expect(r.synced).toBe(true);
  const rec = mockHc.insertRecords.mock.calls[0][0][0];
  expect(rec.recordType).toBe('Hydration');
  expect(rec.volume).toEqual({ unit: 'liters', value: 0.25 });
  const cid = rec.metadata.clientRecordId;
  // HC возвращает нашу запись + чужую 500 мл
  mockHc.readRecords.mockImplementation(async () => ({ records: [
    { volume: { inLiters: 0.25 }, metadata: { clientRecordId: cid } },
    { volume: { inLiters: 0.5 }, metadata: {} },
  ] }));
  const w = await getWater(p);
  expect(w).toMatchObject({ ml: 750, externalMl: 500, localMl: 250, source: 'hc', goalMl: 2300 });
  const u = await undoWaterSynced(p);
  expect(u.deleted).toBe(true);
  expect(mockHc.deleteRecordsByIds).toHaveBeenCalledWith('Hydration', [], [cid]);
  expect(u.day.waterMl).toBe(0);
});

test('askWaterSync requests read+write on call', async () => {
  mockHc.getGrantedPermissions.mockImplementation(async () => GRANT);
  expect(await askWaterSync()).toEqual({ read: true, write: true });
  expect(mockHc.requestPermission).toHaveBeenCalledTimes(1);
});

test('breathing sequence and state', () => {
  const seq = T.breathSequence(3);
  expect(seq.length).toBe(36); // 18 циклов по 10 с = 180 с
  expect(seq[0]).toEqual({ phase: 'inhale', sec: 4 });
  expect(seq[1]).toEqual({ phase: 'exhale', sec: 6 });
  expect(T.breathState(2000).phase).toBe('inhale');
  expect(T.breathState(2000).scale).toBeCloseTo(0.5);
  expect(T.breathState(7000).phase).toBe('exhale');
  expect(T.breathState(180000).done).toBe(true);
});

test('breathing counts only in foreground', async () => {
  const t0 = 1e12;
  let s = T.startSession(t0);
  expect(T.breathResult(s, t0 + 180000).counted).toBe(true);
  expect(T.breathResult(s, t0 + 100000).counted).toBe(false);
  s = T.onForeground(T.onBackground(s, t0 + 1000), t0 + 20000); // 19 с в фоне
  expect(T.breathResult(s, t0 + 180000).counted).toBe(false);
  let s2 = T.onForeground(T.onBackground(T.startSession(t0), t0 + 1000), t0 + 5000); // 4 с
  expect((await T.completeBreath(s2, t0 + 180000, 3)).counted).toBe(true);
  expect((await loadActivities())[dayKey(t0 + 180000)].breathMin).toBe(3);
});

test('pause needs timer end and confirmation', async () => {
  const t0 = 1e12;
  expect(T.pauseState(t0, t0 + 60000).remainingMs).toBe(19 * 60000);
  expect(T.pauseResult(t0, t0 + 19 * 60000, true).counted).toBe(false);
  expect(T.pauseResult(t0, t0 + 20 * 60000, false).counted).toBe(false);
  expect((await T.completePause(t0, t0 + 20 * 60000, true)).minutes).toBe(20);
  expect((await loadActivities())[dayKey(t0 + 20 * 60000)].pauseMin).toBe(20);
});
