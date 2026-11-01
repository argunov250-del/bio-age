// Хранение памяти коуча на телефоне (AsyncStorage, ключ coachState.v1). Только состояние:
// никаких текстов сообщений. Вынесено из memory.js, чтобы чистая логика не тянула нативные модули.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MEMORY_KEY, deserialize, serialize, emptyMemory } from './memory';

export async function loadMemory() {
  try { return deserialize(await AsyncStorage.getItem(MEMORY_KEY), { newSession: true }); } catch (e) { return emptyMemory(); }
}

export async function saveMemory(mem) {
  try { await AsyncStorage.setItem(MEMORY_KEY, serialize(mem)); } catch (e) { /* память необязательна */ }
}

// Профиль → «Очистить память Хирона»: стирает состояние коуча и переписку в чате. Health Connect не затрагивается.
const resetters = new Set();
export const onCoachReset = (fn) => { resetters.add(fn); return () => resetters.delete(fn); };
export async function clearCoachMemory() {
  try { await AsyncStorage.removeItem(MEMORY_KEY); } catch (e) { /* ignore */ }
  resetters.forEach((fn) => { try { fn(); } catch (e) { /* ignore */ } });
}
