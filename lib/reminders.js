// Напоминания на самом телефоне (без интернета и без сервера): вечером — за 30 минут
// до обычного времени отхода ко сну, в момент отбоя по расписанию — «сон начался»,
// утром — заглянуть в готовность и совет.
// Пересоздаются при каждом расчёте, чтобы время сна было свежим.
import * as Notifications from 'expo-notifications';
import { RU } from './i18n';
import { REMINDERS_CHANNEL, ensureChannels } from './channels';

const t = (ru, en) => (RU ? ru : en);
export const CHANNEL = REMINDERS_CHANNEL;
export const IDS = ['remind-sleep', 'remind-plan-bed', 'remind-morning'];

// Просит разрешение на уведомления. true — разрешено.
export async function askNotifications() {
  try {
    await ensureChannels();
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

let lastSig = null;

// ask = true только по действию пользователя (тумблер в профиле): тогда можно показать запрос разрешения.
// Иначе только проверяем разрешение. Свои уведомления (стабильные id) заменяются на месте;
// ненужные отменяются по id; мгновенные 'goal-*' не трогаем. Без изменений — не пересоздаём.
export async function scheduleReminders(profile, ds, { ask = false } = {}) {
  try {
    const p = profile || {};
    const plan = p.sleepPlan && p.sleepPlan.on ? p.sleepPlan : null;
    const items = {};
    if (p.remindSleep) {
      const at = (usualBedtime(ds) - 30 + 24 * 60) % (24 * 60);
      items['remind-sleep'] = {
        title: t('Скоро время сна', 'Bedtime soon'),
        body: t(
          'Через 30 минут — твоё обычное время сна. Приглуши свет и отложи телефон.',
          'Your usual bedtime is in 30 minutes. Dim the lights and put the phone away.'
        ),
        hour: Math.floor(at / 60),
        minute: at % 60,
      };
    }
    if (plan && typeof plan.bed === 'string' && plan.bed.includes(':')) {
      // Сон по расписанию начинается сам — короткое уведомление в момент отбоя.
      const [h, m] = plan.bed.split(':').map(Number);
      if (isFinite(h) && isFinite(m)) {
        items['remind-plan-bed'] = {
          title: t('Сон начался 🌙', 'Sleep started 🌙'),
          body: t(
            'Спокойной ночи! Сон записывается по расписанию. Откроешь приложение — запись остановится.',
            'Good night! Sleep is being recorded on schedule. Opening the app stops the recording.'
          ),
          hour: h,
          minute: m,
        };
      }
    }
    if (p.remindMorning) {
      items['remind-morning'] = {
        title: t('Доброе утро', 'Good morning'),
        body: t(
          'Загляни: готовность и совет на сегодня уже готовы.',
          'Take a look: your readiness and tip for today are ready.'
        ),
        hour: 8,
        minute: 30,
      };
    }
    const sig = JSON.stringify([RU, items]);
    if (sig === lastSig && !ask) return;
    await ensureChannels();
    let granted = false;
    if (Object.keys(items).length || ask) {
      granted = ask ? await askNotifications() : !!((await Notifications.getPermissionsAsync()) || {}).granted;
    }
    for (const id of IDS) {
      if (!items[id] || !granted) await Notifications.cancelScheduledNotificationAsync(id);
    }
    if (!granted) { lastSig = null; return; }
    for (const id of Object.keys(items)) {
      const { title, body, hour, minute } = items[id];
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: { title, body, sound: 'default' },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: REMINDERS_CHANNEL,
        },
      });
    }
    lastSig = sig;
  } catch (e) {
    lastSig = null; // уведомления недоступны — приложение работает и без них
  }
}

export function _resetRemindersForTests() { lastSig = null; }

// Время напоминания о сне для показа в профиле: «22:40».
export function bedtimeLabel(ds) {
  const at = (usualBedtime(ds) - 30 + 24 * 60) % (24 * 60);
  return String(Math.floor(at / 60)).padStart(2, '0') + ':' + String(at % 60).padStart(2, '0');
}
