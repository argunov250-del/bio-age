// Собственные алгоритмы Epimely: «Индекс самочувствия», «Прогноз энергии», диапазон пульса, R-R,
// стресс %, сетка активности. Чистый JS, детерминирован, числа конечные или null. Формулы — в README.md.
const DAY = 86400000, HOUR = 3600000;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const fin = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const NAMES = { wellness: 'Индекс самочувствия', recovery: 'Восстановление', strain: 'Нагрузка', forecast: 'Прогноз энергии' };

// ---------- Журнал: нейтральные оценки дня ----------
export const NEGATIVE = ['caffeineLate', 'alcohol', 'lateMeal', 'screensBeforeBed', 'stressHigh'];
export const POSITIVE = ['meditation', 'sauna', 'coldShower', 'supplements'];
export const yes = (e, id) => {
  if (!e) return false;
  const v = e[id];
  return typeof v === 'number' ? v > 0 : !!v;
};
// Приверженность журналу: 60 + 10·(полезные) − 15·(вредные), 0..100; нет записи за день — null.
export function journalScore(e) {
  if (!e || typeof e !== 'object') return null;
  const pos = POSITIVE.filter((id) => yes(e, id)).length, neg = NEGATIVE.filter((id) => yes(e, id)).length;
  return clamp(60 + 10 * pos - 15 * neg, 0, 100);
}

// ---------- Индекс самочувствия ----------
export const WELLNESS_W = { recovery: 0.35, sleep: 0.25, strain: 0.15, consistency: 0.10, activity: 0.10, journal: 0.05 };
// Баланс нагрузки: 100 внутри целевого коридора [low, high]; ниже −10/ед., выше −12/ед.
export function strainBalance(strain, low, high) {
  if (fin(strain) == null || fin(low) == null || fin(high) == null) return null;
  if (strain < low) return clamp(100 - (low - strain) * 10, 0, 100);
  if (strain > high) return clamp(100 - (strain - high) * 12, 0, 100);
  return 100;
}
export const wellnessLabel = (s) => (s == null ? null : s >= 80 ? 'excellent' : s >= 60 ? 'good' : s >= 40 ? 'fair' : 'low');
export function wellnessScore(c) {
  let sw = 0, sum = 0;
  const comps = {};
  for (const k of Object.keys(WELLNESS_W)) {
    const v = fin(c && c[k]);
    comps[k] = v == null ? null : Math.round(clamp(v, 0, 100));
    if (v != null) { sw += WELLNESS_W[k]; sum += WELLNESS_W[k] * clamp(v, 0, 100); }
  }
  return { score: sw > 0 ? Math.round(sum / sw) : null, components: comps };
}
// days: [{key, recovery, sleep, strain, target:{low,high}, consistency, steps, journal}] по возрастанию.
export function wellnessFromDays(days, stepGoal = 8000) {
  const series14 = days.map((d) => {
    const w = wellnessScore({
      recovery: d.recovery, sleep: d.sleep, strain: d.target ? strainBalance(d.strain, d.target.low, d.target.high) : null,
      consistency: d.consistency, activity: fin(d.steps) == null ? null : clamp(d.steps / stepGoal * 100, 0, 100), journal: journalScore(d.journal),
    });
    return { key: d.key, v: w.score, components: w.components };
  });
  let i = series14.length - 1;
  while (i >= 0 && series14[i].v == null) i--;
  if (i < 0) return null;
  const prev = series14.slice(Math.max(0, i - 7), i).map((x) => x.v).filter((v) => v != null);
  const m = avg(prev);
  const deltaWeekPct = m ? r1((series14[i].v - m) / m * 100) : null;
  return { score: series14[i].v, key: series14[i].key, deltaWeekPct, components: series14[i].components, label: wellnessLabel(series14[i].v), name: NAMES.wellness, series14: series14.map((x) => ({ key: x.key, v: x.v })) };
}

