// Локальное хранение флагов умных квестов и арок Хирона (AsyncStorage, всё на телефоне, без текстов сообщений):
//  rest.v1         { key: 'YYYY-MM-DD' } — последний день защитной паузы (hold/симптомы): в этот день квестов нет;
//  arcs.v1         состояние арок (см. arcs.js);
//  rank.greeted.v1 { index } — ранг, о котором Хирон уже сказал в приветствии.
// Чистая логика живёт в quests.js / arcs.js; здесь только чтение и запись. «Очистить память Хирона» стирает всё это.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onCoachReset } from './store';
import { keyOf } from './quests';
import { normalizeArcs, emptyArcs } from './arcs';

export const REST_KEY = 'rest.v1';
export const ARCS_KEY = 'arcs.v1';
export const RANK_GREETED_KEY = 'rank.greeted.v1';

const read = async (k) => { try { const s = await AsyncStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
const write = async (k, v) => { try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* необязательно */ } };

/** -> 'YYYY-MM-DD' последнего дня отдыха или null. */
export async function loadRestKey() { const o = await read(REST_KEY); return o && typeof o.key === 'string' ? o.key : null; }
/** Вызывать, когда reply() вернул holdSet (красный флаг, боль, головокружение, тяжёлые переживания). */
export async function markRestDay(now = Date.now()) { const key = keyOf(now); await write(REST_KEY, { key }); return key; }

export async function loadArcs() { return normalizeArcs(await read(ARCS_KEY)); }
export async function saveArcs(arcs) { await write(ARCS_KEY, normalizeArcs(arcs)); }

/** -> индекс ранга, о котором уже говорили, или null. */
export async function loadRankGreeted() { const o = await read(RANK_GREETED_KEY); return o && typeof o.index === 'number' && isFinite(o.index) ? o.index : null; }
export async function saveRankGreeted(index) { if (typeof index === 'number' && isFinite(index)) await write(RANK_GREETED_KEY, { index }); }

onCoachReset(() => { [REST_KEY, ARCS_KEY, RANK_GREETED_KEY].forEach((k) => { AsyncStorage.removeItem(k).catch(() => {}); }); });
export { emptyArcs };
