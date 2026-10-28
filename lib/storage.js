// Профиль хранится только на телефоне.
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
