jest.mock('react-native', () => ({ Platform: { OS: 'android' }, Linking: {} }), { virtual: true });
jest.mock('expo-task-manager', () => ({ defineTask: jest.fn(), isTaskRegisteredAsync: jest.fn(async () => true) }), { virtual: true });
jest.mock('expo-background-task', () => ({
  BackgroundTaskResult: { Success: 1, Failed: 2 },
  registerTaskAsync: jest.fn(async () => {}),
  unregisterTaskAsync: jest.fn(async () => {}),
}), { virtual: true });
jest.mock('../lib/storage', () => ({ loadProfile: jest.fn(), loadEntries: jest.fn(async () => []), loadOpens: jest.fn(async () => []) }));
jest.mock('../lib/health', () => ({ BACKGROUND: 'BackgroundAccessPermission', sdkStatus: jest.fn(async () => 'ok'), init: jest.fn(async () => true), grantedTypes: jest.fn(async () => new Set(['Steps', 'BackgroundAccessPermission'])) }));
jest.mock('../lib/metrics', () => ({ loadDataset: jest.fn(async () => ({ now: new Date() })) }));
jest.mock('../lib/importer', () => ({ loadImported: jest.fn(() => null) }));
jest.mock('../lib/compute', () => ({ compute: jest.fn(() => ({ bio: 40 })) }));
jest.mock('../lib/manual', () => ({ applyManual: jest.fn((ds) => ds) }));
jest.mock('../lib/notify', () => ({ checkGoals: jest.fn(async () => {}) }));

import * as TM from 'expo-task-manager';
import * as BT from 'expo-background-task';
import { loadProfile } from '../lib/storage';
import * as H from '../lib/health';
import { loadDataset } from '../lib/metrics';
import { checkGoals } from '../lib/notify';
import { TASK, runGoalsCheck, syncGoalsTask } from '../lib/background';

const taskFn = TM.defineTask.mock.calls[0][1];
beforeEach(() => { checkGoals.mockClear(); loadDataset.mockClear(); });

test('task is defined at import', () => {
  expect(TM.defineTask.mock.calls[0][0]).toBe(TASK);
});

test('notifyGoals off: no work', async () => {
  loadProfile.mockResolvedValueOnce({ notifyGoals: false });
  expect(await runGoalsCheck()).toEqual({ ok: true, skipped: 'off' });
  expect(loadDataset).not.toHaveBeenCalled();
  expect(checkGoals).not.toHaveBeenCalled();
});

test('success path calls checkGoals and returns Success', async () => {
  loadProfile.mockResolvedValueOnce({ birth: '1990-01-01', sex: 'm', lang: 'en' });
  expect(await taskFn()).toBe(1);
  expect(checkGoals).toHaveBeenCalledWith(expect.objectContaining({ sex: 'm' }), { bio: 40 });
});

test('errors give Failed result, never throw', async () => {
  loadProfile.mockRejectedValueOnce(new Error('boom'));
  expect(await runGoalsCheck()).toEqual({ ok: false, error: 'boom' });
  loadProfile.mockResolvedValueOnce({ sex: 'm' });
  loadDataset.mockRejectedValueOnce(new Error('hc'));
  expect(await taskFn()).toBe(2);
});

test('without background permission Health Connect is skipped', async () => {
  H.grantedTypes.mockResolvedValueOnce(new Set(['Steps']));
  loadProfile.mockResolvedValueOnce({ sex: 'm' });
  expect(await runGoalsCheck()).toEqual({ ok: true, skipped: 'no-background-access' });
  expect(checkGoals).not.toHaveBeenCalled();
  H.grantedTypes.mockResolvedValueOnce(new Set(['Steps']));
  loadProfile.mockResolvedValueOnce({ sex: 'm', skipHC: true });
  expect((await runGoalsCheck()).ok).toBe(true);
  expect(loadDataset.mock.calls[0][0].size).toBe(0);
});

test('register / unregister by notifyGoals', async () => {
  await syncGoalsTask({ notifyGoals: true });
  expect(BT.registerTaskAsync).toHaveBeenCalledWith(TASK, { minimumInterval: 30 });
  await syncGoalsTask({ notifyGoals: false });
  expect(BT.unregisterTaskAsync).toHaveBeenCalledWith(TASK);
});
