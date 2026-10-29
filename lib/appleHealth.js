// Разбор экспорта «Здоровья» с iPhone (export.xml внутри export.zip). Файл бывает
// огромным, поэтому строки приходят по одной (см. lib/importer.js) и сразу
// сворачиваются в компактные ряды: суммы по дням, поминутный пульс, замеры [время, значение].
// Берём только последние полгода — столько использует приложение.
// Здесь же — превращение сохранённых рядов в записи в формате Health Connect, чтобы
// расчёты (lib/metrics.js) работали с импортом так же, как с Health Connect.

const MIN = 60000;

// Типы Apple Health → наши ключи.
const TYPES = {
  HKQuantityTypeIdentifierStepCount: 'steps',
  HKQuantityTypeIdentifierDistanceWalkingRunning: 'dist',
  HKQuantityTypeIdentifierActiveEnergyBurned: 'kcal',
  HKQuantityTypeIdentifierHeartRate: 'hr',
  HKQuantityTypeIdentifierRestingHeartRate: 'rhr',
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: 'hrv',
  HKQuantityTypeIdentifierBodyMass: 'weight',
  HKQuantityTypeIdentifierHeight: 'height',
  HKQuantityTypeIdentifierLeanBodyMass: 'lbm',
  HKQuantityTypeIdentifierBloodPressureSystolic: 'sys',
  HKQuantityTypeIdentifierBloodPressureDiastolic: 'dia',
  HKQuantityTypeIdentifierOxygenSaturation: 'spo2',
  HKQuantityTypeIdentifierRespiratoryRate: 'resp',
  HKQuantityTypeIdentifierVO2Max: 'vo2',
  HKCategoryTypeIdentifierSleepAnalysis: 'sleep',
  HKCategoryTypeIdentifierMenstrualFlow: 'flow',
};

// Стадии сна Apple → стадии Health Connect (1 бодрствование, 2 сон, 4 лёгкий, 5 глубокий, 6 REM).
const SLEEP = {
  HKCategoryValueSleepAnalysisAwake: 1,
  HKCategoryValueSleepAnalysisAsleep: 2,
  HKCategoryValueSleepAnalysisAsleepUnspecified: 2,
  HKCategoryValueSleepAnalysisAsleepCore: 4,
  HKCategoryValueSleepAnalysisAsleepDeep: 5,
  HKCategoryValueSleepAnalysisAsleepREM: 6,
};

// Тренировки Apple → тип Health Connect (как в lib/manual.js и lib/workouts.js).
const WORKOUTS = {
  HKWorkoutActivityTypeWalking: 79, HKWorkoutActivityTypeHiking: 79,
  HKWorkoutActivityTypeRunning: 56,
  HKWorkoutActivityTypeCycling: 8,
  HKWorkoutActivityTypeTraditionalStrengthTraining: 70, HKWorkoutActivityTypeFunctionalStrengthTraining: 70,
  HKWorkoutActivityTypeSwimming: 74,
  HKWorkoutActivityTypeYoga: 83,
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 36,
  HKWorkoutActivityTypeFlexibility: 71,
};

// «2024-01-31 08:05:00 +0300» → миллисекунды.
export function appleTime(s) {
  if (!s || s.length < 19) return NaN;
  const zone = s.length >= 25 ? s.slice(20, 23) + ':' + s.slice(23, 25) : 'Z';
  return Date.parse(s.slice(0, 10) + 'T' + s.slice(11, 19) + zone);
}

function attr(line, name) {
  const i = line.indexOf(' ' + name + '="');
  if (i < 0) return null;
  const a = i + name.length + 3;
  const b = line.indexOf('"', a);
  return b < 0 ? null : line.slice(a, b);
}

const pad = (n) => (n < 10 ? '0' : '') + n;
const localDay = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function toKg(v, unit) { return unit === 'lb' ? v * 0.45359237 : unit === 'g' ? v / 1000 : v; }
function toCm(v, unit) { return unit === 'm' ? v * 100 : unit === 'in' ? v * 2.54 : unit === 'ft' ? v * 30.48 : v; }
function toMeters(v, unit) { return unit === 'km' ? v * 1000 : unit === 'mi' ? v * 1609.344 : unit === 'ft' ? v * 0.3048 : v; }
function toKcal(v, unit) { return unit === 'kJ' ? v / 4.184 : v; }

