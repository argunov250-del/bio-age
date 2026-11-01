// Сбор данных из Health Connect в суточные ряды и расчёт значений 9 метрик за окно.
import { readAll as readHC, stepsByDay, totalByDay, totalBetween } from './health';
import { importedRecords, importedTypes } from './appleHealth';
import { hrMax, ZONE_BOUNDS } from './formula';
import { isNum } from './num';

export const HISTORY_DAYS = 182;
export const RECENT_DAYS = 30;
export const EXTRA_DAYS = 90; // дополнительные метрики читаем за 90 дней (окна 7/30/90)

const MIN = 60000;
const EPOCH = 5 * MIN; // сон размечается 5-минутными отрезками
const EPOCHS_PER_DAY = 288;
const STRENGTH_TYPES = new Set([13, 70, 81]); // CALISTHENICS, STRENGTH_TRAINING, WEIGHTLIFTING
const HR_GAP_MAX = 5; // мин: сколько «тянем» последнее значение пульса до следующего замера
const HR_DAY_MIN_COVER = 60; // мин пульса в сутки, чтобы день считался днём с данными
const RHR_EST_MIN_COVER = 360; // для оценки пульса покоя нужно ≥ 6 ч пульса за сутки
const NIGHT_MIN_EPOCHS = 36; // ночь засчитывается от 3 ч сна

// Минимум данных, чтобы метрика попала в расчёт.
export const MIN_DAYS = {
  sleepDuration: 5, sleepRegularity: 5, steps: 7, zones13: 7, zones45: 7,
  strength: 7, vo2max: 1, restingHr: 3, leanMass: 1,
};

const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (t) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d;
};
export const addDays = (t, n) => {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d;
};

export function ageAt(birth, now = new Date()) {
  const b = new Date(birth + 'T00:00:00');
  return (now - b) / (365.2425 * 86400000);
}

const tally = (debug, type, records) => {
  const d = debug[type] || (debug[type] = { count: 0, origins: {} });
  for (const r of records) {
    d.count += 1;
    const o = (r.metadata && r.metadata.dataOrigin) || '?';
    d.origins[o] = (d.origins[o] || 0) + 1;
  }
};

function mergeIntervals(list) {
  const s = list.filter((x) => x[1] > x[0]).sort((a, b) => a[0] - b[0]);
  const out = [];
  for (const it of s) {
    const last = out[out.length - 1];
    if (last && it[0] <= last[1]) last[1] = Math.max(last[1], it[1]);
    else out.push([it[0], it[1]]);
  }
  return out;
}

// Ночь (по дню пробуждения): время отхода ко сну и подъёма, стадии — по самой
// подробной записи, если сон пишут несколько приложений.
function noteNight(nights, r) {
  const a = Date.parse(r.startTime), b = Date.parse(r.endTime);
  const key = dayKey(b - 1 + 12 * 3600000); // как у разметки сна: окно 12:00–12:00
  const n = nights[key] || (nights[key] = { start: a, end: b, stages: null, stageCount: 0 });
  n.start = Math.min(n.start, a);
  n.end = Math.max(n.end, b);
  const st = r.stages || [];
  if (st.length > n.stageCount) {
    const m = { light: 0, deep: 0, rem: 0, awake: 0 };
    for (const x of st) {
      const d = (Date.parse(x.endTime) - Date.parse(x.startTime)) / MIN;
      if (x.stage === 5) m.deep += d;
      else if (x.stage === 6) m.rem += d;
      else if (x.stage === 1 || x.stage === 3) m.awake += d;
      else m.light += d;
    }
    n.stages = m;
    n.stageCount = st.length;
  }
}

