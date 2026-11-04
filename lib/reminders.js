```javascript
// Напоминания на самом телефоне (без интернета и без сервера): вечером — за 30 минут
// до обычного времени отхода ко сну, в момент отбоя по расписанию — «сон начался»,
// утром — заглянуть в готовность и совет.
// Пересоздаются при каждом расчёте, чтобы время сна было свежим.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);
const LEGACY_CHANNEL = 'reminders';
export const CHANNEL = 'reminders-v2';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority
      ? Notifications.AndroidNotificationPriority.HIGH
      : undefined,
  }),
});

async function ensureReminderChannel() {
  if (Platform.OS !== 'android') return;
  if (Notifications.deleteNotificationChannelAsync) {
    try { await Notifications.deleteNotificationChannelAsync(LEGACY_CHANNEL); } catch (e) {}
  }
  const importance =
    (Notifications.AndroidImportance && Notifications.AndroidImportance.HIGH) ||
    (Notifications.AndroidImportance && Notifications.AndroidImportance.DEFAULT) ||
    4;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: t('Напоминания', 'Reminders'),
    importance,
    sound: 'default',
    enableVibrate: true,
    vibrationPattern: [0, 250, 250, 250],
  });
}

// Просит разрешение на уведомления. true — разрешено.
export async function askNotifications() {
  try {
    await ensureReminderChannel();
    const cur = await Notifications.getPermissionsAsync();
    if (cur && cur.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return !!(res && res.granted);
  } catch (e) {
    return false;
  }
}

// Обычное время отхода ко сну: медиана начала последних 14 ночей (минуты от полуночи).
export function usualBedtime(ds) {
  const starts = Object.values((ds && ds.nights) || {})
    .filter((n) => n && n.start)
    .sort((a, b) => b.start - a.start)
    .slice(0, 14)
    .map((n) => {
      const d = new Date(n.start);
      let m = d.getHours() * 60 + d.getMinutes();
      if (m < 12 * 60) m += 24 * 60;
      return m;
    })
    .sort((a, b) => a - b);
  if (!starts.length) return 23 * 60;
  return starts[Math.floor(starts.length / 2)] % (24 * 60);
}

// Отменяет только регулярные напоминания, не затрагивая мгновенные уведомления о целях ('goal-*').
async function cancelScheduledRemindersOnly() {
  if (
    Notifications.getAllScheduledNotificationsAsync &&
    Notifications.cancelScheduledNotificationAsync
  ) {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled || []) {
      const id = item && item.identifier;
      if (id && !String(id).startsWith('goal-')) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
    return;
  }
  if (Notifications.cancelAllScheduledNotificationsAsync) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function scheduleReminders(profile, ds) {
  try {
    await cancelScheduledRemindersOnly();
    const p = profile || {};
    const plan = p.sleepPlan && p.sleepPlan.on ? p.sleepPlan : null;
    const wantReminders = !!(p.remindSleep || p.remindMorning || plan);
    const wantGoals = p.notifyGoals !== false;
    if (!wantReminders && !wantGoals) return;
    if (!(await askNotifications())) return;
    if (!wantReminders) return;

    if (p.remindSleep) {
      const at = (usualBedtime(ds) - 30 + 24 * 60) % (24 * 60);
      await Notifications.scheduleNotificationAsync({
        identifier: 'remind-sleep',
        content: {
          title: t('Скоро время сна', 'Bedtime soon'),
          body: t(
            'Через 30 минут — твоё обычное время сна. Приглуши свет и отложи телефон.',
            'Your usual bedtime is in 30 minutes. Dim the lights and put the phone away.'
          ),
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: Math.floor(at / 60),
          minute: at % 60,
          channelId: CHANNEL,
        },
      });
    }
    if (plan && typeof plan.bed === 'string' && plan.bed.includes(':')) {
      // Сон по расписанию начинается сам — короткое уведомление в момент отбоя.
      const [h, m] = plan.bed.split(':').map(Number);
      if (isFinite(h) && isFinite(m)) {
        await Notifications.scheduleNotificationAsync({
          identifier: 'remind-plan-bed',
          content: {
            title: t('Сон начался 🌙', 'Sleep started 🌙'),
            body: t(
              'Спокойной ночи! Сон записывается по расписанию. Откроешь приложение — запись остановится.',
              'Good night! Sleep is being recorded on schedule. Opening the app stops the recording.'
            ),
            sound: 'default',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: h,
            minute: m,
            channelId: CHANNEL,
          },
        });
      }
    }
    if (p.remindMorning) {
      await Notifications.scheduleNotificationAsync({
        identifier: 'remind-morning',
        content: {
          title: t('Доброе утро', 'Good morning'),
          body: t(
            'Загляни: готовность и совет на сегодня уже готовы.',
            'Take a look: your readiness and tip for today are ready.'
          ),
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 8,
          minute: 30,
          channelId: CHANNEL,
        },
      });
    }
  } catch (e) {
    // уведомления недоступны — приложение работает и без них
  }
}

// Время напоминания о сне для показа в профиле: «22:40».
export function bedtimeLabel(ds) {
  const at = (usualBedtime(ds) - 30 + 24 * 60) % (24 * 60);
  return String(Math.floor(at / 60)).padStart(2, '0') + ':' + String(at % 60).padStart(2, '0');
}