// Android-каналы уведомлений и обработчик показа. Канал неизменяем после создания
// (важность и звук правятся только пользователем), поэтому при смене настроек — новый id,
// а старые каналы удаляются. Импортируется из notify.js и reminders.js.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);
export const GOALS_CHANNEL = 'goals-v2';
export const REMINDERS_CHANNEL = 'reminders-v2';
export const LEGACY_CHANNELS = ['goals', 'reminders'];

// Один раз при загрузке модуля: показывать со звуком и в шторке, и поверх приложения.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const importanceHigh = () => (Notifications.AndroidImportance && Notifications.AndroidImportance.HIGH) || 4;
const spec = (name) => ({
  name,
  importance: importanceHigh(),
  sound: 'default',
  enableVibrate: true,
  vibrationPattern: [0, 250, 250, 250],
});

let ready = null;
// Создаёт новые каналы и удаляет старые. Выполняется один раз за запуск; безопасно звать многократно.
export function ensureChannels() {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!ready) {
    ready = (async () => {
      for (const id of LEGACY_CHANNELS) {
        try { await Notifications.deleteNotificationChannelAsync(id); } catch (e) {}
      }
      await Notifications.setNotificationChannelAsync(GOALS_CHANNEL, spec(t('Цели', 'Goals')));
      await Notifications.setNotificationChannelAsync(REMINDERS_CHANNEL, spec(t('Напоминания', 'Reminders')));
    })().catch((e) => { ready = null; });
  }
  return ready;
}

// Каналы готовы к первому расписанию.
ensureChannels();

export function _resetChannelsForTests() { ready = null; }
