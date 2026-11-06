// Локальный учёт ежедневных активностей: вода, витамины, дыхание, цифровая пауза.
// Только AsyncStorage 'activities.v1', по ключу дня; хранится 60 дней.
// Day: { waterMl, waterGoalMl, vitamins, breathMin, pauseMin, waterLog: [{ id, t, ml }] }
import AsyncStorage from '@react-native-async-storage/async-storage';
import { waterGoalMl } from './waterGoal';

const KEY = 'activities.v1';
const KEEP_DAYS = 60;
export const WATER_STEP_ML = 250;
const DEFAULT_GOAL = 2000;

const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (x = Date.now()) => {
  const d = new Date(x);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export { waterGoalMl };

const blank = (goal) => ({ waterMl: 0, waterGoalMl: goal || DEFAULT_GOAL, vitamins: false, breathMin: 0, pauseMin: 0, waterLog: [] });
const norm = (d) => ({ ...blank(), ...(d || {}), waterLog: Array.isArray(d && d.waterLog) ? d.waterLog : [] });

const listeners = new Set();
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
const emit = (map) => listeners.forEach((fn) => { try { fn(map); } catch (e) { /* слушатель не ломает учёт */ } });

export async function loadActivities() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? JSON.parse(raw) : null;
    return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  } catch (e) { return {}; }
}

async function mutate(fn, now = Date.now(), profile) {
  const map = await loadActivities();
  const key = dayKey(now);
  const day = norm(map[key]);
  if (profile) day.waterGoalMl = waterGoalMl(profile);
  const extra = fn(day);
  map[key] = day;
  const oldest = dayKey(now - KEEP_DAYS * 86400000);
  for (const k of Object.keys(map)) if (k < oldest) delete map[k];
  try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* без сохранения */ }
  emit(map);
  return { day, extra };
}

const mins = (m) => { const v = Number(m); return isFinite(v) && v > 0 ? Math.min(600, Math.round(v * 10) / 10) : 0; };

// -> обновлённый день; последняя порция лежит в day.waterLog[last] (id нужен для синхронизации).
export async function addWater(ml = WATER_STEP_ML, profile, now) {
  const amount = Math.max(50, Math.min(1000, Math.round(Number(ml) || WATER_STEP_ML)));
  const t = now || Date.now();
  const id = t.toString(36) + Math.random().toString(36).slice(2, 6);
  return (await mutate((d) => { d.waterLog.push({ id, t, ml: amount }); d.waterMl += amount; }, now, profile)).day;
}

// Снимает последнюю порцию дня. -> день; удалённая порция в day.undone (не сохраняется) или null.
export async function undoWater(now) {
  const { day, extra } = await mutate((d) => {
    const gone = d.waterLog.pop();
    if (gone) d.waterMl = Math.max(0, d.waterMl - gone.ml);
    return gone || null;
  }, now);
  return Object.defineProperty({ ...day }, 'undone', { value: extra, enumerable: false });
}

export async function setVitamins(v, now) { return (await mutate((d) => { d.vitamins = !!v; }, now)).day; }
export async function addBreath(min, now) { return (await mutate((d) => { d.breathMin = mins(d.breathMin + mins(min)); }, now)).day; }
export async function addPause(min, now) { return (await mutate((d) => { d.pauseMin = mins(d.pauseMin + mins(min)); }, now)).day; }