// Загружает всё нужное за HISTORY_DAYS. granted — Set доступных типов.
// imported — данные, импортированные из файла (lib/appleHealth.js): используются там,
// где Health Connect за этот период ничего не дал.
export async function loadDataset(hcGranted, profile, onProgress = () => {}, imported = null) {
  const now = new Date();
  const start = addDays(startOfDay(now), -HISTORY_DAYS);
  // Доступные типы: разрешённые в Health Connect плюс импортированные.
  const granted = new Set([...hcGranted, ...importedTypes(imported)]);
  // Чтение: сначала Health Connect; если за период он ничего не вернул — импорт.
  const readAll = async (type, from, to, onRecords) => {
    let got = 0;
    if (hcGranted.has(type)) await readHC(type, from, to, (recs) => { got += recs.length; onRecords(recs); });
    if (!got && imported) {
      const recs = importedRecords(imported, type, from.getTime(), to.getTime());
      if (recs.length) onRecords(recs);
    }
  };
  // Суммы по дням (шаги, расстояние, калории): пустые дни дополняются из импорта.
  const fillDaily = (type, map) => {
    const src = imported && imported.daily && imported.daily[type];
    if (!src) return;
    const from = dayKey(start);
    for (const [k, v] of Object.entries(src)) if (k >= from && !map[k] && v > 0) map[k] = v;
  };
  const age = ageAt(profile.birth, now);
  const ds = {
    now, start, granted,
    steps: {}, sleep: {}, hr: {}, rhr: {}, strength: {}, vo2: [], lbm: [],
    nights: {}, hrToday: [], lastHr: null, workouts: [],
    asleep: [], nightHr: {}, extra: {},
    debug: {}, errors: {},
  };
  const step = async (type, label, fn) => {
    if (!granted.has(type)) return;
    onProgress(label);
    try { await fn(); } catch (e) { ds.errors[type] = String((e && e.message) || e); }
  };

  await step('Steps', 'Steps', async () => {
    if (hcGranted.has('Steps')) {
      for (const g of await stepsByDay(start, now)) {
        if (g.steps > 0) ds.steps[dayKey(g.start.getTime() + 12 * 3600000)] = g.steps;
      }
    }
    fillDaily('Steps', ds.steps);
  });

  await step('SleepSession', 'SleepSession', async () => {
    const asleep = [];
    await readAll('SleepSession', start, now, (records) => {
      tally(ds.debug, 'SleepSession', records);
      for (const r of records) {
        const st = r.stages || [];
        noteNight(ds.nights, r);
        const parts = st.length ? st.filter((x) => x.stage !== 1 && x.stage !== 3) : [r];
        for (const p of parts) asleep.push([Date.parse(p.startTime), Date.parse(p.endTime)]);
      }
    });
    // Ночь привязана к дню пробуждения: окно с 12:00 предыдущего дня до 12:00.
    // Объединение интервалов убирает дубли, если сон пишут несколько приложений.
    ds.asleep = mergeIntervals(asleep);
    for (const [a, b] of ds.asleep) {
      for (let m = Math.ceil(a / EPOCH) * EPOCH; m < b; m += EPOCH) {
        const shifted = new Date(m + 12 * 3600000);
        const key = dayKey(shifted);
        const idx = Math.floor((shifted.getHours() * 60 + shifted.getMinutes()) / 5);
        const arr = ds.sleep[key] || (ds.sleep[key] = new Uint8Array(EPOCHS_PER_DAY));
        arr[idx] = 1;
      }
    }
  });

  await step('ExerciseSession', 'ExerciseSession', async () => {
    const list = [];
    await readAll('ExerciseSession', start, now, (records) => {
      tally(ds.debug, 'ExerciseSession', records);
      for (const r of records) {
        const a = Date.parse(r.startTime), b = Date.parse(r.endTime);
        if (STRENGTH_TYPES.has(r.exerciseType)) list.push([a, b]);
        ds.workouts.push({ type: r.exerciseType, start: a, end: b, title: r.title || '', hrSum: 0, hrN: 0, hrMax: 0, load: 0, activeMin: 0 });
      }
    });
    // По возрастанию — для поиска тренировки по минуте пульса.
    ds.workouts.sort((x, y) => x.start - y.start);
    for (const [a, b] of mergeIntervals(list)) {
      const k = dayKey(a);
      ds.strength[k] = (ds.strength[k] || 0) + (b - a) / MIN;
    }
  });

  await step('HeartRate', 'HeartRate', async () => {
    const max = hrMax(age);
    const today = dayKey(now);
    // Читаем неделями, чтобы не держать в памяти полгода замеров.
    for (let from = start; from < now; from = addDays(from, 7)) {
      const to = new Date(Math.min(addDays(from, 7).getTime(), now.getTime()));
      const minutes = new Map();
      await readAll('HeartRate', from, to, (records) => {
        tally(ds.debug, 'HeartRate', records);
        for (const r of records) {
          for (const s of r.samples || []) {
            const k = Math.floor(Date.parse(s.time) / MIN);
            const cur = minutes.get(k);
            if (cur) { cur[0] += s.beatsPerMinute; cur[1] += 1; } else minutes.set(k, [s.beatsPerMinute, 1]);
          }
        }
      });
      const keys = [...minutes.keys()].sort((x, y) => x - y);
      const perDayBpm = {};
      keys.forEach((k, i) => {
        const [sum, n] = minutes.get(k);
        const bpm = sum / n;
        const dur = i + 1 < keys.length ? Math.min(keys[i + 1] - k, HR_GAP_MAX) : 1;
        const day = dayKey(k * MIN);
        const h = ds.hr[day] || (ds.hr[day] = { z13: 0, z45: 0, cover: 0, load: 0 });
        h.cover += dur;
        const pct = max ? bpm / max : 0;
        // Нагрузка (TRIMP по Эдвардсу): минуты в зонах 1–5 × номер зоны.
        const zone = pct >= 0.9 ? 5 : pct >= 0.8 ? 4 : pct >= 0.7 ? 3 : pct >= 0.6 ? 2 : pct >= 0.5 ? 1 : 0;
        h.load += zone * dur;
        const w = workoutAt(ds.workouts, k * MIN);
        if (w) {
          w.hrSum += bpm; w.hrN += 1; w.hrMax = Math.max(w.hrMax, bpm);
          w.load += zone * dur;
          if (zone) w.activeMin += dur;
        }
        if (pct >= ZONE_BOUNDS.z4) h.z45 += dur;
        else if (pct >= ZONE_BOUNDS.z1) h.z13 += dur;
        (perDayBpm[day] || (perDayBpm[day] = [])).push(bpm);
        if (day === today) ds.hrToday.push([k * MIN, bpm]);
        if (inSleep(ds.asleep, k * MIN)) {
          const nk = dayKey(k * MIN + 12 * 3600000);
          const a = ds.nightHr[nk] || (ds.nightHr[nk] = [0, 0]);
          a[0] += bpm; a[1] += 1;
        }
        if (!ds.lastHr || k * MIN > ds.lastHr.t) ds.lastHr = { t: k * MIN, bpm };
      });
      // Запасная оценка пульса покоя: 5-й перцентиль поминутного пульса за сутки.
      for (const [day, list] of Object.entries(perDayBpm)) {
        if (ds.hr[day].cover < RHR_EST_MIN_COVER) continue;
        list.sort((x, y) => x - y);
        ds.hr[day].rhrEst = list[Math.floor(list.length * 0.05)];
      }
      onProgress('HeartRate ' + dayKey(to));
    }
  });

  await step('RestingHeartRate', 'RestingHeartRate', async () => {
    const acc = {};
    await readAll('RestingHeartRate', start, now, (records) => {
      tally(ds.debug, 'RestingHeartRate', records);
      for (const r of records) {
        const k = dayKey(Date.parse(r.time));
        const a = acc[k] || (acc[k] = [0, 0]);
        a[0] += r.beatsPerMinute; a[1] += 1;
      }
    });
    for (const [k, [s, n]] of Object.entries(acc)) ds.rhr[k] = s / n;
  });

  await step('Vo2Max', 'Vo2Max', async () => {
    await readAll('Vo2Max', start, now, (records) => {
      tally(ds.debug, 'Vo2Max', records);
      for (const r of records) ds.vo2.push({ t: Date.parse(r.time), v: r.vo2MillilitersPerMinuteKilogram });
    });
  });

  await step('LeanBodyMass', 'LeanBodyMass', async () => {
    await readAll('LeanBodyMass', start, now, (records) => {
      tally(ds.debug, 'LeanBodyMass', records);
      for (const r of records) ds.lbm.push({ t: Date.parse(r.time), kg: r.mass && r.mass.inKilograms });
    });
  });

  // Дополнительные метрики (окна 7/30/90): мгновенные замеры { t, v } (+ sys/dia у давления).
  const extraStart = addDays(startOfDay(now), -EXTRA_DAYS);
  const EXTRA = {
    HeartRateVariabilityRmssd: (r) => ({ v: r.heartRateVariabilityMillis }),
    BloodPressure: (r) => ({ v: r.systolic && r.systolic.inMillimetersOfMercury, dia: r.diastolic && r.diastolic.inMillimetersOfMercury }),
    OxygenSaturation: (r) => ({ v: r.percentage }),
    Weight: (r) => ({ v: r.weight && r.weight.inKilograms }),
    Height: (r) => ({ v: r.height && r.height.inMeters * 100 }),
    BodyTemperature: (r) => ({ v: r.temperature && r.temperature.inCelsius }),
    RespiratoryRate: (r) => ({ v: r.rate }),
  };
  for (const [type, pick] of Object.entries(EXTRA)) {
    await step(type, type, async () => {
      const list = (ds.extra[type] = []);
      await readAll(type, extraStart, now, (records) => {
        tally(ds.debug, type, records);
        for (const r of records) {
          const t = Date.parse(r.time);
          list.push({ t, night: inSleep(ds.asleep, t), origin: (r.metadata && r.metadata.dataOrigin) || '', ...pick(r) });
        }
      });
      list.sort((a, b) => a.t - b.t);
    });
  }
  // Цикл: месячные целиком (MenstruationPeriod) и отметки по дням (MenstruationFlow).
  ds.cycleRaw = { periods: [], flow: [] };
  await step('MenstruationPeriod', 'MenstruationPeriod', async () => {
    await readAll('MenstruationPeriod', start, now, (records) => {
      tally(ds.debug, 'MenstruationPeriod', records);
      for (const r of records) ds.cycleRaw.periods.push({ start: Date.parse(r.startTime), end: Date.parse(r.endTime) });
    });
  });
  await step('MenstruationFlow', 'MenstruationFlow', async () => {
    await readAll('MenstruationFlow', start, now, (records) => {
      tally(ds.debug, 'MenstruationFlow', records);
      for (const r of records) ds.cycleRaw.flow.push(dayKey(new Date(Date.parse(r.time))));
    });
  });
  ds.distance = {};
  ds.calories = {};
  for (const [type, map] of [['Distance', ds.distance], ['ActiveCaloriesBurned', ds.calories]]) {
    await step(type, type, async () => {
      if (hcGranted.has(type)) {
        for (const g of await totalByDay(type, extraStart, now)) {
          if (g.v > 0) map[dayKey(g.start.getTime() + 12 * 3600000)] = g.v;
        }
      }
      fillDaily(type, map);
    });
  }
  ds.workouts.sort((x, y) => y.start - x.start);
  ds.workouts = ds.workouts.slice(0, 60);
  for (const w of ds.workouts.slice(0, 15)) {
    if (hcGranted.has('Distance')) { try { w.distance = await totalBetween('Distance', new Date(w.start), new Date(w.end)); } catch (e) {} }
    if (hcGranted.has('ActiveCaloriesBurned')) { try { w.calories = await totalBetween('ActiveCaloriesBurned', new Date(w.start), new Date(w.end)); } catch (e) {} }
  }
  ds.nightHr = Object.fromEntries(Object.entries(ds.nightHr).filter(([, [, n]]) => n >= 30).map(([k, [sum, n]]) => [k, sum / n]));

  return ds;
}

