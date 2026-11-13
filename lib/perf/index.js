// Независимая приближённая модель «нагрузка / восстановление / сон» по общедоступным
// описаниям подобных носимых трекеров. Это НЕ алгоритм WHOOP и не его копия: точные
// формулы закрыты, здесь — собственные упрощённые формулы поверх данных приложения.
// Не медицинские показатели. Чистая логика: без Date.now (время — параметр now), без NaN.
// Без импортов из metrics/sleepPlan: они тянут react-native, а этот модуль должен оставаться чистым JS.
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d; };
const ageAt = (birth, now) => (now - new Date(birth + 'T00:00:00')) / (365.2425 * 86400000);
const toMin = (s) => { const [h, m] = String(s || '').split(':').map(Number); return h * 60 + (m || 0); };

const DAY = 86400000, HOUR = 3600000, MIN = 60000;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const fin = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const sd = (a) => {
  if (a.length < 2) return null;
  const m = avg(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

// ---------- Нагрузка (strain) ----------
// strain = 21 · (1 − exp(−K · load)), load — сумма «минуты в зоне × номер зоны» (TRIMP по Эдвардсу).
// Калибровка (K = 0.0045): 30 мин зона 2 (load 60) ≈ 4.7; 45 мин зона 1–2 (load 67) ≈ 5.2;
// 60 мин зона 3 (load 180) ≈ 11.6; 90 мин зона 4 + 60 мин зона 3 (load 540) ≈ 19.2.
export const STRAIN_K = 0.0045;
export const STRAIN_MAX = 21;
export const strainFromLoad = (load) => (fin(load) == null || load <= 0 ? 0 : r1(STRAIN_MAX * (1 - Math.exp(-STRAIN_K * load))));
export const strainLevel = (s) => (s == null ? null : s >= 18 ? 'allout' : s >= 14 ? 'high' : s >= 10 ? 'moderate' : 'light');

// Раскладка минут по целым зонам [lo..hi] так, чтобы средний номер зоны был meanW.
function spread(minutes, meanW, lo, hi) {
  const out = {};
  const w = clamp(meanW, lo, hi);
  const f = Math.floor(w), c = Math.min(hi, f + 1), frac = c === f ? 0 : w - f;
  out[f] = (out[f] || 0) + minutes * (1 - frac);
  if (frac) out[c] = (out[c] || 0) + minutes * frac;
  return out;
}
// Минуты в 5 зонах из доступных полей: всего активных минут и load (без поминутных данных — приближение).
export function zonesFromLoad(activeMin, load, z45Min) {
  const z = [0, 0, 0, 0, 0];
  if (!(activeMin > 0) || !(load > 0)) return z;
  let hi = z45Min != null ? clamp(z45Min, 0, activeMin) : null;
  if (hi == null) { // нет разбивки: по среднему весу
    const w = load / activeMin;
    Object.entries(spread(activeMin, w, 1, 5)).forEach(([k, v]) => { z[k - 1] += v; });
  } else {
    const lo = activeMin - hi;
    const w13 = lo > 0 ? clamp((load - hi * 4.3) / lo, 1, 3) : 1;
    const w45 = hi > 0 ? clamp((load - lo * w13) / hi, 4, 5) : 4;
    if (lo > 0) Object.entries(spread(lo, w13, 1, 3)).forEach(([k, v]) => { z[k - 1] += v; });
    if (hi > 0) Object.entries(spread(hi, w45, 4, 5)).forEach(([k, v]) => { z[k - 1] += v; });
  }
  return z.map((x) => Math.round(x * 10) / 10);
}

// ---------- Восстановление ----------
export const recoveryZone = (pct) => (pct == null ? null : pct >= 67 ? 'green' : pct >= 34 ? 'yellow' : 'red');

// ---------- Сон ----------
const baseNeedByAge = (age) => (age == null ? 8 : age < 18 ? 9 : age >= 65 ? 7.5 : 8);
const DEBT_W = [1, 0.8, 0.6, 0.5, 0.4, 0.3, 0.2]; // вес недосыпа 1…7 ночей назад
export const strainAddH = (strain) => (fin(strain) == null ? 0 : clamp((strain - 6) * 0.06, 0, 1));
export const debtAddH = (debtH) => (fin(debtH) == null ? 0 : clamp(debtH * 0.25, 0, 1.5));

const hhmm = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

// Целевая зона нагрузки по восстановлению.
export function strainTargetFor(pct, current) {
  if (pct == null) return { low: null, high: null, label: null, remaining: null, suggestion: 'no_recovery' };
  const low = r1(4 + 0.12 * pct), high = r1(low + 4);
  const zone = recoveryZone(pct);
  const label = zone === 'green' ? 'push' : zone === 'yellow' ? 'maintain' : 'restore';
  const cur = fin(current) == null ? 0 : current;
  const remaining = r1(Math.max(0, high - cur));
  const suggestion = cur > high ? 'over_target_recover' : cur >= low ? 'in_range'
    : zone === 'green' ? 'room_to_push' : zone === 'yellow' ? 'moderate_session' : 'keep_easy';
  return { low, high, label, remaining, suggestion };
}

function sanitize(v) {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (Array.isArray(v)) return v.map(sanitize);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = sanitize(v[k]); return o; }
  return v;
}

export function computePerf(ds, result, profile, now) {
  const nowMs = now instanceof Date ? now.getTime() : fin(now) != null ? now : (ds && ds.now ? +ds.now : 0);
  const today = startOfDay(nowMs);
  const todayKey = dayKey(today);
  const D = ds || {};
  const hrM = D.hr || {}, sleepM = D.sleep || {}, nightsM = D.nights || {}, extra = D.extra || {};
  const prof = profile || {};
  const age = prof.birth ? fin(ageAt(prof.birth, new Date(nowMs))) : null;
  const keyAt = (i) => dayKey(addDays(today, i)); // i ≤ 0
  const missing = [];

  // --- базовые выборки ---
  const asleepH = (k) => {
    const a = sleepM[k];
    let h = a ? Array.prototype.reduce.call(a, (s, x) => s + x, 0) * 5 / 60 : 0;
    if (!h && nightsM[k] && nightsM[k].stages) { const s = nightsM[k].stages; h = ((s.light || 0) + (s.deep || 0) + (s.rem || 0)) / 60; }
    return h;
  };
  const hasNight = (k) => asleepH(k) >= 3;
  const nightHrOf = (k) => { const v = D.nightHr && D.nightHr[k]; return Array.isArray(v) ? (v[1] ? v[0] / v[1] : null) : fin(v); };
  const rhrOf = (k) => nightHrOf(k) || (D.rhr && fin(D.rhr[k])) || (hrM[k] && fin(hrM[k].rhrEst)) || null;
  // Ночные замеры доп. метрик: медиана за ночь, ключ — день пробуждения (окно 12:00–12:00).
  const nightlyCache = {};
  const nightly = (type) => {
    if (nightlyCache[type]) return nightlyCache[type];
    const m = {};
    for (const x of extra[type] || []) {
      if (!x || x.night === false || fin(x.v) == null || fin(x.t) == null) continue;
      (m[dayKey(x.t + 12 * HOUR)] || (m[dayKey(x.t + 12 * HOUR)] = [])).push(x.v);
    }
    const out = {};
    for (const k of Object.keys(m)) out[k] = median(m[k]);
    return (nightlyCache[type] = out);
  };
  const series = { hrv: nightly('HeartRateVariabilityRmssd'), resp: nightly('RespiratoryRate'), spo2: nightly('OxygenSaturation'), temp: nightly('BodyTemperature') };
  const valOf = { hrv: (k) => series.hrv[k], resp: (k) => series.resp[k], spo2: (k) => { const v = series.spo2[k]; return v == null ? null : v <= 1.5 ? v * 100 : v; }, temp: (k) => series.temp[k], rhr: rhrOf };
  const baselineOf = (metric, k, days = 30) => {
    const vals = [];
    for (let i = 1; i <= days; i++) { const v = valOf[metric](dayKey(addDays(new Date(k + 'T00:00:00'), -i))); if (fin(v) != null) vals.push(v); }
    return vals;
  };

  // --- нагрузка ---
  const hrMaxV = age != null ? 208 - 0.7 * age : null;
  const strainOfDay = (k) => {
    const h = hrM[k];
    if (!h || !(h.cover > 0 || h.manual) || fin(h.load) == null) return null;
    return { load: h.load, strain: strainFromLoad(h.load) };
  };
  const sToday = strainOfDay(todayKey);
  const cur = sToday ? sToday.strain : null;
  const dayStart = today.getTime();
  const workouts = (D.workouts || []).filter((w) => w && w.start >= dayStart && w.start < dayStart + DAY).map((w) => {
    const hrAvg = fin(w.hrAvg) != null ? w.hrAvg : w.hrN ? w.hrSum / w.hrN : null;
    const hasHr = hrAvg != null || w.load > 0;
    return {
      id: String(w.start), type: w.type == null ? null : w.type,
      strain: hasHr && fin(w.load) != null ? strainFromLoad(w.load) : null,
      durationMin: fin((w.end - w.start) / MIN) != null ? Math.round((w.end - w.start) / MIN) : null,
      hrAvg: hrAvg == null ? null : Math.round(hrAvg), hrMax: fin(w.hrMax) ? Math.round(w.hrMax) : null,
      zones: zonesFromLoad(w.activeMin, w.load),
    };
  });
  const strainSeries = [];
  for (let i = 13; i >= 0; i--) { const k = keyAt(-i); const s = strainOfDay(k); strainSeries.push({ key: k, v: s ? s.strain : null }); }
  if (!sToday) missing.push('hr');
  const strain = { day: cur, level: strainLevel(cur), cardioLoad: sToday ? r1(sToday.load) : null, workouts, series14: strainSeries };

  // --- сон ---
  const personalNorm = (() => { const v = []; for (let i = 1; i <= 30; i++) { const h = asleepH(keyAt(-i + 1)); if (h >= 3) v.push(h); } return v.length >= 7 ? median(v) : null; })();
  const resNorm = result && result.norms && fin(result.norms.sleepH);
  const norm = resNorm || personalNorm;
  const baseNeed = r2(norm != null ? 0.5 * baseNeedByAge(age) + 0.5 * clamp(norm, 6, 9.5) : baseNeedByAge(age));
  const debtAt = (k) => { // k — день пробуждения; считаем ночи до него
    let sum = 0;
    for (let j = 1; j <= 7; j++) {
      const kk = dayKey(addDays(new Date(k + 'T00:00:00'), -j));
      if (hasNight(kk)) sum += DEBT_W[j - 1] * Math.max(0, baseNeed - asleepH(kk));
    }
    return Math.min(6, sum * 0.5);
  };
  const needAt = (k) => {
    const prevStrain = strainOfDay(dayKey(addDays(new Date(k + 'T00:00:00'), -1)));
    return baseNeed + strainAddH(prevStrain && prevStrain.strain) + debtAddH(debtAt(k)); // − дневной сон (нет данных → 0)
  };
  const sleepFor = (k) => {
    if (!hasNight(k)) return null;
    const actual = asleepH(k), need = needAt(k), n = nightsM[k];
    const st = n && n.stages;
    let eff = null;
    if (st && st.light != null) {
      const asleep = (st.light || 0) + (st.deep || 0) + (st.rem || 0), inBed = asleep + (st.awake || 0);
      if (inBed > 0) eff = asleep / inBed * 100;
    } else if (n && n.end > n.start) eff = (actual * HOUR) / (n.end - n.start) * 100;
    return { actual, need, perf: clamp(actual / need * 100, 0, 100), eff: eff == null ? null : clamp(eff, 0, 100), debt: debtAt(k) };
  };
  const lastKey = [todayKey, keyAt(-1)].find(hasNight) || null;
  const consistency = (() => {
    const bed = [], wake = [];
    for (let i = 0; i < 4; i++) {
      const n = nightsM[keyAt(-i)];
      if (!n || !hasNight(keyAt(-i)) || !(n.end > n.start)) continue;
      const m = (t) => { const d = new Date(t); return ((d.getHours() * 60 + d.getMinutes() - 12 * 60) + 1440) % 1440; }; // от полудня: ночь не рвётся на полуночи
      bed.push(m(n.start)); wake.push(m(n.end));
    }
    if (bed.length < 3) return null;
    const dev = (a) => { const mu = avg(a); return avg(a.map((x) => Math.abs(x - mu))); };
    return Math.round(clamp(100 - (dev(bed) + dev(wake)) / 2 / 180 * 100, 0, 100));
  })();
  const sl = lastKey ? sleepFor(lastKey) : null;
  const nightObj = lastKey ? nightsM[lastKey] : null;
  const stages = (() => {
    const s = nightObj && nightObj.stages;
    if (!s) return null;
    const m = { light: s.light || 0, deep: s.deep || 0, rem: s.rem || 0, awake: s.awake || 0 };
    const t = m.light + m.deep + m.rem + m.awake;
    const pc = (x) => (t > 0 ? Math.round(x / t * 1000) / 10 : null);
    return { light: Math.round(m.light), deep: Math.round(m.deep), rem: Math.round(m.rem), awake: Math.round(m.awake),
      pct: { light: pc(m.light), deep: pc(m.deep), rem: pc(m.rem), awake: pc(m.awake) } };
  })();
  const needNow = lastKey ? needAt(lastKey) : needAt(todayKey);
  const tonight = (() => {
    const plan = prof.sleepPlan;
    let wakeM = plan && plan.wake && plan.on !== false ? toMin(plan.wake) : null;
    let source = wakeM != null ? 'plan' : null;
    if (wakeM == null) {
      const w = [];
      for (let i = 0; i < 7; i++) { const n = nightsM[keyAt(-i)]; if (n && hasNight(keyAt(-i)) && n.end > n.start) { const d = new Date(n.end); w.push(d.getHours() * 60 + d.getMinutes()); } }
      if (w.length >= 3) { wakeM = Math.round(median(w)); source = 'usual'; }
    }
    if (wakeM == null || !isFinite(wakeM)) return null;
    let wakeTs = dayStart + wakeM * MIN;
    if (wakeTs <= nowMs) wakeTs += DAY;
    const tomorrowKey = dayKey(addDays(today, 1));
    const needTonight = baseNeed + strainAddH(cur) + debtAddH(debtAt(tomorrowKey));
    const effs = []; for (let i = 0; i < 7; i++) { const s = hasNight(keyAt(-i)) && sleepFor(keyAt(-i)); if (s && s.eff != null) effs.push(s.eff / 100); }
    const eff = effs.length ? clamp(median(effs), 0.75, 0.98) : 0.88;
    const recommendedBed = {};
    for (const t of [100, 85, 70]) {
      const asleepH2 = needTonight * t / 100, bed = wakeTs - Math.round(asleepH2 / eff * HOUR);
      recommendedBed[t] = { ts: bed, hhmm: hhmm(bed), asleepH: r2(asleepH2) };
    }
    return { needH: r2(needTonight), wakeTs, wakeHHMM: hhmm(wakeTs), wakeSource: source, assumedEfficiencyPct: Math.round(eff * 100), recommendedBed };
  })();
  if (!lastKey) missing.push('sleep');
  const sleep = {
    needH: r2(needNow), debtH: r2(lastKey ? sl.debt : debtAt(todayKey)), actualH: sl ? r2(sl.actual) : null,
    performancePct: sl ? Math.round(sl.perf) : null, efficiencyPct: sl && sl.eff != null ? Math.round(sl.eff) : null,
    consistencyPct: consistency, stages, restorativeH: stages ? r2((stages.deep + stages.rem) / 60) : null, tonight,
  };

  // --- восстановление ---
  const recoveryFor = (k) => {
    if (!hasNight(k)) return { reason: 'no_sleep' };
    const sf = sleepFor(k);
    const parts = {}, drivers = {};
    let nBase = 0;
    for (const m of ['hrv', 'rhr', 'resp', 'spo2', 'temp']) {
      const v = valOf[m](k), b = baselineOf(m, k);
      if (fin(v) == null) continue;
      if (b.length < 4) { drivers[m] = { v, baseline: null, dev: null }; continue; }
      const base = avg(b);
      const dev = m === 'rhr' || m === 'temp' ? v - base : base ? (v - base) / base * 100 : null;
      drivers[m] = { v: r2(v), baseline: r2(base), dev: r2(dev) };
      if (m === 'hrv' || m === 'rhr') nBase += 1;
      if (m === 'hrv') parts.hrv = [clamp(70 + dev * 2, 0, 100), 0.5];
      if (m === 'rhr') parts.rhr = [clamp(70 - dev * 8, 0, 100), 0.25];
      if (m === 'resp') parts.resp = [clamp(70 - dev * 5, 0, 100), 0.1];
    }
    if (!nBase) return { reason: Object.keys(drivers).length ? 'baseline_short' : 'no_signals' };
    if (sf) parts.sleep = [sf.perf, 0.15];
    const w = Object.values(parts).reduce((s, p) => s + p[1], 0);
    const pct = Math.round(Object.values(parts).reduce((s, p) => s + p[0] * p[1], 0) / w);
    return { pct, drivers, sleepPerf: sf ? Math.round(sf.perf) : null };
  };
  const recSeries = [], perfSeries = [];
  for (let i = 13; i >= 0; i--) {
    const k = keyAt(-i), r = recoveryFor(k), s = hasNight(k) ? sleepFor(k) : null;
    recSeries.push({ key: k, v: r.pct == null ? null : r.pct });
    perfSeries.push({ key: k, v: s ? Math.round(s.perf) : null });
  }
  const rc = lastKey ? recoveryFor(lastKey) : { reason: 'no_sleep' };
  let recovery = null;
  if (rc.pct != null) {
    const d = rc.drivers;
    recovery = { pct: rc.pct, zone: recoveryZone(rc.pct),
      drivers: { hrv: d.hrv || null, rhr: d.rhr || null, resp: d.resp || null, sleepPerf: rc.sleepPerf, ...(d.spo2 ? { spo2: d.spo2 } : {}), ...(d.temp ? { skinTemp: d.temp } : {}) },
      series14: recSeries };
  }
  const recoveryNull = recovery ? null : { reason: rc.reason };
  if (!recovery) missing.push('recovery:' + rc.reason);

  const strainTarget = strainTargetFor(recovery ? recovery.pct : null, cur);

  // --- монитор здоровья: личный диапазон за 30 дней (среднее ± 1.5·SD с нижним порогом SD) ---
  const SD_MIN = { rhr: 2, hrv: 0.08, resp: 0.5, spo2: 0.8, temp: 0.3 };
  const healthMonitor = ['rhr', 'hrv', 'resp', 'spo2', 'temp'].map((m) => {
    const k = lastKey || todayKey, v = valOf[m](k), b = baselineOf(m, k);
    if (fin(v) == null || b.length < 4) return { id: m, v: fin(v) == null ? null : r2(v), typicalLow: null, typicalHigh: null, status: 'nodata' };
    const mu = avg(b), s = Math.max(sd(b) || 0, m === 'hrv' ? mu * SD_MIN.hrv : SD_MIN[m]);
    const lo = mu - 1.5 * s, hi = mu + 1.5 * s;
    return { id: m, v: r2(v), typicalLow: r2(lo), typicalHigh: r2(hi), status: v >= lo && v <= hi ? 'in' : 'out' };
  });

  // --- стресс (приближение): пульс днём вне тренировок/сна относительно покоя + HRV ---
  const stress = (() => {
    const pts = (D.hrToday || []).filter((p) => p && fin(p[1]) != null);
    const rest = rhrOf(lastKey || todayKey) || (D.rhr && fin(D.rhr[todayKey]));
    if (!rest) return null;
    const ws = D.workouts || [];
    const day = pts.filter(([t, bpm]) => !ws.some((w) => t >= w.start && t <= w.end) && !(hrMaxV && bpm > 0.6 * hrMaxV)
      && !(D.asleep && D.asleep.some && D.asleep.some((x) => t >= x[0] && t <= x[1])));
    if (day.length < 60) return null;
    const mean = avg(day.map((p) => p[1]));
    let score = clamp(((mean - rest) / rest - 0.12) / 0.3 * 3, 0, 3);
    const hd = recovery && recovery.drivers.hrv && recovery.drivers.hrv.dev;
    if (hd != null) score = clamp(score + clamp(-hd / 100 * 1.5, -0.3, 0.5), 0, 3);
    score = r1(score);
    return { score, level: score < 1 ? 'low' : score < 2 ? 'medium' : 'high', basis: hd != null ? 'hr+hrv' : 'hr', minutes: day.length };
  })();
  if (!stress) missing.push('stress');

  // --- неделя ---
  const last7 = (a) => a.slice(-7).filter((x) => x.v != null);
  const prev7 = (a) => a.slice(0, 7).filter((x) => x.v != null);
  const mean7 = (a) => { const v = last7(a).map((x) => x.v); return v.length ? avg(v) : null; };
  const best = last7(recSeries).sort((a, b) => b.v - a.v)[0] || null;
  const trend = (() => {
    const a = last7(recSeries).map((x) => x.v), b = prev7(recSeries).map((x) => x.v);
    if (a.length < 3 || b.length < 3) return null;
    const d = avg(a) - avg(b);
    return Math.abs(d) < 3 ? 'stable' : d > 0 ? 'up' : 'down';
  })();
  const weekly = {
    avgStrain: r1(mean7(strainSeries)), avgRecovery: mean7(recSeries) == null ? null : Math.round(mean7(recSeries)),
    avgSleepPerf: mean7(perfSeries) == null ? null : Math.round(mean7(perfSeries)),
    bestDay: best ? { key: best.key, recovery: best.v } : null, trend,
  };

  // --- качество данных ---
  const nHr = strainSeries.slice(-7).filter((x) => x.v != null).length;
  const nSl = perfSeries.slice(-7).filter((x) => x.v != null).length;
  if (!Object.keys(series.hrv).length) missing.push('hrv');
  if (!Object.keys(series.resp).length) missing.push('resp');
  const score = (nHr + nSl) / 14 + (Object.keys(series.hrv).length >= 4 ? 0.3 : 0);
  const dataQuality = !nHr && !nSl ? 'none' : score >= 1.1 ? 'good' : score >= 0.6 ? 'partial' : 'poor';

  return sanitize({
    strain, recovery, recoveryNull, sleep, strainTarget, healthMonitor, stress, weekly,
    meta: { dataQuality, missing: [...new Set(missing)], baseNeedH: baseNeed, lastNightKey: lastKey, todayKey },
  });
}

export default computePerf;