// Парсер: line(строка) для каждой строки XML, result() — итоговые ряды.
export function createAppleParser(fromMs) {
  const cutoff = localDay(fromMs);
  const daily = { steps: {}, dist: {}, kcal: {} }; // день → { источник: сумма }
  const hrMin = new Map(); // минута → [сумма, n]
  const pts = { rhr: [], hrv: [], weight: [], height: [], lbm: [], spo2: [], resp: [], vo2: [] };
  const bp = {}; // время → [sys, dia]
  const sleep = []; // [начало, конец, стадия, источник]
  const flow = new Set();
  const workouts = [];
  let lines = 0;
  let records = 0;

  function record(line) {
    const type = attr(line, 'type');
    const key = TYPES[type];
    if (!key) return;
    const start = attr(line, 'startDate');
    if (!start || start.slice(0, 10) < cutoff) return;
    const t = appleTime(start);
    if (!Number.isFinite(t)) return;
    records++;
    const raw = attr(line, 'value');
    const unit = attr(line, 'unit');
    if (key === 'sleep') {
      const st = SLEEP[raw];
      const end = appleTime(attr(line, 'endDate'));
      if (st && end > t) sleep.push([t, end, st, attr(line, 'sourceName') || '']);
      return;
    }
    if (key === 'flow') {
      if (raw && raw !== 'HKCategoryValueMenstrualFlowNone') flow.add(localDay(t));
      return;
    }
    const v = Number(raw);
    if (!Number.isFinite(v)) return;
    if (key === 'steps' || key === 'dist' || key === 'kcal') {
      const val = key === 'dist' ? toMeters(v, unit) : key === 'kcal' ? toKcal(v, unit) : v;
      const day = daily[key][localDay(t)] || (daily[key][localDay(t)] = {});
      const src = attr(line, 'sourceName') || '';
      day[src] = (day[src] || 0) + val;
    } else if (key === 'hr') {
      const m = Math.floor(t / MIN);
      const cur = hrMin.get(m);
      if (cur) { cur[0] += v; cur[1] += 1; } else hrMin.set(m, [v, 1]);
    } else if (key === 'sys' || key === 'dia') {
      const p = bp[start] || (bp[start] = [t, null, null]);
      p[key === 'sys' ? 1 : 2] = v;
    } else if (key === 'weight' || key === 'lbm') pts[key].push([t, toKg(v, unit)]);
    else if (key === 'height') pts.height.push([t, toCm(v, unit)]);
    else if (key === 'spo2') pts.spo2.push([t, v <= 1.5 ? v * 100 : v]);
    else pts[key].push([t, v]);
  }

  function workout(line) {
    const start = attr(line, 'startDate');
    if (!start || start.slice(0, 10) < cutoff) return;
    const a = appleTime(start), b = appleTime(attr(line, 'endDate'));
    if (!(b > a)) return;
    const kind = attr(line, 'workoutActivityType') || '';
    workouts.push([a, b, WORKOUTS[kind] || 0, WORKOUTS[kind] ? '' : kind.replace('HKWorkoutActivityType', '')]);
  }

  function line(l) {
    lines++;
    const i = l.indexOf('<');
    if (i < 0 || i > 8) return;
    if (l.startsWith('<Record ', i)) record(l);
    else if (l.startsWith('<Workout ', i)) workout(l);
  }

  // Сон: сессии из соседних отрезков (разрыв меньше 90 минут); если ночь записали
  // несколько источников (часы и телефон), берём запись подробнее.
  function sleepSessions() {
    const bySrc = {};
    for (const s of sleep) (bySrc[s[3]] || (bySrc[s[3]] = [])).push(s);
    const sessions = [];
    for (const list of Object.values(bySrc)) {
      list.sort((x, y) => x[0] - y[0]);
      let cur = null;
      for (const [a, b, st] of list) {
        if (cur && a - cur.end <= 90 * MIN) {
          cur.end = Math.max(cur.end, b);
          cur.stages.push([a, b, st]);
        } else {
          cur = { start: a, end: b, stages: [[a, b, st]] };
          sessions.push(cur);
        }
      }
    }
    const score = (s) => new Set(s.stages.map((x) => x[2])).size * 1e9 + s.stages.reduce((m, x) => m + (x[2] !== 1 ? x[1] - x[0] : 0), 0);
    sessions.sort((x, y) => score(y) - score(x));
    const kept = [];
    for (const s of sessions) {
      const asleep = s.stages.reduce((m, x) => m + (x[2] !== 1 ? x[1] - x[0] : 0), 0);
      if (asleep < 60 * MIN) continue;
      if (kept.some((k) => s.start < k.end && s.end > k.start)) continue;
      kept.push(s);
    }
    return kept.sort((x, y) => x.start - y.start).map((s) => [s.start, s.end, s.stages]);
  }

  function result() {
    const best = (map) => {
      const out = {};
      for (const [k, srcs] of Object.entries(map)) out[k] = Math.max(...Object.values(srcs));
      return out;
    };
    const byTime = (a) => a.sort((x, y) => x[0] - y[0]);
    const hr = [...hrMin.entries()].sort((x, y) => x[0] - y[0]).map(([m, [s, n]]) => [m * MIN, Math.round((s / n) * 10) / 10]);
    const store = {
      source: 'apple',
      daily: { Steps: best(daily.steps), Distance: best(daily.dist), ActiveCaloriesBurned: best(daily.kcal) },
      HeartRate: hr,
      RestingHeartRate: byTime(pts.rhr),
      HeartRateVariabilityRmssd: byTime(pts.hrv), // в Apple — SDNN; сравнивается только с собственной нормой
      Weight: byTime(pts.weight),
      Height: byTime(pts.height),
      LeanBodyMass: byTime(pts.lbm),
      OxygenSaturation: byTime(pts.spo2),
      RespiratoryRate: byTime(pts.resp),
      Vo2Max: byTime(pts.vo2),
      BloodPressure: byTime(Object.values(bp).filter((p) => p[1] && p[2])),
      SleepSession: sleepSessions(),
      ExerciseSession: byTime(workouts),
      MenstruationFlow: [...flow].sort(),
    };
    store.summary = importSummary(store);
    store.stats = { lines, records };
    return store;
  }

  return { line, result };
}

