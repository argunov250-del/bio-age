// Итоги недели: последние 7 дней против предыдущих 7 — шаги, сон, тренировки,
// возраст тела и новые достижения.
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);
const DAY = 86400000;
const sum = (a) => a.reduce((s, x) => s + x, 0);

export function weekRecap(result, achievements) {
  if (!result || !result.series) return null;
  const se = result.series;
  const last = (arr, n, skip = 0) => (arr || []).slice(-(n + skip), skip ? -skip : undefined);
  const steps = last(se.steps, 7), stepsPrev = last(se.steps, 7, 7);
  const sleep = last(se.sleep, 7).filter((x) => x.v > 0), sleepPrev = last(se.sleep, 7, 7).filter((x) => x.v > 0);
  const now = Date.now();
  const wk = (se.workouts || []).filter((w) => w.start >= now - 7 * DAY);
  const wkPrev = (se.workouts || []).filter((w) => w.start >= now - 14 * DAY && w.start < now - 7 * DAY);
  const best = steps.reduce((b, x) => (x.v > (b ? b.v : 0) ? x : b), null);
  const bestNight = sleep.reduce((b, x) => (x.v > (b ? b.v : 0) ? x : b), null);
  const trend = result.trend || [];
  const ageNow = trend.length ? trend[trend.length - 1].v : result.bio;
  const ageWeek = trend.length >= 2 ? trend[trend.length - 2].v : null;
  const fresh = (achievements || []).filter((a) => a.done && a.at && a.at >= now - 7 * DAY);
  const avg = (a) => (a.length ? sum(a.map((x) => x.v)) / a.length : null);
  return {
    steps: { total: sum(steps.map((x) => x.v)), prev: sum(stepsPrev.map((x) => x.v)), best },
    sleep: { avg: avg(sleep), prev: avg(sleepPrev), best: bestNight },
    workouts: { count: wk.length, prev: wkPrev.length, minutes: Math.round(sum(wk.map((w) => (w.end - w.start) / 60000))) },
    age: { now: ageNow, delta: ageWeek != null ? ageNow - ageWeek : null, chrono: result.chrono },
    fresh,
    title: t('Итоги недели', 'Week in review'),
  };
}

// Показывать карточку на «Обзоре» в воскресенье и понедельник.
export const recapDay = (d = new Date()) => d.getDay() === 0 || d.getDay() === 1;
