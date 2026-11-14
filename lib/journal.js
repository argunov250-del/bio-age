// Дневник привычек: локально, AsyncStorage 'journal.v1', по ключу дня, 120 дней. Не бросает исключений.
// Day: { caffeineLate, alcohol (число порций), lateMeal, screensBeforeBed, stressHigh, meditation (bool|минуты),
//        sauna, coldShower, supplements, notes: [строки] }. Вода — только чтение из lib/activities.js.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { journalImpact, insightText, needMoreText, BEHAVIORS } from './perf/journalStats';

export { journalImpact, insightText, needMoreText, BEHAVIORS };
const KEY = 'journal.v1';
const KEEP_DAYS = 120;
const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (x = Date.now()) => { const d = new Date(x); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const BOOL = ['caffeineLate', 'lateMeal', 'screensBeforeBed', 'stressHigh', 'sauna', 'coldShower', 'supplements'];
const COUNT = { alcohol: 20, meditation: 600 };
export function normDay(d) {
  const o = d && typeof d === 'object' ? d : {};
  const out = { notes: [] };
  for (const k of BOOL) out[k] = !!o[k];
  out.alcohol = Math.min(20, Math.max(0, Math.round(Number(o.alcohol)) || 0));
  out.meditation = typeof o.meditation === 'number' ? Math.min(600, Math.max(0, isFinite(o.meditation) ? o.meditation : 0)) : !!o.meditation;
  if (Array.isArray(o.notes)) out.notes = o.notes.filter((s) => typeof s === 'string' && s.trim()).slice(-10).map((s) => s.slice(0, 280));
  return out;
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = (m) => listeners.forEach((fn) => { try { fn(m); } catch (e) { /* слушатель не ломает журнал */ } });

// Записи идут строго по одной через цепочку промисов (load → изменить → save): параллельные вызовы не затирают друг друга.
// Чтение ждёт уже поставленные записи, поэтому всегда видит их результат.
let chain = Promise.resolve();
async function readStore() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? JSON.parse(raw) : null;
    return m && typeof m === 'object' && !Array.isArray(m) ? m : {};
  } catch (e) { return {}; }
}
export async function loadJournal() {
  await chain;
  return readStore();
}
function mutate(fn, now = Date.now()) {
  const run = async () => {
    try {
      const map = await readStore();
      const key = dayKey(now);
      const day = normDay(map[key]);
      fn(day);
      map[key] = normDay(day);
      const oldest = dayKey(now - KEEP_DAYS * 86400000);
      for (const k of Object.keys(map)) if (k < oldest) delete map[k];
      try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch (e) { /* без сохранения */ }
      emit(map);
      return map[key];
    } catch (e) { return normDay(null); }
  };
  const p = chain.then(run);
  chain = p.then(() => undefined, () => undefined);
  return p;
}
// Сохранить поля дня (patch поверх текущих).
export const saveJournalDay = (patch, now) => mutate((d) => { Object.assign(d, patch && typeof patch === 'object' ? patch : {}); }, now);
// Переключить булево поведение; для alcohol — 0 ⇄ 1 порция; для meditation — false ⇄ true.
export const toggleBehavior = (id, now) => mutate((d) => {
  if (id === 'alcohol') d.alcohol = d.alcohol > 0 ? 0 : 1;
  else if (id === 'meditation') d.meditation = !(d.meditation > 0 || d.meditation === true);
  else if (BOOL.includes(id)) d[id] = !d[id];
}, now);
export const addJournalNote = (text, now) => mutate((d) => { if (typeof text === 'string' && text.trim()) d.notes = [...d.notes, text.trim()]; }, now);
export const setCount = (id, n, now) => mutate((d) => { if (COUNT[id] != null) d[id] = Math.min(COUNT[id], Math.max(0, Number(n) || 0)); }, now);
