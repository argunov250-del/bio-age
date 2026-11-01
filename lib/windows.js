// Метрики за окна 7, 30 и 90 дней с источником и состоянием (lib/model.js).
// Lifestyle Age по-прежнему считается в metrics.js/formula.js за 6 месяцев — здесь
// только показ метрик и данные для будущих оценок (Recovery, Sleep, Activity).
import { dayKey, startOfDay, addDays, mean, median } from './metrics';
import { SOURCE, metric, noData, insufficient, invalid, isValid } from './model';
import { hrMax } from './formula';
import { isNum } from './num';

export const WINDOWS = [7, 30, 90];
// Минимум дней с данными, чтобы окно считалось надёжным.
const MIN_N = { 7: 4, 14: 7, 30: 10, 90: 30 };
const DAY = 86400000;

// Ключи дней окна: суточные итоги — по завершённым дням, ночи — включая сегодняшнее утро.
function dayKeys(now, w, includeToday) {
  const today = startOfDay(now);
  const out = [];
  for (let i = w; i >= 1; i--) out.push(dayKey(addDays(today, includeToday ? -i + 1 : -i)));
  return out;
}

// Среднее суточных значений за окно (map: день → значение).
// manual — дни, заполненные ручными записями: если все такие — источник «вручную».
function dailyAvg(map, keys, unit, source, w, manual) {
  const used = keys.filter((k) => map[k] != null && map[k] > 0);
  if (!used.length) return noData(unit);
  const v = mean(used.map((k) => map[k]));
  const nManual = manual ? used.filter((k) => manual.has(k)).length : 0;
  const src = nManual === used.length ? SOURCE.manual : source;
  const extra = nManual && nManual < used.length ? { withManual: true } : undefined;
  return used.length >= MIN_N[w] ? metric(v, unit, src, used.length, extra) : insufficient(unit, used.length, v, { source: src, ...extra });
}

// Окно по мгновенным замерам { t, v }: проверка диапазона, среднее или медиана.
function instantWindow(list, now, w, kind, unit, agg = mean, minN = 1, pick = (x) => x.v) {
  const from = now - w * DAY;
  const inWin = list.filter((x) => x.t >= from && x.t <= now);
  if (!inWin.length) return noData(unit);
  const ok = inWin.filter((x) => isValid(kind, pick(x)));
  if (!ok.length) return invalid(unit, inWin.length);
  const v = agg(ok.map(pick));
  const nManual = ok.filter((x) => x.origin === 'manual').length;
  const src = nManual === ok.length ? SOURCE.manual : SOURCE.hc;
  const extra = { ...(ok.length < inWin.length ? { invalidN: inWin.length - ok.length } : {}), ...(nManual && nManual < ok.length ? { withManual: true } : {}) };
  return ok.length >= minN ? metric(v, unit, src, ok.length, extra) : insufficient(unit, ok.length, v, { source: src, ...extra });
}

// Линейный тренд (единиц за period дней) по замерам { t, v }.
function slope(points, periodDays) {
  if (points.length < 3) return null;
  const t0 = points[0].t;
  const xs = points.map((p) => (p.t - t0) / DAY), ys = points.map((p) => p.v);
  if (xs[xs.length - 1] - xs[0] < 14) return null; // нужен хотя бы двухнедельный размах
  const mx = mean(xs), my = mean(ys);
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den ? (num / den) * periodDays : null;
}

// Индекс регулярности сна за ночи окна (как в metrics.js, но для любого окна).
function sri(ds, keys) {
  let same = 0, total = 0, pairs = 0;
  const full = (k) => ds.sleep[k] && ds.sleep[k].reduce((a, x) => a + x, 0) >= 36;
  for (let i = 1; i < keys.length; i++) {
    const a = ds.sleep[keys[i - 1]], b = ds.sleep[keys[i]];
    if (!full(keys[i - 1]) || !full(keys[i])) continue;
    pairs += 1;
    for (let e = 0; e < a.length; e++) { total += 1; if (a[e] === b[e]) same += 1; }
  }
  return { v: total ? 200 * same / total - 100 : null, pairs };
}

