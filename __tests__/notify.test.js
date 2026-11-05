jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }), { virtual: true });
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = {};
  return { __m: m, getItem: async (k) => (k in m ? m[k] : null), setItem: async (k, v) => { m[k] = v; } };
}, { virtual: true });

import * as N from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { goalEvents, planNotifications, checkGoals, notifyNow, notifyRankUp, MAX_PER_DAY } from '../lib/notify';

const days = (vals, end = '2026-11-01') => {
  const e = Date.UTC(2026, 10, 1);
  return vals.map((v, i) => {
    const d = new Date(e - (vals.length - 1 - i) * 86400000);
    return { key: d.toISOString().slice(0, 10), v };
  });
};
const TODAY = '2026-11-01';
const mk = (steps, sleep, bio = 40) => ({ chrono: 40, bio, series: { steps: days(steps), sleep: days(sleep) } });

test('steps goal and sleep goal today', () => {
  const ev = goalEvents({}, mk([5000, 9000], [6, 7.5]), {}, TODAY);
  expect(ev.map((e) => e.key)).toEqual(['steps:' + TODAY, 'sleep:' + TODAY]);
});

test('sleep goal follows the personal norm, falls back to 7 h', () => {
  const withNorm = (norm, sleep) => ({ ...mk([], sleep), scores: { sleep: { status: 'ok', norm } } });
  const keys = (r) => goalEvents({}, r, {}, TODAY).map((e) => e.key);
  expect(keys(withNorm(8.5, [8]))).toEqual([]);
  expect(keys(withNorm(8.5, [8.6]))).toEqual(['sleep:' + TODAY]);
  expect(keys(withNorm(6, [6.2]))).toEqual(['sleep:' + TODAY]);
  expect(keys(withNorm(null, [6.5]))).toEqual([]);
  expect(keys(withNorm(null, [7]))).toEqual(['sleep:' + TODAY]);
  expect(keys(withNorm(NaN, [7]))).toEqual(['sleep:' + TODAY]);
});

test('old data and unmet goals give nothing', () => {
  expect(goalEvents({}, mk([9000, 3000], [8, 5]), {}, TODAY)).toEqual([]);
  expect(goalEvents({}, mk([9000], [8]), {}, '2026-11-02')).toEqual([]);
});

test('age 60+ uses 7000', () => {
  const r = { ...mk([7100], [1]), chrono: 65 };
  expect(goalEvents({}, r, {}, TODAY).map((e) => e.key)).toEqual(['steps:' + TODAY]);
});

test('7-day streaks', () => {
  const ev = goalEvents({}, mk(Array(7).fill(9000), Array(8).fill(7.5)), {}, TODAY).map((e) => e.key);
  expect(ev).toContain('streakSteps:2026-10-26');
  expect(ev).toContain('streakSleep:2026-10-25');
  expect(goalEvents({}, mk(Array(6).fill(9000), []), {}, TODAY).map((e) => e.key)).not.toContain('streakSteps:2026-10-27');
});

test('body age drop needs 0.5 y vs reference', () => {
  expect(goalEvents({ bioRef: 40 }, mk([], [], 39.6), {}, TODAY)).toEqual([]);
  expect(goalEvents({ bioRef: 40 }, mk([], [], 39.5), {}, TODAY)[0].key).toBe('bio:39.5');
  expect(goalEvents({}, mk([], [], 30), {}, TODAY)).toEqual([]);
});

test('achievements: single and grouped', () => {
  const one = goalEvents({}, {}, {}, TODAY, [{ id: 'a', title: 'Выспался' }]);
  expect(one[0].title).toMatch(/Выспался|Well rested/);
  const many = goalEvents({}, {}, {}, TODAY, [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }]);
  expect(many).toHaveLength(1);
  expect(many[0].body).toBe('A, B');
});

test('first run seeds without sending, then dedupes', () => {
  const r = mk([9000], [8], 40);
  const first = planNotifications(null, r, {}, TODAY);
  expect(first.send).toEqual([]);
  expect(first.state.bioRef).toBe(40);
  const again = planNotifications(first.state, r, {}, TODAY);
  expect(again.send).toEqual([]);
  const next = planNotifications(first.state, mk([5000, 9000], [8, 8], 40), {}, '2026-11-02');
  expect(next.send).toEqual([]); // not today's data
});

