// Сон по расписанию. Человек задаёт «ложусь в» и «встаю в» — с этого дня каждая ночь
// записывается сама: сон начинается во время отбоя и заканчивается во время подъёма.
// Открытие приложения ночью значит, что сон прервался: запись заканчивается в этот
// момент. Исключение — первые 90 минут после отбоя: если приложение открыли тогда,
// человек ещё не спит, и начало сна сдвигается на 10 минут после открытия.
// Если за ночь есть сон из Health Connect (часы), он важнее — см. lib/manual.js.
import { dayKey } from './metrics';

const MIN = 60000;
const DAY = 86400000;
const AWAKE_MS = 90 * MIN; // открытие в первые 90 минут — ещё не уснул
const SETTLE_MS = 10 * MIN; // засыпание после последнего открытия
const MIN_SLEEP = 60 * MIN;

export const toMin = (hhmm) => { const [h, m] = String(hhmm || '').split(':').map(Number); return h * 60 + (m || 0); };
const at = (dayStart, minutes) => dayStart + minutes * MIN;
const midnight = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

// Одна ночь, заканчивающаяся в день wakeDay (полночь этого дня).
export function planNight(plan, opens, wakeDay, now = Date.now()) {
  const bedM = toMin(plan.bed), wakeM = toMin(plan.wake);
  const B = bedM > wakeM ? at(wakeDay - DAY, bedM) : at(wakeDay, bedM);
  const W = at(wakeDay, wakeM);
  if (!(W > B) || B < (plan.since || 0) || now < B + MIN_SLEEP) return null;
  let start = B;
  let end = Math.min(W, now);
  let why = W <= now ? 'wake' : 'now';
  for (const o of opens || []) {
    if (o <= B || o > Math.min(W, now)) continue;
    if (o - start < AWAKE_MS) { start = o + SETTLE_MS; continue; }
    end = o;
    why = 'open';
    break;
  }
  if (end - start < MIN_SLEEP) return null;
  return { start, end, why, key: dayKey(new Date(W)) };
}

// Ручные записи сна по расписанию за последние days ночей (для applyManual).
export function planEntries(plan, opens, now = Date.now(), days = 60) {
  if (!plan || !plan.on) return [];
  const out = [];
  const today = midnight(now);
  for (let i = days; i >= 0; i--) {
    const n = planNight(plan, opens, today - i * DAY, now);
    if (n) out.push({ id: 'plan-' + n.key, type: 'sleep', date: n.key, start: n.start, end: n.end, t: n.end, plan: true, why: n.why });
  }
  return out;
}

// Последняя записанная ночь по расписанию (для карточки на «Обзоре»).
export function lastPlanNight(plan, opens, now = Date.now()) {
  const list = planEntries(plan, opens, now, 2);
  return list.length ? list[list.length - 1] : null;
}
