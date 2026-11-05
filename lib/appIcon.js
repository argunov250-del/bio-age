// Смена значка приложения (Android, activity-alias через expo-alternate-app-icons).
// Нативный модуль подключается лениво и только в try/catch: если его нет в сборке,
// приложение работает как раньше, а настройка скрыта.
export const ICONS = ['A', 'B', 'C', 'D'];
export const DEFAULT_ICON = 'B';

let cached;
function native() {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    const m = require('expo-alternate-app-icons');
    if (m && m.supportsAlternateIcons && typeof m.setAlternateAppIcon === 'function') cached = m;
  } catch (e) { cached = null; }
  return cached;
}

export function iconSupported() {
  return !!native();
}

export function normalizeIcon(id) {
  return ICONS.includes(id) ? id : DEFAULT_ICON;
}

// Какой значок включён в системе сейчас (или null, если узнать нельзя).
export function currentIcon() {
  const m = native();
  if (!m || typeof m.getAppIconName !== 'function') return null;
  try { return normalizeIcon(m.getAppIconName() || DEFAULT_ICON); } catch (e) { return null; }
}

// B — основной значок (alias «Default»), остальные — по имени. Не бросает исключений.
export async function applyIcon(id) {
  const m = native();
  if (!m) return false;
  const v = normalizeIcon(id);
  try {
    await m.setAlternateAppIcon(v === DEFAULT_ICON ? null : v);
    return true;
  } catch (e) { return false; }
}