// Тренировка, идущая в момент t (список по возрастанию начала).
function workoutAt(list, t) {
  let lo = 0, hi = list.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].start <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  for (let i = idx; i >= 0 && i > idx - 3; i--) if (t < list[i].end) return list[i];
  return null;
}

// Попадает ли момент t в один из интервалов сна (интервалы отсортированы и не пересекаются).
function inSleep(list, t) {
  let lo = 0, hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (t < list[mid][0]) hi = mid - 1;
    else if (t >= list[mid][1]) lo = mid + 1;
    else return true;
  }
  return false;
}

// Среднее; пустой ряд или нечисловой результат (0/0, NaN) — null, не NaN.
export const mean = (a) => {
  if (!a.length) return null;
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  return isNum(m) ? m : null;
};
export const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Значения метрик за последние `days` дней.
// { key: { value, days, ok, note?, extra? } }, ok = достаточно данных.
// Причины отсутствия: note = 'noAccess' | 'noData' | 'few' | 'noHeight'.
export function summarize(ds, profile, days, end = ds.now) {
  const today = startOfDay(end);
  const endT = end.getTime();
  // Суточные итоги — по завершённым дням; сон — включая сегодняшнее утро.
  const dayKeys = [];
  for (let i = days; i >= 1; i--) dayKeys.push(dayKey(addDays(today, -i)));
  const nightKeys = [...dayKeys.slice(1), dayKey(today)];
  const from = addDays(today, -days).getTime();
  const out = {};
  const put = (key, type, value, n, extra) => {
    if (!ds.granted.has(type)) out[key] = { ok: false, note: 'noAccess', days: 0 };
    else if (!n || !isNum(value)) out[key] = { ok: false, note: 'noData', days: 0 };
    else if (n < MIN_DAYS[key]) out[key] = { ok: false, note: 'few', value, days: n, ...extra };
    else out[key] = { ok: true, value, days: n, ...extra };
  };

  const nights = nightKeys.filter((k) => ds.sleep[k] && ds.sleep[k].reduce((s, x) => s + x, 0) >= NIGHT_MIN_EPOCHS);
  put('sleepDuration', 'SleepSession', nights.length ? mean(nights.map((k) => ds.sleep[k].reduce((s, x) => s + x, 0) * 5 / 60)) : null, nights.length);

  // Индекс регулярности сна (SRI, Phillips 2017): вероятность совпадения
  // состояния сон/бодрствование в одно и то же время двух соседних суток.
  let same = 0, total = 0, pairs = 0;
  for (let i = 1; i < nightKeys.length; i++) {
    const a = ds.sleep[nightKeys[i - 1]], b = ds.sleep[nightKeys[i]];
    if (!a || !b || !nights.includes(nightKeys[i - 1]) || !nights.includes(nightKeys[i])) continue;
    pairs += 1;
    for (let e = 0; e < EPOCHS_PER_DAY; e++) { total += 1; if (a[e] === b[e]) same += 1; }
  }
  put('sleepRegularity', 'SleepSession', total ? 200 * same / total - 100 : null, pairs);

  const stepDays = dayKeys.filter((k) => ds.steps[k]);
  put('steps', 'Steps', stepDays.length ? mean(stepDays.map((k) => ds.steps[k])) : null, stepDays.length);

  // Минуты в неделю: делим на число дней от первого дня с пульсом в окне до конца окна.
  const hrDays = dayKeys.filter((k) => ds.hr[k] && ds.hr[k].cover >= HR_DAY_MIN_COVER);
  const firstHr = dayKeys.findIndex((k) => ds.hr[k]);
  const hrSpan = firstHr < 0 ? 0 : dayKeys.length - firstHr;
  const weekly = (f) => (hrSpan ? dayKeys.reduce((s, k) => s + (ds.hr[k] ? ds.hr[k][f] : 0), 0) / hrSpan * 7 : null);
  put('zones13', 'HeartRate', weekly('z13'), hrDays.length);
  put('zones45', 'HeartRate', weekly('z45'), hrDays.length);

  // Силовые: период — от первого дня с любыми данными о движении в окне.
  const firstAny = dayKeys.findIndex((k) => ds.steps[k] || ds.hr[k] || ds.strength[k]);
  const span = firstAny < 0 ? 0 : dayKeys.length - firstAny;
  const sessions = dayKeys.filter((k) => ds.strength[k]).length;
  put('strength', 'ExerciseSession', span ? dayKeys.reduce((s, k) => s + (ds.strength[k] || 0), 0) / span * 7 : null, span, { sessions });

  let rhrDays = dayKeys.filter((k) => ds.rhr[k]);
  if (rhrDays.length >= MIN_DAYS.restingHr || !ds.granted.has('HeartRate')) {
    put('restingHr', 'RestingHeartRate', rhrDays.length ? mean(rhrDays.map((k) => ds.rhr[k])) : null, rhrDays.length);
  } else {
    rhrDays = dayKeys.filter((k) => ds.hr[k] && ds.hr[k].rhrEst);
    put('restingHr', 'HeartRate', rhrDays.length ? mean(rhrDays.map((k) => ds.hr[k].rhrEst)) : null, rhrDays.length, { estimated: true });
  }

  // VO2max и безжировая масса меняются медленно: медиана за окно, а если в окне
  // замеров нет — последний замер за полгода.
  const slow = (list, field) => {
    const inWin = list.filter((x) => x.t >= from && x.t <= endT && x[field] > 0);
    if (inWin.length) return { value: median(inWin.map((x) => x[field])), n: inWin.length };
    const all = list.filter((x) => x.t <= endT && x[field] > 0).sort((a, b) => b.t - a.t);
    return all.length ? { value: all[0][field], n: 1, last: true } : { value: null, n: 0 };
  };
  const vo2 = slow(ds.vo2, 'v');
  put('vo2max', 'Vo2Max', vo2.value, vo2.n, { last: vo2.last });

  const lbm = slow(ds.lbm, 'kg');
  const h = Number(profile.heightCm) / 100;
  if (lbm.value && !(h > 0)) out.leanMass = { ok: false, note: 'noHeight', days: lbm.n };
  else put('leanMass', 'LeanBodyMass', lbm.value ? lbm.value / (h * h) : null, lbm.n, { kg: lbm.value, last: lbm.last });

  // Ручной ввод из профиля — только если в Health Connect для метрики данных не хватило.
  const m = profile.manual || {};
  const manual = (key, value, extra) => {
    if (out[key].ok || !(value > 0)) return;
    out[key] = { ok: true, value, days: 1, manual: true, manualDate: m.date, ...extra };
  };
  manual('restingHr', m.restingHr);
  manual('vo2max', m.vo2max);
  if (m.leanMassKg > 0 && !out.leanMass.ok) {
    if (h > 0) manual('leanMass', m.leanMassKg / (h * h), { kg: m.leanMassKg });
    else out.leanMass = { ok: false, note: 'noHeight', days: 0 };
  }

  return out;
}

