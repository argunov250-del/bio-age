jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => {}),
  deleteNotificationChannelAsync: jest.fn(async () => {}),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  AndroidImportance: { HIGH: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}), { virtual: true });
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }), { virtual: true });

import * as N from 'expo-notifications';
import { scheduleReminders, _resetRemindersForTests } from '../lib/reminders';

beforeEach(() => { jest.clearAllMocks(); _resetRemindersForTests(); });
const ids = () => N.scheduleNotificationAsync.mock.calls.map((c) => c[0].identifier);

test('stable ids, reminders-v2 channel, sound; never cancels everything', async () => {
  await scheduleReminders({ remindSleep: true, remindMorning: true, sleepPlan: { on: true, bed: '23:00' } }, {});
  expect(ids().sort()).toEqual(['remind-morning', 'remind-plan-bed', 'remind-sleep']);
  for (const [a] of N.scheduleNotificationAsync.mock.calls) {
    expect(a.trigger.channelId).toBe('reminders-v2');
    expect(a.content.sound).toBe('default');
  }
  expect(N.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
  expect(N.getAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});

test('only own ids are cancelled (goal-* untouched); unchanged input is not rescheduled', async () => {
  await scheduleReminders({ remindMorning: true }, {});
  const cancelled = N.cancelScheduledNotificationAsync.mock.calls.map((c) => c[0]).sort();
  expect(cancelled).toEqual(['remind-plan-bed', 'remind-sleep']);
  N.scheduleNotificationAsync.mockClear();
  await scheduleReminders({ remindMorning: true }, {});
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  await scheduleReminders({ remindMorning: false }, {});
  expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('remind-morning');
});

test('permission is requested only when ask=true', async () => {
  N.getPermissionsAsync.mockResolvedValue({ granted: false });
  await scheduleReminders({ remindMorning: true }, {});
  expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  await scheduleReminders({ remindMorning: true }, {}, { ask: true });
  expect(N.requestPermissionsAsync).toHaveBeenCalled();
  N.getPermissionsAsync.mockResolvedValue({ granted: true });
});