// ---------- Прогноз энергии ----------
// pct = 0.55·rec + 0.45·mean7 + sleep + strain + trend + journal, затем 1..99.
export const FORECAST = { own: 0.55, sleepK: 50, sleepMin: -20, sleepMax: 8, overK: 2, overMax: 12, trendK: 0.3, trendMax: 4, alcohol: 7, lateMeal: 3, caffeineLate: 3, screensBeforeBed: 2, stressHigh: 3 };
export function sleepEffect(asleepH, needH) {
  if (!(asleepH >= 0) || !(needH > 0)) return null;
  return clamp(FORECAST.sleepK * (Math.min(asleepH / needH, 1.1) - 0.9), FORECAST.sleepMin, FORECAST.sleepMax);
}
// in: { rec, recSeries:[numbers], strain, target:{low,high}, needH, wakeTs, eff, bedTs (план), journalTonight }
export function forecastEnergy(inp) {
  const rec = fin(inp && inp.rec);
  if (rec == null) return null;
  const hist = (inp.recSeries || []).filter((x) => fin(x) != null);
  const mean7 = hist.length >= 3 ? avg(hist.slice(-7)) : rec;
  const drivers = [];
  let base = FORECAST.own * rec + (1 - FORECAST.own) * mean7;
  const add = (id, effect) => { if (effect != null && isFinite(effect)) drivers.push({ id, effect: r1(effect) }); };
  const hasStrain = fin(inp.strain) != null && inp.target && fin(inp.target.high) != null;
  if (hasStrain) add('strain', inp.strain > inp.target.high ? -Math.min(FORECAST.overMax, FORECAST.overK * (inp.strain - inp.target.high)) : 0);
  if (hist.length >= 5) { const l = avg(hist.slice(-3)), p = avg(hist.slice(-7, -3)); add('trend', clamp(FORECAST.trendK * (l - p), -FORECAST.trendMax, FORECAST.trendMax)); }
  const j = inp.journalTonight;
  if (j) {
    const jEff = (yes(j, 'alcohol') ? -FORECAST.alcohol * Math.min(2, Number(j.alcohol) > 1 ? Number(j.alcohol) : 1) : 0)
      + ['lateMeal', 'caffeineLate', 'screensBeforeBed', 'stressHigh'].reduce((s, id) => s - (yes(j, id) ? FORECAST[id] : 0), 0);
    if (jEff) add('journal', jEff);
  }
  const sleepAt = (bedTs) => {
    if (fin(bedTs) == null || fin(inp.wakeTs) == null || !(inp.needH > 0)) return null;
    return sleepEffect(Math.max(0, (inp.wakeTs - bedTs) / HOUR * (fin(inp.eff) || 0.88)), inp.needH);
  };
  const other = drivers.reduce((s, d) => s + d.effect, 0);
  const pctOf = (sleepEff) => Math.round(clamp(base + other + (sleepEff || 0), 1, 99));
  const se = sleepAt(inp.bedTs);
  if (se != null) add('sleep', se);
  const pct = pctOf(se);
  const conf = hist.length >= 7 && se != null ? 'high' : hist.length >= 3 ? 'medium' : 'low';
  const hw = conf === 'high' ? 6 : conf === 'medium' ? 9 : 13;
  const scenarios = [];
  for (const s of inp.bedOptions || []) {
    const e = sleepAt(s.ts);
    if (e != null) scenarios.push({ id: s.id, bed: s.hhmm, pct: pctOf(e) });
  }
  return { pct, range: [Math.round(clamp(pct - hw, 0, 100)), Math.round(clamp(pct + hw, 0, 100))], drivers, confidence: conf, scenarios, name: NAMES.forecast };
}

// ---------- Диапазон пульса за день ----------
export function hrRangeOf(points, rhrEst, workoutPeaks) {
  const pts = (points || []).map((p) => (Array.isArray(p) ? p[1] : null)).filter((v) => fin(v) != null && v > 25 && v < 250);
  if (pts.length >= 10) return { lowest: Math.round(Math.min(...pts)), avg: Math.round(avg(pts)), peak: Math.round(Math.max(...pts)), approx: false, basis: 'samples', n: pts.length };
  const peaks = (workoutPeaks || []).filter((v) => fin(v) != null && v > 0);
  if (fin(rhrEst) == null && !peaks.length) return null;
  return { lowest: fin(rhrEst) == null ? null : Math.round(rhrEst), avg: null, peak: peaks.length ? Math.round(Math.max(...peaks)) : null, approx: true, basis: 'aggregates', n: 0 };
}

