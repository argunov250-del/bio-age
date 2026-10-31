// Напоминания на самом телефоне (без интернета и без сервера): вечером — за 30 минут
// до обычного времени отхода ко сну, утром — заглянуть в готовность и совет.
// Пересоздаются при каждом расчёте, чтобы время сна было свежим.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Просит разрешение на уведомления. true — разрешено.
export async function askNotifications() {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, { name: t('Напоминания', 'Reminders'), importance: Notifications.AndroidImportance.DEFAULT });
    }
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const res = await Notifications.requestPermissionsAsync();
    return !!res.granted;
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
    .map((n) => { const d = new Date(n.start); let m = d.getHours() * 60 + d.getMinutes(); if (m < 12 * 60) m += 24 * 60; return m; })
    .sort((a, b) => a - b);
  if (!starts.length) return 23 * 60;
  return starts[Math.floor(starts.length / 2)] % (24 * 60);
}

export async function scheduleReminders(profile, ds) {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const p = profile || {};
    if (!p.remindSleep && !p.remindMorning) return;
    if (!(await askNotifications())) return;
    if (p.remindSleep) {
      const at = (usualBedtime(ds) - 30 + 24 * 60) % (24 * 60);
      await Notifications.scheduleNotificationAsync({
        content: { title: t('Скоро время сна', 'Bedtime soon'), body: t('Через 30 минут — твоё обычное время сна. Приглуши свет и отложи телефон.', 'Your usual bedtime is in 30 minutes. Dim the lights and put the phone away.') },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: Math.floor(at / 60), minute: at % 60, channelId: CHANNEL },
      });
    }
    if (p.remindMorning) {
      await Notifications.scheduleNotificationAsync({
        content: { title: t('Доброе утро', 'Good morning'), body: t('Загляни: готовность и совет на сегодня уже готовы.', 'Take a look: your readiness and tip for today are ready.') },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 8, minute: 30, channelId: CHANNEL },
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
