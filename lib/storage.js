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

// Анализы: список записей { id, date, fasting, values: { test: { base, entered, unit, status } }, calc }.
// calc — результат PhenoAge с версией алгоритма, датой расчёта и входными значениями.
const LABS_KEY = 'labs.v1';

export async function loadLabs() {
  try {
    const s = await AsyncStorage.getItem(LABS_KEY);
    return s ? JSON.parse(s) : [];
  } catch (e) {
    return [];
  }
}

export async function saveLabs(list) {
  await AsyncStorage.setItem(LABS_KEY, JSON.stringify(list));
}