test('dedupe, rate limit and pruning', () => {
  const seed = planNotifications(null, mk([1], [1], 40), {}, '2026-10-31').state;
  const r = mk(Array(7).fill(9000), Array(7).fill(8), 39);
  const p1 = planNotifications(seed, r, {}, TODAY, [{ id: 'x', title: 'X' }]);
  expect(p1.send).toHaveLength(3); // ach, steps, sleep; rest limited
  expect(p1.state.n).toBe(3);
  expect(p1.state.bioRef).toBe(40); // bio event not sent yet
  const p2 = planNotifications(p1.state, r, {}, TODAY);
  expect(p2.send).toEqual([]); // limit still reached
  const p3 = planNotifications(p1.state, r, {}, '2026-11-02'); // new day: counter reset, deferred bio milestone goes out
  expect(p3.send.map((e) => e.key)).toEqual(['bio:39.0']);
  const old = { sent: { 'steps:2026-01-01': '2026-01-01', k: TODAY }, bioRef: 40 };
  const p4 = planNotifications(old, mk([], []), {}, TODAY);
  expect(p4.state.sent['steps:2026-01-01']).toBeUndefined();
  expect(p4.state.sent.k).toBe(TODAY);
});

test('checkGoals persists and sends; respects notifyGoals=false and permission', async () => {
  const now = Date.UTC(2026, 10, 1, 12);
  await checkGoals({}, mk([1], [1], 40), [], now); // first run seeds
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(JSON.parse(await AsyncStorage.getItem('goalsSent.v1')).bioRef).toBe(40);
  await checkGoals({ notifyGoals: false }, mk([9000], [1]), [], now);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  await checkGoals({}, mk([9000], [1]), [], now);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  await checkGoals({}, mk([9000], [1]), [], now);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  N.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
  expect(await notifyNow('z', 't', 'b')).toBe(false);
});

test('goal notifications use the v2 channel with sound; old channels are deleted; no permission prompt', async () => {
  N.scheduleNotificationAsync.mockClear();
  expect(await notifyNow('k', 't', 'b')).toBe(true);
  const call = N.scheduleNotificationAsync.mock.calls[0][0];
  expect(call.identifier).toBe('goal-k');
  expect(call.content.sound).toBe('default');
  expect(call.trigger).toEqual({ channelId: 'goals-v2' });
  N.getPermissionsAsync.mockResolvedValueOnce({ granted: false });
  expect(await notifyNow('k2', 't', 'b')).toBe(false);
  expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
});

test('channels: ids, HIGH importance, sound, vibration; legacy deleted; handler plays sound', async () => {
  const ch = require('../lib/channels');
  await ch.ensureChannels();
  const created = Object.fromEntries(N.setNotificationChannelAsync.mock.calls.map(([id, o]) => [id, o]));
  for (const id of ['goals-v2', 'reminders-v2']) {
    expect(created[id]).toMatchObject({ importance: 4, sound: 'default', enableVibrate: true });
  }
  expect(N.deleteNotificationChannelAsync.mock.calls.map((c) => c[0]).sort()).toEqual(['goals', 'reminders']);
  const b = await N.setNotificationHandler.mock.calls[0][0].handleNotification();
  expect(b).toMatchObject({ shouldPlaySound: true, shouldShowBanner: true, shouldShowList: true });
});

test('notifyRankUp: один раз на ранг, в общем дневном лимите, уважает notifyGoals', async () => {
  const now = Date.UTC(2026, 10, 3, 12);
  N.scheduleNotificationAsync.mockClear();
  AsyncStorage.__m['goalsSent.v1'] = undefined;
  delete AsyncStorage.__m['goalsSent.v1'];
  await notifyRankUp({}, { index: 3, name: 'Herbalist' }, now); // состояния ещё нет: ждём первый расчёт
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  await checkGoals({}, mk([1], [1], 40), [], now); // засеять состояние
  await notifyRankUp({ notifyGoals: false }, { index: 3, name: 'Herbalist' }, now);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  await notifyRankUp({}, { index: 3, name: 'Herbalist' }, now);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(N.scheduleNotificationAsync.mock.calls[0][0])).toContain('Herbalist');
  await notifyRankUp({}, { index: 3, name: 'Herbalist' }, now); // повтор не шлём
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  const st = JSON.parse(AsyncStorage.__m['goalsSent.v1']);
  st.n = MAX_PER_DAY; AsyncStorage.__m['goalsSent.v1'] = JSON.stringify(st);
  await notifyRankUp({}, { index: 4, name: 'Archer' }, now); // лимит дня исчерпан
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
});
