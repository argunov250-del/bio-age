// Простые оценки 0–100 для «Обзора»: Сон, Восстановление, Готовность, Активность,
// а также личные нормы, тренды и совет на сегодня. Это не медицинские показатели.
// Если для оценки не хватает данных — оценка не выдумывается: status = no_data/insufficient.
import { dayKey, startOfDay, addDays, mean, median } from './metrics';

const clamp = (x, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, x));
// Линейно от (x0 → y0) до (x1 → y1), за краями — ограничение.
const lin = (x, x0, y0, x1, y1) => clamp(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0), Math.min(y0, y1), Math.max(y0, y1));

// Взвешенное среднее доступных частей: { key: [очки, вес] | null }.
function combine(parts) {
  const ok = Object.entries(parts).filter(([, p]) => p && p[0] != null && isFinite(p[0]));
  const w = ok.reduce((a, [, p]) => a + p[1], 0);
  if (!w) return null;
  return Math.round(ok.reduce((a, [, p]) => a + p[0] * p[1], 0) / w);
}

export const level = (score) => (score == null ? null : score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low');

// Оценка одной ночи сна: длительность, глубокий, REM, пробуждения, регулярность.
export function nightScore(hours, stages, sri) {
  if (!(hours > 0)) return null;
  const total = stages ? stages.deep + stages.rem + stages.light + stages.awake : 0;
  const parts = {
    duration: [hours >= 7 && hours <= 9 ? 100 : hours < 7 ? lin(hours, 4, 0, 7, 100) : lin(hours, 9, 100, 11, 60), 0.4],
    deep: total ? [lin((stages.deep / total) * 100, 5, 0, 15, 100), 0.15] : null,
    rem: total ? [lin((stages.rem / total) * 100, 10, 0, 20, 100), 0.15] : null,
    awake: total ? [lin(stages.awake, 90, 0, 20, 100), 0.1] : null,
    regularity: sri != null ? [lin(sri, 40, 0, 85, 100), 0.2] : null,
  };
  return { score: combine(parts), parts, partial: !total || sri == null };
}

// Тренд по суточному ряду [{ key, v }]: последние 7 дней против предыдущих 23.
// better: 'up' — чем больше, тем лучше; 'down' — чем меньше, тем лучше.
export function trendOf(series, better = 'up') {
  const vals = (series || []).slice(-30).filter((x) => x.v > 0);
  if (vals.length < 8) return null;
  const recent = mean(vals.slice(-7).map((x) => x.v));
  const prev = mean(vals.slice(0, -7).map((x) => x.v));
  if (!prev) return null;
  const rel = (recent - prev) / prev;
  if (Math.abs(rel) < 0.03) return 'stable';
  return (rel > 0) === (better === 'up') ? 'better' : 'attention';
}

export function computeScores(ds, m) {
  const now = ds.now.getTime();
  const today = startOfDay(ds.now);
  const keys = (n, includeToday) => {
    const out = [];
    for (let i = n; i >= 1; i--) out.push(dayKey(addDays(today, includeToday ? -i + 1 : -i)));
    return out;
  };
  const asleepH = (k) => (ds.sleep[k] ? ds.sleep[k].reduce((a, x) => a + x, 0) * 5 / 60 : 0);
  const sri14 = m.sleepRegularity[14].status === 'ok' ? m.sleepRegularity[14].value : null;

  // Личные нормы (медианы за 30 дней, без последней ночи/дня).
  const nights30 = keys(30, true).filter((k) => asleepH(k) >= 3);
  const lastNightKey = [...keys(2, true)].reverse().find((k) => asleepH(k) >= 3) || null;
  const normOf = (vals, min = 7) => (vals.length >= min ? median(vals) : null);
  const norms = {
    sleepH: normOf(nights30.filter((k) => k !== lastNightKey).map(asleepH)),
    nightHr: normOf(keys(30, true).filter((k) => k !== lastNightKey && ds.nightHr[k]).map((k) => ds.nightHr[k])),
    rhr: normOf(keys(30).map((k) => ds.rhr[k] || (ds.hr[k] && ds.hr[k].rhrEst)).filter(Boolean)),
    hrv: m.hrvBaseline.status === 'ok' ? m.hrvBaseline.value : null,
    steps: normOf(keys(30).map((k) => ds.steps[k]).filter(Boolean)),
  };

  // Сон: последняя ночь и среднее за 7 ночей.
  const night = lastNightKey ? ds.nights[lastNightKey] : null;
  const lastSleep = lastNightKey ? nightScore(asleepH(lastNightKey), night && night.stages, sri14) : null;
  const week = keys(7, true).filter((k) => asleepH(k) >= 3).map((k) => nightScore(asleepH(k), ds.nights[k] && ds.nights[k].stages, sri14).score);
  const sleep = lastSleep
    ? { status: 'ok', score: lastSleep.score, partial: lastSleep.partial, parts: lastSleep.parts, hours: asleepH(lastNightKey), night: night ? { start: night.start, end: night.end, stages: night.stages } : null, avg7: week.length ? Math.round(mean(week)) : null, norm: norms.sleepH, sri14 }
    : { status: 'no_data', missing: ['sleep'] };

  // Восстановление: HRV к своей норме, ночной пульс к своей норме, сон за последнюю ночь.
  const hrvList = (ds.extra.HeartRateVariabilityRmssd || []).filter((x) => x.t >= now - 36 * 3600000);
  const hrvLast = hrvList.length ? hrvList[hrvList.length - 1].v : null;
  const hrvDev = hrvLast != null && norms.hrv ? ((hrvLast - norms.hrv) / norms.hrv) * 100 : null;
  const nightHrLast = lastNightKey ? ds.nightHr[lastNightKey] : null;
  const nightHrDiff = nightHrLast != null && norms.nightHr != null ? nightHrLast - norms.nightHr : null;
  const recParts = {
    hrv: hrvDev != null ? [clamp(70 + hrvDev * 2), 0.4] : null,
    nightHr: nightHrDiff != null ? [clamp(70 - nightHrDiff * 6), 0.3] : null,
    sleep: lastSleep ? [lastSleep.score, 0.3] : null,
  };
  const recHave = Object.values(recParts).filter(Boolean).length;
  const recMissing = Object.keys(recParts).filter((k) => !recParts[k]);
  const recovery = recHave >= 2
    ? { status: 'ok', score: combine(recParts), parts: recParts, partial: recHave < 3, missing: recMissing, hrvLast, hrvDev, nightHrLast, nightHrDiff }
    : { status: recHave ? 'insufficient' : 'no_data', missing: recMissing, hrvLast, hrvDev, nightHrLast, nightHrDiff };

  // Нагрузка: последние 2 дня против обычного (28 дней).
  const loadOf = (k) => (ds.hr[k] ? ds.hr[k].load || 0 : 0);
  const days28 = keys(28).filter((k) => ds.hr[k] && (ds.hr[k].cover >= 60 || ds.hr[k].manual));
  const chronic = days28.length >= 7 ? mean(days28.map(loadOf)) : null;
  const acuteKeys = [dayKey(addDays(today, -1)), dayKey(today)];
  const acute = mean(acuteKeys.map(loadOf));
  const ratio = chronic ? acute / chronic : null;
  const load7 = keys(7).reduce((a, k) => a + loadOf(k), 0);
  const load = { acute, chronic, ratio, week: load7, weekUsual: chronic != null ? chronic * 7 : null,
    level: ratio == null ? null : ratio > 1.5 ? 'high' : ratio < 0.6 ? 'low' : 'normal' };

  // Готовность: восстановление с поправкой на недавнюю нагрузку.
  const loadPts = ratio == null ? null : ratio <= 1.2 ? 100 : clamp(100 - (ratio - 1.2) * 80);
  const readiness = recovery.status === 'ok'
    ? { status: 'ok', score: loadPts == null ? recovery.score : Math.round(recovery.score * 0.75 + loadPts * 0.25), loadPts, partial: recovery.partial || loadPts == null }
    : { status: recovery.status, missing: recovery.missing };
  readiness.level = level(readiness.score);

  // Активность за 7 дней: шаги, активные минуты, тренировки, расстояние.
  const st = m.steps[7], am = m.activeMinutes[7], wk = m.exercise[7];
  const dist7 = keys(7).map((k) => ds.distance[k]).filter(Boolean);
  const actParts = {
    steps: st.value != null ? [Math.min(100, st.value / 100), 0.4] : null,
    active: am.value != null ? [Math.min(100, am.value / 1.5), 0.3] : null,
    workouts: wk.status === 'ok' ? [Math.min(100, (wk.value / 3) * 100), 0.15] : null,
    distance: dist7.length ? [Math.min(100, mean(dist7) / 60), 0.15] : null,
  };
  const activity = actParts.steps || actParts.active
    ? { status: 'ok', score: combine(actParts), parts: actParts, partial: !actParts.active || !actParts.steps, distanceAvg: dist7.length ? mean(dist7) : null }
    : { status: 'no_data', missing: ['steps'] };

  return { sleep, recovery, readiness, activity, load, norms, lastNightKey };
}