const granted = (ds, type) => ds.granted.has(type);
const perWindow = (fn) => Object.fromEntries(WINDOWS.map((w) => [w, fn(w)]));

export function computeMetrics(ds, profile) {
  const now = ds.now.getTime();
  const ex = (type) => ds.extra[type] || [];
  const asleepH = (k) => (ds.sleep[k] ? ds.sleep[k].reduce((a, x) => a + x, 0) * 5 / 60 : 0);
  const age = (ds.now - new Date(profile.birth + 'T00:00:00')) / (365.2425 * DAY);
  const out = {};
  const access = (type, unit) => (granted(ds, type) ? null : noData(unit, 'noAccess'));

  // Шаги — среднее в день.
  const mk = ds.manualKeys || {};
  out.steps = perWindow((w) => access('Steps', 'steps/day') || dailyAvg(ds.steps, dayKeys(ds.now, w), 'steps/day', SOURCE.hc, w, mk.steps));

  // Активные минуты (пульсовые зоны ≥ 50% HRmax) — 7 дней суммой, 30/90 — в среднем за неделю.
  out.activeMinutes = perWindow((w) => {
    if (!granted(ds, 'HeartRate')) return noData('min/week', 'noAccess');
    const keys = dayKeys(ds.now, w);
    const days = keys.filter((k) => ds.hr[k] && (ds.hr[k].cover >= 60 || ds.hr[k].manual));
    if (!days.length) return noData('min/week');
    const sum = days.reduce((a, k) => a + ds.hr[k].z13 + ds.hr[k].z45, 0);
    const vig = days.reduce((a, k) => a + ds.hr[k].z45, 0);
    const perWeek = w === 7 ? sum : (sum / days.length) * 7;
    const extra = { vigorous: w === 7 ? vig : (vig / days.length) * 7, hrMax: isNum(hrMax(age)) ? Math.round(hrMax(age)) : null };
    return days.length >= MIN_N[w] ? metric(perWeek, 'min/week', SOURCE.calc, days.length, extra) : insufficient('min/week', days.length, perWeek, { source: SOURCE.calc, ...extra });
  });

  // Тренировки — число и минуты за окно.
  out.exercise = perWindow((w) => {
    if (!granted(ds, 'ExerciseSession')) return noData('sessions', 'noAccess');
    const from = now - w * DAY;
    const list = ds.workouts.filter((x) => x.start >= from);
    const nm = list.filter((x) => x.manual).length;
    return metric(list.length, 'sessions', list.length && nm === list.length ? SOURCE.manual : SOURCE.hc, list.length, { minutes: list.reduce((a, x) => a + (x.end - x.start) / 60000, 0), ...(nm && nm < list.length ? { withManual: true } : {}) });
  });

  // Сон — длительность, стадии (минуты и проценты), регулярность (14/30/90).
  out.sleepDuration = perWindow((w) => {
    if (!granted(ds, 'SleepSession')) return noData('h', 'noAccess');
    const map = {};
    for (const k of dayKeys(ds.now, w, true)) if (asleepH(k) >= 3) map[k] = asleepH(k);
    return dailyAvg(map, Object.keys(map), 'h', SOURCE.hc, w, mk.sleep);
  });
  out.sleepStages = perWindow((w) => {
    if (!granted(ds, 'SleepSession')) return noData('min', 'noAccess');
    const nights = dayKeys(ds.now, w, true).map((k) => ds.nights[k]).filter((n) => n && n.stages);
    if (!nights.length) return noData('min');
    const avg = {};
    for (const f of ['deep', 'rem', 'light', 'awake']) avg[f] = mean(nights.map((n) => n.stages[f]));
    const total = avg.deep + avg.rem + avg.light + avg.awake;
    const pct = Object.fromEntries(Object.entries(avg).map(([k, v]) => [k, total ? (v / total) * 100 : 0]));
    const m = Math.min(MIN_N[w], 3);
    return nights.length >= m ? metric(avg, 'min', SOURCE.hc, nights.length, { pct }) : insufficient('min', nights.length, avg, { pct });
  });
  out.sleepRegularity = Object.fromEntries([14, 30, 90].map((w) => {
    if (!granted(ds, 'SleepSession')) return [w, noData('index', 'noAccess')];
    const r = sri(ds, dayKeys(ds.now, w, true));
    if (r.v == null) return [w, noData('index')];
    return [w, r.pairs >= MIN_N[w] - 1 ? metric(r.v, 'index', SOURCE.calc, r.pairs) : insufficient('index', r.pairs, r.v)];
  }));

  // Пульс в покое — записи Health Connect, иначе оценка по пульсу (calculated); ночной пульс.
  out.restingHr = perWindow((w) => {
    const keys = dayKeys(ds.now, w);
    const rec = keys.filter((k) => ds.rhr[k]);
    if (rec.length) return dailyAvg(ds.rhr, keys, 'bpm', SOURCE.hc, w, mk.rhr);
    const est = {};
    for (const k of keys) if (ds.hr[k] && ds.hr[k].rhrEst) est[k] = ds.hr[k].rhrEst;
    if (Object.keys(est).length) return dailyAvg(est, keys, 'bpm', SOURCE.calc, w);
    return noData('bpm', granted(ds, 'RestingHeartRate') || granted(ds, 'HeartRate') ? 'noData' : 'noAccess');
  });
  out.nightHr = perWindow((w) => {
    if (!granted(ds, 'HeartRate') || !granted(ds, 'SleepSession')) return noData('bpm', 'noAccess');
    return dailyAvg(ds.nightHr, dayKeys(ds.now, w, true), 'bpm', SOURCE.calc, w);
  });
  const lastNightKey = Object.keys(ds.nightHr).sort().pop();
  out.nightHrLast = lastNightKey ? metric(ds.nightHr[lastNightKey], 'bpm', SOURCE.calc, 1, { key: lastNightKey }) : noData('bpm');

  // HRV — только относительно своей нормы: медиана за 7 дней против медианы дней 8–60.
  const hrv = ex('HeartRateVariabilityRmssd');
  out.hrv = perWindow((w) => access('HeartRateVariabilityRmssd', 'ms') || instantWindow(hrv, now, w, 'hrv', 'ms', median, MIN_N[w] > 4 ? 7 : 3));
  out.hrvBaseline = (() => {
    if (!granted(ds, 'HeartRateVariabilityRmssd')) return noData('ms', 'noAccess');
    const base = hrv.filter((x) => x.t < now - 7 * DAY && x.t >= now - 60 * DAY && isValid('hrv', x.v));
    if (!base.length) return noData('ms');
    const b = median(base.map((x) => x.v));
    if (base.length < 14) return insufficient('ms', base.length, b);
    const cur = out.hrv[7];
    const dev = cur.status === 'ok' ? ((cur.value - b) / b) * 100 : null;
    return metric(b, 'ms', SOURCE.calc, base.length, { deviationPct: dev, unusual: dev != null && Math.abs(dev) >= 20 });
  })();

  // Давление — последний замер и средние.
  const bp = ex('BloodPressure');
  const bpOk = (x) => isValid('sys', x.v) && isValid('dia', x.dia);
  out.bloodPressure = perWindow((w) => {
    const a = access('BloodPressure', 'mmHg');
    if (a) return a;
    const inWin = bp.filter((x) => x.t >= now - w * DAY);
    if (!inWin.length) return noData('mmHg');
    const ok = inWin.filter(bpOk);
    if (!ok.length) return invalid('mmHg', inWin.length);
    const nm = ok.filter((x) => x.origin === 'manual').length;
    return metric(mean(ok.map((x) => x.v)), 'mmHg', nm === ok.length ? SOURCE.manual : SOURCE.hc, ok.length, { dia: mean(ok.map((x) => x.dia)), ...(nm && nm < ok.length ? { withManual: true } : {}) });
  });
  const bpLast = [...bp].reverse().find(bpOk);
  out.bloodPressureLast = bpLast ? metric(bpLast.v, 'mmHg', bpLast.origin === 'manual' ? SOURCE.manual : SOURCE.hc, 1, { dia: bpLast.dia, t: bpLast.t }) : noData('mmHg', granted(ds, 'BloodPressure') ? 'noData' : 'noAccess');

  // SpO2 и частота дыхания — по ночным замерам (если ночных нет — по всем, с пометкой).
  const nightOrAll = (type, kind, unit) => perWindow((w) => {
    const a = access(type, unit);
    if (a) return a;
    const list = ex(type);
    const night = list.filter((x) => x.night);
    const r = instantWindow(night.length ? night : list, now, w, kind, unit);
    return r.status === 'ok' || r.status === 'insufficient' ? { ...r, nightOnly: night.length > 0 } : r;
  });
  out.spo2 = nightOrAll('OxygenSaturation', 'spo2', '%');
  out.respiratoryRate = nightOrAll('RespiratoryRate', 'resp', 'breaths/min');

  // Вес — средние (7 дней = недельное среднее) и тренд за 90 дней.
  const weight = ex('Weight');
  out.weight = perWindow((w) => access('Weight', 'kg') || instantWindow(weight, now, w, 'weight', 'kg'));
  const wOk = weight.filter((x) => isValid('weight', x.v));
  const wTrend = slope(wOk.filter((x) => x.t >= now - 90 * DAY), 90);
  out.weightTrend90 = wTrend == null ? (wOk.length ? insufficient('kg/90d', wOk.length) : noData('kg/90d')) : metric(wTrend, 'kg/90d', SOURCE.calc, wOk.length);

  // Рост — из Health Connect, иначе из профиля.
  const hLast = [...ex('Height')].reverse().find((x) => isValid('height', x.v));
  out.height = hLast ? metric(hLast.v, 'cm', SOURCE.hc, 1, { t: hLast.t })
    : profile.heightCm ? metric(profile.heightCm, 'cm', SOURCE.manual, 1) : noData('cm');

  // Температура — только отклонение от своей нормы (медиана ранних замеров).
  const temp = ex('BodyTemperature').filter((x) => isValid('temp', x.v));
  out.bodyTempDeviation = (() => {
    if (!granted(ds, 'BodyTemperature')) return noData('°C', 'noAccess');
    if (!temp.length) return noData('°C');
    const last = temp[temp.length - 1];
    const base = temp.slice(0, -1);
    if (base.length < 7) return insufficient('°C', base.length);
    const d = last.v - median(base.map((x) => x.v));
    return metric(d, '°C', SOURCE.calc, base.length, { last: last.v, t: last.t, unusual: Math.abs(d) >= 0.5 });
  })();

  // VO2max — последний достоверный замер и тренд за 30 дней; без замеров — ручной ввод.
  const vo2 = ds.vo2.filter((x) => isValid('vo2', x.v)).sort((a, b) => a.t - b.t);
  const man = profile.manual || {};
  const vLast = vo2[vo2.length - 1];
  out.vo2max = vLast ? metric(vLast.v, 'ml/kg/min', SOURCE.hc, vo2.length, { t: vLast.t })
    : man.vo2max ? metric(man.vo2max, 'ml/kg/min', SOURCE.manual, 1, { t: man.date })
      : noData('ml/kg/min', granted(ds, 'Vo2Max') ? 'noData' : 'noAccess');
  const v30 = vo2.filter((x) => x.t >= now - 30 * DAY);
  out.vo2maxTrend30 = v30.length >= 2 ? metric(v30[v30.length - 1].v - v30[0].v, 'ml/kg/min', SOURCE.calc, v30.length) : noData('ml/kg/min');

  // Полнота данных: сколько основных метрик есть за 30 дней.
  const core = [out.steps[30], out.activeMinutes[30], out.sleepDuration[30], out.restingHr[30], out.hrv[30], out.bloodPressure[30], out.weight[30], out.vo2max];
  out.completeness = { have: core.filter((m) => m.status === 'ok').length, total: core.length };
  return out;
}