// Ряды для графиков и карточек главного экрана. Всё небольшое — сохраняется вместе с расчётом.
// Ряды для графиков и подробных экранов (90 дней) — небольшие, сохраняются вместе с расчётом.
export const SERIES_DAYS = 90;
export function series(ds) {
  const today = startOfDay(ds.now);
  const keys = [];
  for (let i = SERIES_DAYS - 1; i >= 0; i--) keys.push(dayKey(addDays(today, -i)));
  const asleepH = (k) => (ds.sleep[k] ? ds.sleep[k].reduce((a, x) => a + x, 0) * 5 / 60 : 0);
  // Пульс за сегодня — средние по 10 минут.
  const buckets = new Map();
  for (const [t, bpm] of ds.hrToday) {
    const b = Math.floor(t / (10 * MIN)) * 10 * MIN;
    const cur = buckets.get(b) || [0, 0];
    cur[0] += bpm; cur[1] += 1;
    buckets.set(b, cur);
  }
  const lastKey = [...keys].reverse().find((k) => ds.nights[k] && asleepH(k) >= 1);
  const last = lastKey ? ds.nights[lastKey] : null;
  const daily = (f) => keys.map((k) => ({ key: k, v: f(k) || 0 }));
  const ex = (type) => (ds.extra[type] || []).map((x) => (x.dia != null ? { t: x.t, v: x.v, dia: x.dia } : { t: x.t, v: x.v }));
  return {
    steps: daily((k) => ds.steps[k]),
    sleep: daily(asleepH),
    rhr: daily((k) => ds.rhr[k] || (ds.hr[k] && ds.hr[k].rhrEst)),
    nightHr: daily((k) => ds.nightHr[k]),
    activeMin: daily((k) => ds.hr[k] && ds.hr[k].z13 + ds.hr[k].z45),
    load: daily((k) => ds.hr[k] && ds.hr[k].load),
    distance: daily((k) => ds.distance[k]),
    calories: daily((k) => ds.calories[k]),
    stages: keys.map((k) => (ds.nights[k] && ds.nights[k].stages ? { key: k, ...ds.nights[k].stages } : null)).filter(Boolean),
    hrv: ex('HeartRateVariabilityRmssd'),
    bp: ex('BloodPressure'),
    weight: ex('Weight'),
    vo2: ds.vo2.map((x) => ({ t: x.t, v: x.v })),
    hrToday: [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([t, [sum, n]]) => ({ t, v: sum / n })),
    lastHr: ds.lastHr,
    workouts: ds.workouts.map((w) => ({
      type: w.type, start: w.start, end: w.end, title: w.title, load: Math.round(w.load), activeMin: Math.round(w.activeMin),
      hrAvg: w.hrN ? w.hrSum / w.hrN : null, hrMax: w.hrN ? w.hrMax : null, distance: w.distance, calories: w.calories,
      manual: !!w.manual, intensity: w.intensity,
    })),
    lastNight: last ? { key: lastKey, start: last.start, end: last.end, hours: asleepH(lastKey), stages: last.stages } : null,
    granted: [...ds.granted],
  };
}