// Короткая сводка импорта: сколько дней/ночей/замеров.
export function importSummary(s) {
  const days = (o) => Object.keys(o || {}).length;
  const hrDays = new Set((s.HeartRate || []).map(([t]) => localDay(t))).size;
  return {
    steps: days(s.daily && s.daily.Steps),
    sleep: (s.SleepSession || []).length,
    hrDays,
    rhr: (s.RestingHeartRate || []).length,
    hrv: (s.HeartRateVariabilityRmssd || []).length,
    workouts: (s.ExerciseSession || []).length,
    weight: (s.Weight || []).length,
    bp: (s.BloodPressure || []).length,
    spo2: (s.OxygenSaturation || []).length,
    vo2: (s.Vo2Max || []).length,
    cycle: (s.MenstruationFlow || []).length,
  };
}

// Типы Health Connect, которые есть в импорте.
export function importedTypes(s) {
  if (!s) return [];
  const out = [];
  for (const k of ['HeartRate', 'RestingHeartRate', 'HeartRateVariabilityRmssd', 'Weight', 'Height', 'LeanBodyMass', 'OxygenSaturation', 'RespiratoryRate', 'Vo2Max', 'BloodPressure', 'SleepSession', 'ExerciseSession', 'MenstruationFlow']) {
    if (s[k] && s[k].length) out.push(k);
  }
  for (const k of ['Steps', 'Distance', 'ActiveCaloriesBurned']) if (s.daily && Object.keys(s.daily[k] || {}).length) out.push(k);
  return out;
}

// Сохранённые ряды → записи в формате Health Connect за [from, to).
const iso = (t) => new Date(t).toISOString();
export function importedRecords(s, type, from, to) {
  const list = s && s[type];
  if (!list || !list.length) return [];
  const inRange = (t) => t >= from && t < to;
  switch (type) {
    case 'HeartRate': {
      const samples = list.filter(([t]) => inRange(t)).map(([t, v]) => ({ time: iso(t), beatsPerMinute: v }));
      return samples.length ? [{ samples }] : [];
    }
    case 'SleepSession':
      return list.filter(([a]) => inRange(a)).map(([a, b, st]) => ({
        startTime: iso(a), endTime: iso(b), stages: st.map(([x, y, k]) => ({ startTime: iso(x), endTime: iso(y), stage: k })),
      }));
    case 'ExerciseSession':
      return list.filter(([a]) => inRange(a)).map(([a, b, k, title]) => ({ startTime: iso(a), endTime: iso(b), exerciseType: k, title: title || '' }));
    case 'MenstruationFlow':
      return list.map((k) => Date.parse(k + 'T12:00:00')).filter(inRange).map((t) => ({ time: iso(t), flow: 0 }));
    case 'BloodPressure':
      return list.filter(([t]) => inRange(t)).map(([t, a, b]) => ({ time: iso(t), systolic: { inMillimetersOfMercury: a }, diastolic: { inMillimetersOfMercury: b } }));
    default: {
      const make = {
        RestingHeartRate: (v) => ({ beatsPerMinute: v }),
        HeartRateVariabilityRmssd: (v) => ({ heartRateVariabilityMillis: v }),
        Weight: (v) => ({ weight: { inKilograms: v } }),
        Height: (v) => ({ height: { inMeters: v / 100 } }),
        LeanBodyMass: (v) => ({ mass: { inKilograms: v } }),
        OxygenSaturation: (v) => ({ percentage: v }),
        RespiratoryRate: (v) => ({ rate: v }),
        Vo2Max: (v) => ({ vo2MillilitersPerMinuteKilogram: v }),
      }[type];
      if (!make) return [];
      return list.filter(([t]) => inRange(t)).map(([t, v]) => ({ time: iso(t), metadata: { dataOrigin: 'apple-health-import' }, ...make(v) }));
    }
  }
}
