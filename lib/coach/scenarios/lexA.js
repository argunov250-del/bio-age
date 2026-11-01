// Общие помощники групп 1–4 (приветствие, план на сегодня, решение о тренировке, мотивация):
// сценарий с applies/blocked, «чистое» сообщение из набора фраз и вид визита (первый / в тот же день / после перерыва).
import { P } from '../nlu';
import { SC } from './kit';

// Сценарий: phrase(nlu, env) — формулировка; applies(env) — условие применимости; blocked(env) — причина блокировки.
// Движок вызывает только match, поэтому все три условия собираются в нём.
export const RS = (o) => SC({
  ...o,
  match: (n, e) => !!o.phrase(n, e) && (!o.applies || !!o.applies(e)) && !(o.blocked && o.blocked(e)),
});

const gl = (rx) => new RegExp(rx.source, 'g');

// Сообщение целиком состоит из фраз rxList и «пустых» слов allowed (обращение, вежливость).
export function pureOf(norm, rxList, allowed) {
  let s = ' ' + norm + ' ';
  let hit = false;
  for (const rx of rxList) s = s.replace(gl(rx), () => { hit = true; return ' '; });
  return hit && s.split(/\s+/).filter(Boolean).every((w) => allowed.has(w));
}
export const hasAny = (norm, rxList) => rxList.some((rx) => rx.test(norm));

// ───────────────────────── состояние дня (из analyze(), без новых порогов) ─────────────────────────
const stateOf = (e) => (e && e.s && e.s.state) || null;
export const isTired = (e) => stateOf(e) === 'tired';
export const isUnknown = (e) => stateOf(e) === 'unknown';
export const isOk = (e) => stateOf(e) === 'normal' || stateOf(e) === 'fresh';

// ───────────────────────── вид визита ─────────────────────────
// Перерыв считаем только если время прошлого хода известно из памяти (lastAt): иначе «давно не виделись» не говорим.
export const BREAK_DAYS = 3;
const MIN_TS = 1e12; // осмысленная отметка времени (после 2001 г.)
const dayStart = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

// -> 'first' | 'same' | 'break' | 'regular'
export function visitKind(env) {
  const mem = env.mem || {};
  const spoken = (env.history || []).some((h) => h && h.from === 'me');
  if (!mem.turn && !spoken) return 'first';
  const at = mem.lastAt;
  const now = env.now;
  if (typeof at === 'number' && at >= MIN_TS && typeof now === 'number' && now >= at) {
    const days = Math.round((dayStart(now) - dayStart(at)) / 864e5);
    if (days === 0) return 'same';
    return days >= BREAK_DAYS ? 'break' : 'regular';
  }
  return spoken ? 'same' : 'regular';
}

// ───────────────────────── словари ─────────────────────────
// Слова про тренировку / движение (в дополнение к TOPIC_LEX и ACTS из nlu).
export const TRAINISH = P('трен\\S*|заниматься|занят\\S*|спорт\\S*|двигаться|движени\\S*|упражнени\\S*|разминк\\S*|в зал|зал|workout\\S*|train\\S*|exercis\\S*|gym|working out|work out|move|moving');
export const isTrainish = (n) => n.topics.includes('train') || !!n.activity || !!n.avoid || TRAINISH.test(n.norm);
// Отмена/передумал: это ситуация plan_change, не вопрос «тренироваться ли».
export const CANCELLED = P('передумал\\S*|отмен\\S*|отложу|не пойду|cancel\\S*|changed my mind|call it off');
