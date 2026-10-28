// Всё хранится только на телефоне.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

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

// Последний ответ ИИ-коуча — показывается без интернета, пока не устареет.
const COACH_KEY = 'coach.v1';

export async function loadCoach() {
  try {
    const s = await AsyncStorage.getItem(COACH_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    return null;
  }
}

export async function saveCoach(c) {
  try { await AsyncStorage.setItem(COACH_KEY, JSON.stringify(c)); } catch (e) {}
}

// Ключ Claude API — в защищённом хранилище Android (Keystore), не в обычных настройках.
const API_KEY = 'anthropic.key';

export async function loadApiKey() {
  try {
    return (await SecureStore.getItemAsync(API_KEY)) || '';
  } catch (e) {
    return '';
  }
}

export async function saveApiKey(k) {
  if (k) await SecureStore.setItemAsync(API_KEY, k);
  else await SecureStore.deleteItemAsync(API_KEY);
}
