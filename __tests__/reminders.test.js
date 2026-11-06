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
import { scheduleReminders, _resetRemindersForTests, usualBedtime, usualWake, sleepSchedule, bedtimeLabel, bedReminderAt, minToHHMM } from '../lib/reminders';

beforeEach(() => { jest.clearAllMocks(); _resetRemindersForTests(); });
const ids = () => N.scheduleNotificationAsync.mock.calls.map((c) => c[0].identifier);

test('stable ids, reminders-v2 channel, sound; never cancels everything', async () => {
  await scheduleReminders({ remindSleep: true, remindMorning: true, sleepPlan: { on: true, bed: '23:00' } }, {});
  expect(ids().sort()).toEqual(['remind-morning', 'remind-plan-bed', 'remind-sleep']); // remind-wake — только если включён
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
  expect(cancelled).toEqual(['remind-plan-bed', 'remind-sleep', 'remind-wake']);
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

// ---- Режим сна: usualBedtime, ручной/авто режим, время напоминаний ----
const at = (y, mo, d, h, mi) => new Date(y, mo, d, h, mi).getTime(); // местное время
const night = (d, bedH, bedM, hours) => { const start = at(2026, 5, d, bedH, bedM); return { start, end: start + hours * 3600000 }; };
const dsOf = (list) => ({ nights: Object.fromEntries(list.map((n, i) => ['k' + i, n])) });

test('usualBedtime: нет данных — 23:00', () => {
  expect(usualBedtime({})).toBe(23 * 60);
  expect(usualBedtime({ nights: {} })).toBe(23 * 60);
  expect(usualBedtime(undefined)).toBe(23 * 60);
});

test('usualBedtime: дневной сон, короткие сессии и утренние старты не считаются (был баг 09:50)', () => {
  const nights = [night(1, 23, 10, 8), night(2, 23, 20, 7.5), night(3, 23, 0, 8), night(4, 23, 30, 7)];
  // «утренние» старты 10:20 и дневной сон 14:00, подъём-как-начало, короткая ночь 1.5 ч
  const junk = [night(5, 10, 20, 1), night(6, 10, 20, 4), night(7, 14, 0, 1.5), night(8, 13, 30, 3), night(9, 23, 0, 1.5), night(10, 9, 50, 5), night(11, 10, 20, 5)];
  expect(usualBedtime(dsOf(nights))).toBe(23 * 60 + 15);
  expect(usualBedtime(dsOf([...nights, ...junk]))).toBe(23 * 60 + 15);
  expect(bedtimeLabel(dsOf([...nights, ...junk]), {})).toBe('22:45');
});

test('usualBedtime: круговая медиана через полночь и локальное время', () => {
  const list = [night(1, 23, 40, 7), night(2, 0, 20, 7), night(3, 23, 50, 7), night(4, 0, 10, 7), night(5, 23, 30, 7)];
  expect(usualBedtime(dsOf(list))).toBe(23 * 60 + 50);
  // старт — ISO-строка/Date (UTC в строке), всё равно по местному времени
  const iso = (n) => ({ start: new Date(n.start).toISOString(), end: new Date(n.end) });
  expect(usualBedtime(dsOf(list.map(iso)))).toBe(23 * 60 + 50);
  // мусор не ломает
  expect(usualBedtime(dsOf([{ start: 'abc' }, null, { start: NaN }]))).toBe(23 * 60);
});

test('usualBedtime: берутся только последние 14 ночей', () => {
  const old = Array.from({ length: 10 }, (_, i) => night(1 + i, 21, 0, 8));
  const fresh = Array.from({ length: 14 }, (_, i) => ({ ...night(1, 0, 0, 7), start: at(2026, 6, 1 + i, 23, 30), end: at(2026, 6, 2 + i, 6, 30) }));
  expect(usualBedtime(dsOf([...old, ...fresh]))).toBe(23 * 60 + 30);
});

test('usualWake: медиана подъёма главных ночей, иначе 07:00', () => {
  expect(usualWake({})).toBe(7 * 60);
  expect(usualWake(dsOf([night(1, 23, 0, 8), night(2, 23, 0, 7.5), night(3, 23, 0, 8.5)]))).toBe(7 * 60);
});

test('sleepSchedule: авто по данным, вручную, старый план без mode — ручной', () => {
  const ds = dsOf([night(1, 23, 10, 8), night(2, 23, 20, 8), night(3, 23, 0, 8)]);
  const a = sleepSchedule({}, ds);
  expect(a).toMatchObject({ mode: 'auto', bed: 23 * 60 + 10, remindBefore: 30, remindWake: false });
  const m = sleepSchedule({ sleepPlan: { mode: 'manual', bed: '22:30', wake: '06:45', remindBefore: 60, remindWake: true } }, ds);
  expect(m).toMatchObject({ mode: 'manual', bed: 22 * 60 + 30, wake: 6 * 60 + 45, remindBefore: 60, remindWake: true });
  expect(m.durH).toBeCloseTo(8.25);
  expect(sleepSchedule({ sleepPlan: { mode: 'auto', bed: '22:30', wake: '06:45' } }, ds).bed).toBe(23 * 60 + 10);
  expect(sleepSchedule({ sleepPlan: { bed: '01:00', wake: '09:00' } }, ds)).toMatchObject({ mode: 'manual', bed: 60, wake: 540 });
  expect(sleepSchedule({ sleepPlan: { mode: 'manual', bed: 'xx', remindBefore: 7 } }, ds)).toMatchObject({ mode: 'auto', remindBefore: 30 });
  expect(bedReminderAt({ bed: 10, remindBefore: 30 })).toBe(24 * 60 - 20);
  expect(minToHHMM(24 * 60 - 20)).toBe('23:40');
});

test('напоминания берут время из режима: за 15/30/60 минут и «доброе утро» в час подъёма', async () => {
  const plan = { on: true, mode: 'manual', bed: '23:15', wake: '07:05', remindBefore: 15, remindWake: true };
  await scheduleReminders({ remindSleep: true, sleepPlan: plan }, {});
  const by = (id) => N.scheduleNotificationAsync.mock.calls.map((c) => c[0]).find((x) => x.identifier === id);
  expect(by('remind-sleep').trigger).toMatchObject({ hour: 23, minute: 0 });
  expect(by('remind-plan-bed').trigger).toMatchObject({ hour: 23, minute: 15 });
  expect(by('remind-wake').trigger).toMatchObject({ hour: 7, minute: 5 });
  expect(by('remind-sleep').content.body).toMatch(/15/);
  N.scheduleNotificationAsync.mockClear();
  await scheduleReminders({ remindSleep: true, sleepPlan: { ...plan, bed: '00:20', remindBefore: 60 } }, {});
  expect(by('remind-sleep').trigger).toMatchObject({ hour: 23, minute: 20 });
  N.scheduleNotificationAsync.mockClear();
  await scheduleReminders({ remindSleep: true, sleepPlan: { ...plan, remindWake: false } }, {});
  expect(by('remind-wake')).toBeUndefined();
  expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith('remind-wake');
});

test('авто-режим: напоминание за 30 минут до обычного отбоя по данным', async () => {
  const ds = dsOf([night(1, 23, 10, 8), night(2, 23, 20, 8), night(3, 23, 0, 8), night(4, 10, 20, 2)]);
  await scheduleReminders({ remindSleep: true }, ds);
  const r = N.scheduleNotificationAsync.mock.calls.map((c) => c[0]).find((x) => x.identifier === 'remind-sleep');
  expect(r.trigger).toMatchObject({ hour: 22, minute: 40 });
});