// ---------- R-R интервал ----------
export function rrOf(hrRange, restHr, rmssd, hrvDevPct) {
  let hr = null, basis = null;
  if (hrRange && fin(hrRange.avg) != null) { hr = hrRange.avg; basis = 'avg'; } else if (fin(restHr) != null) { hr = restHr; basis = 'rest'; }
  if (hr == null || hr < 30 || hr > 220) return null;
  return { ms: Math.round(60000 / hr), hr: Math.round(hr), basis, rmssd: fin(rmssd) == null ? null : Math.round(rmssd), rmssdDevPct: fin(hrvDevPct) == null ? null : r1(hrvDevPct) };
}

// ---------- Стресс % ----------
// pct = 100·(0.5·score/3 + 0.25·elev + 0.25·hrv), elev = ((пульс−покой)/покой)/0.4, hrv = падение HRV/30%; без HRV веса 2/3 и 1/3.
export function stressPctOf(stress, hrvDevPct) {
  if (!stress || fin(stress.score) == null) return null;
  const parts = [[clamp(stress.score / 3, 0, 1), 0.5]];
  if (fin(stress.meanBpm) != null && stress.restBpm > 0) parts.push([clamp((stress.meanBpm - stress.restBpm) / stress.restBpm / 0.4, 0, 1), 0.25]);
  if (fin(hrvDevPct) != null) parts.push([clamp(-hrvDevPct / 30, 0, 1), 0.25]);
  const w = parts.reduce((s, p) => s + p[1], 0);
  const pct = Math.round(100 * parts.reduce((s, p) => s + p[0] * p[1], 0) / w);
  return { pct, level: pct < 33 ? 'low' : pct < 66 ? 'medium' : 'high', basis: parts.length === 3 ? 'hr+hrv' : 'hr' };
}

// ---------- Сетка активности ----------
// valueByDay: { 'YYYY-MM-DD': число }; goal — цель/день. full ≥ goal, partial ≥ partialFrac·goal, иначе none.
export function activityGrid(valueByDay, { goal = 1, weeks = 6, now = 0, partialFrac = 0.5 } = {}) {
  const nowMs = fin(+now) == null || !now ? 0 : +now;
  const w = clamp(Math.round(weeks) || 6, 1, 8);
  const g = goal > 0 ? goal : 1;
  const t = new Date(nowMs); t.setHours(0, 0, 0, 0);
  const mondayOff = (t.getDay() + 6) % 7; // понедельник — первый день недели
  const todayKey = dayKey(t);
  const out = []; let full = 0, partial = 0;
  for (let wi = w - 1; wi >= 0; wi--) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(t); dt.setDate(dt.getDate() - mondayOff - wi * 7 + d);
      const key = dayKey(dt), future = key > todayKey;
      const v = fin(valueByDay && valueByDay[key]);
      const state = future || v == null || v <= 0 ? 'none' : v >= g ? 'full' : v >= g * partialFrac ? 'partial' : 'none';
      if (state === 'full') full++; else if (state === 'partial') partial++;
      days.push({ key, state, v: v == null ? null : r1(v), future });
    }
    out.push({ days });
  }
  return { weeks: out, goal: g, full, partial };
}
// Осознанность: минуты дыхания + паузы из lib/activities.js (map день → {breathMin, pauseMin}).
export function mindfulnessGrid(activitiesMap, opts = {}) {
  const v = {};
  for (const k of Object.keys(activitiesMap || {})) {
    const d = activitiesMap[k] || {};
    const m = (fin(d.breathMin) || 0) + (fin(d.pauseMin) || 0);
    if (m > 0) v[k] = m;
  }
  return activityGrid(v, { goal: 10, ...opts });
}
export { DAY };
