// Лёгкая вибрация: переключение вкладок, сохранение записи, новое достижение.
// Выключается в профиле.
import * as Haptics from 'expo-haptics';

let enabled = true;
export const setHaptics = (on) => { enabled = on !== false; };

export function tap() {
  if (enabled) Haptics.selectionAsync().catch(() => {});
}

export function success() {
  if (enabled) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
