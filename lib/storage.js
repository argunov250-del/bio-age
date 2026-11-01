// Всё хранится только на телефоне.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'profile.v1';

// { birth: 'YYYY-MM-DD', sex: 'm' | 'f', heightCm: number }
export async function loadProfile() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function saveProfile(p) {
  await AsyncStorage.setItem(KEY, JSON.stringify(p));
}

// Последний расчёт — чтобы главный экран сразу показывал данные, пока идёт обновление.
const RESULT_KEY = 'result.v2'; // v2: добавлены метрики 7/30/90 — старый кэш не читаем

export async function loadResult() {
  try {
    // Старый кэш (v1) тоже показываем сразу — в нём нет только новых метрик.
    const s = (await AsyncStorage.getItem(RESULT_KEY)) || (await AsyncStorage.getItem('result.v1'));
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function saveResult(r) {
  try { await AsyncStorage.setItem(RESULT_KEY, JSON.stringify(r)); } catch (e) {}
}

// Раздел анализов удалён: старые записи анализов (ключ labs.v1) стираем с телефона.
export async function purgeLabs() {
  try { await AsyncStorage.removeItem('labs.v1'); } catch (e) {}
}

// Ручные записи (сон, шаги, вес, давление, пульс покоя, тренировки).
const ENTRIES_KEY = 'entries.v1';

export async function loadEntries() {
  try {
    const s = await AsyncStorage.getItem(ENTRIES_KEY);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

export async function saveEntries(list) {
  await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(list));
}


// Открытые достижения: { id: время открытия }.
const ACH_KEY = 'achievements.v1';

export async function loadUnlocks() {
  try {
    const s = await AsyncStorage.getItem(ACH_KEY);
    return s ? JSON.parse(s) : {};
  } catch (e) {
    return {};
  }
}

export async function saveUnlocks(map) {
  try { await AsyncStorage.setItem(ACH_KEY, JSON.stringify(map)); } catch (e) {}
}

// Моменты открытия приложения (для сна по расписанию): открытие ночью = сон прервался.
const OPENS_KEY = 'opens.v1';

export async function loadOpens() {
  try {
    const s = await AsyncStorage.getItem(OPENS_KEY);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

export async function addOpen(t = Date.now()) {
  const list = (await loadOpens()).filter((x) => x > t - 62 * 86400000);
  // Открытия чаще раза в 2 минуты не нужны — это одно и то же пробуждение.
  if (!list.length || t - list[list.length - 1] > 120000) list.push(t);
  try { await AsyncStorage.setItem(OPENS_KEY, JSON.stringify(list)); } catch (e) {}
  return list;
}

// Режим разработчика: открывает экран отладки в релизной сборке.
const DEV_KEY = 'devmode.v1';

export async function loadDevMode() {
  try { return (await AsyncStorage.getItem(DEV_KEY)) === '1'; } catch (e) { return false; }
}

export async function saveDevMode(on) {
  try {
    if (on) await AsyncStorage.setItem(DEV_KEY, '1');
    else await AsyncStorage.removeItem(DEV_KEY);
  } catch (e) {}
}
