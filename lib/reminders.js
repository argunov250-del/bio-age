// Напоминания на самом телефоне (без интернета и без сервера): вечером — за 30 минут
// до обычного времени отхода ко сну, в момент отбоя по расписанию — «сон начался»,
// утром — заглянуть в готовность и совет.
// Пересоздаются при каждом расчёте, чтобы время сна было свежим.
import * as Notifications from 'expo-notifications';
import { RU } from './i18n';
import { REMINDERS_CHANNEL, ensureChannels } from './channels';

const t = (ru, en) => (RU ? ru : en);
export const CHANNEL = REMINDERS_CHANNEL;
export const IDS = ['remind-sleep', 'remind-plan-bed', 'remind-wake', 'remind-morning'];

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

const DAY_M = 24 * 60;
const pad2 = (n) => String(n).padStart(2, '0');
export const minToHHMM = (m) => { const x = ((Math.round(m) % DAY_M) + DAY_M) % DAY_M; return pad2(Math.floor(x / 60)) + ':' + pad2(x % 60); };
export const hhmmToMin = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return +m[1] * 60 + +m[2];
};
const round5 = (m) => (Math.round(m / 5) * 5) % DAY_M;
const median = (a) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
// Местные минуты от полуночи (getHours/getMinutes — не UTC); NaN, если время не разобрать.
const localMin = (t) => { const d = new Date(t); const v = d.getHours() * 60 + d.getMinutes(); return isFinite(v) ? v : NaN; };

// Главные ночные сессии: начало с 18:00 до 04:00 по местному времени, длина не меньше 3 часов.
// Дневной сон, короткие сессии и «утренние» старты (раньше они давали 09:50) не считаются.
// Возвращает последние 14 ночей: { bed, wake } в минутах от 18:00 (bed) и от полуночи (wake).
function mainNights(ds) {
  return Object.values((ds && ds.nights) || {})
    .filter((n) => n && n.start != null && isFinite(new Date(n.start).getTime()))
    .sort((a, b) => new Date(b.start) - new Date(a.start))
    .map((n) => {
      const bed = localMin(n.start);
      const endOk = n.end != null && isFinite(new Date(n.end).getTime());
      const len = endOk ? (new Date(n.end) - new Date(n.start)) / 60000 : null;
      const inWindow = bed >= 18 * 60 || bed < 4 * 60;
      if (!inWindow || (len != null && len < 180) || (len != null && len > 16 * 60)) return null;
      return { bed: (bed - 18 * 60 + DAY_M) % DAY_M, wake: endOk ? localMin(n.end) : null };
    })
    .filter(Boolean)
    .slice(0, 14);
}

// Обычное время отхода ко сну (минуты от полуночи): круговая медиана начала главных ночей
// (окно 18:00–04:00 непрерывно, поэтому считаем смещение от 18:00), шаг 5 минут. Нет данных — 23:00.
export function usualBedtime(ds) {
  const offs = mainNights(ds).map((n) => n.bed);
  if (!offs.length) return 23 * 60;
  return round5(median(offs) + 18 * 60);
}

// Обычное время подъёма: медиана конца главных ночей (04:00–13:00), иначе 07:00.
export function usualWake(ds) {
  const w = mainNights(ds).map((n) => n.wake).filter((m) => m != null && m >= 4 * 60 && m <= 13 * 60);
  return w.length ? round5(median(w)) : 7 * 60;
}

// Режим сна: автоматически по данным или вручную (profile.sleepPlan.mode). Старый план без mode
// с заданными bed/wake считается ручным. Возвращает минуты от полуночи и длительность в часах.
export function sleepSchedule(profile, ds) {
  const plan = (profile && profile.sleepPlan) || {};
  const auto = { bed: usualBedtime(ds), wake: usualWake(ds) };
  const pb = hhmmToMin(plan.bed), pw = hhmmToMin(plan.wake);
  const mode = plan.mode === 'auto' || plan.mode === 'manual' ? plan.mode : pb != null && pw != null ? 'manual' : 'auto';
  const manual = mode === 'manual' && pb != null && pw != null;
  const bed = manual ? pb : auto.bed, wake = manual ? pw : auto.wake;
  const remindBefore = [15, 30, 60].includes(plan.remindBefore) ? plan.remindBefore : 30;
  return { mode: manual ? 'manual' : 'auto', bed, wake, auto, remindBefore, remindWake: !!plan.remindWake, durH: (((wake - bed) % DAY_M + DAY_M) % DAY_M || DAY_M) / 60 };
}

// Время напоминания об отбое: за remindBefore минут до отбоя.
export const bedReminderAt = (sch) => (sch.bed - sch.remindBefore + DAY_M) % DAY_M;

let lastSig = null;

// ask = true только по действию пользователя (тумблер в профиле): тогда можно показать запрос разрешения.
// Иначе только проверяем разрешение. Свои уведомления (стабильные id) заменяются на месте;
// ненужные отменяются по id; мгновенные 'goal-*' не трогаем. Без изменений — не пересоздаём.
export async function scheduleReminders(profile, ds, { ask = false } = {}) {
  try {
    const p = profile || {};
    const plan = p.sleepPlan && p.sleepPlan.on ? p.sleepPlan : null;
    const items = {};
    const sch = sleepSchedule(p, ds);
    if (p.remindSleep) {
      const at = bedReminderAt(sch);
      items['remind-sleep'] = {
        title: t('Скоро время сна', 'Bedtime soon'),
        body: t(
          `Через ${sch.remindBefore} мин — время сна. Приглуши свет и отложи телефон.`,
          `Bedtime is in ${sch.remindBefore} min. Dim the lights and put the phone away.`
        ),
        hour: Math.floor(at / 60),
        minute: at % 60,
      };
    }
    if (plan) {
      // Сон по расписанию начинается сам — короткое уведомление в момент отбоя.
      items['remind-plan-bed'] = {
        title: t('Сон начался 🌙', 'Sleep started 🌙'),
        body: t(
          'Спокойной ночи! Сон записывается по расписанию. Откроешь приложение — запись остановится.',
          'Good night! Sleep is being recorded on schedule. Opening the app stops the recording.'
        ),
        hour: Math.floor(sch.bed / 60),
        minute: sch.bed % 60,
      };
    }
    if (sch.remindWake) {
      items['remind-wake'] = {
        title: t('Доброе утро', 'Good morning'),
        body: t('Пора вставать — время подъёма по твоему режиму.', 'Time to get up — your scheduled wake-up.'),
        hour: Math.floor(sch.wake / 60),
        minute: sch.wake % 60,
      };
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
export function bedtimeLabel(ds, profile) {
  return minToHHMM(bedReminderAt(sleepSchedule(profile, ds)));
}
