// Формула биологического возраста — все коэффициенты в одном месте.
//
// Принцип: для каждой метрики берём из опубликованных исследований отношение
// рисков смертности от всех причин (hazard ratio, HR) относительно «типичного»
// значения и переводим его в годы. Риск смерти взрослого человека растёт
// примерно на 9–10% за каждый год жизни (закон Гомпертца), поэтому
// HR = 1.10 ≈ +1 год, HR = 0.91 ≈ −1 год: годы = ln(HR) / ln(1.10).
//
// Числа ниже — округлённые значения из указанных работ (точки кривых взяты по
// группам/квантилям, между точками — линейная интерполяция ln(HR)). Это
// прототип: не медицинский показатель, только для информации.

import { isNum } from './num';

const LN_PER_YEAR = Math.log(1.10);
// Неверный HR (NaN, ≤ 0, не число) — поправки нет: 0 лет.
export const yearsFromHR = (hr) => (isNum(hr) && hr > 0 ? Math.log(hr) / LN_PER_YEAR : 0);

// Перекрытие метрик: шаги, пульсовые зоны, VO2max и пульс покоя во многом
// измеряют одно и то же (физическую форму), поэтому внутри группы самая
// большая поправка учитывается полностью, вторая — с весом 1/2, третья — 1/3…
// (отдельно для прибавок и для убавок). Итог дополнительно ограничен.
export const GROUPS = {
  sleep: ['sleepDuration', 'sleepRegularity'],
  fitness: ['steps', 'zones13', 'zones45', 'strength', 'vo2max', 'restingHr'],
  body: ['leanMass'],
};
export const TOTAL_CAP = { min: -10, max: 15 };

// Темп старения: если привычки последних 30 дней сохранятся, поправка
// сместится от значения за 6 месяцев к значению за 30 дней примерно за
// полгода. Темп = 1 + (поправка30 − поправка180) / PACE_HORIZON_YEARS,
// т.е. сколько «биологических лет» проходит за календарный год.
export const PACE_HORIZON_YEARS = 0.5;
export const PACE_LIMITS = { min: -1, max: 3 };

// Максимальный пульс для зон: Tanaka H, Monahan KD, Seals DR.
// J Am Coll Cardiol 2001;37:153–156. HRmax = 208 − 0.7 × возраст.
// Нет возраста (не число) — null.
export const hrMax = (age) => (isNum(age) ? 208 - 0.7 * age : null);
// Зоны в % от HRmax: 1 = 50–60, 2 = 60–70, 3 = 70–80, 4 = 80–90, 5 = 90–100.
export const ZONE_BOUNDS = { z1: 0.5, z4: 0.8 };

// Интерполяция ln(HR) по точкам [[значение, HR], …], за краями — без экстраполяции.
function curve(points, x) {
  if (!isNum(x)) return NaN;
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, h1] = points[i];
    if (x <= x1) {
      const [x0, h0] = points[i - 1];
      const f = (x - x0) / (x1 - x0);
      return Math.exp(Math.log(h0) + f * (Math.log(h1) - Math.log(h0)));
    }
  }
  return 1;
}

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Медиана VO2max (мл/кг/мин) по возрасту и полу, тест на беговой дорожке.
// Kaminsky LA et al. Reference standards for cardiorespiratory fitness
// (FRIEND registry). Mayo Clin Proc 2015;90:1515–1523. Значения ≈ 50-й перцентиль.
const VO2_MEDIAN = {
  m: [[25, 48.0], [35, 42.4], [45, 37.8], [55, 32.6], [65, 28.2], [75, 24.4]],
  f: [[25, 37.6], [35, 30.2], [45, 26.7], [55, 23.4], [65, 20.0], [75, 18.3]],
};
function vo2Median(age, sex) {
  if (!isNum(age)) return NaN;
  const t = VO2_MEDIAN[sex === 'f' ? 'f' : 'm'];
  if (age <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) {
    if (age <= t[i][0]) {
      const f = (age - t[i - 1][0]) / (t[i][0] - t[i - 1][0]);
      return t[i - 1][1] + f * (t[i][1] - t[i - 1][1]);
    }
  }
  return t[t.length - 1][1];
}

// Медиана индекса безжировой массы (кг/м²): Schutz Y, Kyle UU, Pichard C.
// Fat-free mass index and fat mass index percentiles in Caucasians aged 18–98 y.
// Int J Obes 2002;26:953–960 (мужчины ≈ 18.9, женщины ≈ 15.4).
const FFMI = { m: { low: 16.0, mid: 18.9, high: 21.0 }, f: { low: 13.0, mid: 15.4, high: 17.5 } };

// Описание метрик. hr(value, p) → hazard ratio, p = { age, sex }.
// target(p) → { lo, hi } — цель (hi = null: «не меньше lo», lo = null: «не больше hi»).
export const METRICS = [
  {
    // Yin J et al. Relationship of sleep duration with all-cause mortality and
    // cardiovascular events: a systematic review and dose-response meta-analysis.
    // J Am Heart Assoc 2017;6:e005947. Каждый час короче 7 ч: RR 1.06;
    // каждый час длиннее 8 ч: RR 1.13.
    key: 'sleepDuration',
    hr: (h) => (!isNum(h) ? NaN : h < 7 ? Math.pow(1.06, 7 - Math.max(h, 4)) : h > 8 ? Math.pow(1.13, Math.min(h, 11) - 8) : 1),
    target: () => ({ lo: 7, hi: 8 }),
  },
  {
    // Windred DP et al. Sleep regularity is a stronger predictor of mortality
    // risk than sleep duration. Sleep 2024;47:zsad253 (UK Biobank, индекс
    // регулярности сна SRI): SRI ≈ 41 → HR ≈ 1.53, медиана ≈ 71 → 1.0, SRI ≈ 87 → ≈ 0.90.
    key: 'sleepRegularity',
    hr: (sri) => curve([[41, 1.53], [71, 1.0], [87, 0.90]], sri),
    target: () => ({ lo: 87, hi: null }),
  },
  {
    // Paluch AE et al. Daily steps and all-cause mortality: a meta-analysis of
    // 15 international cohorts. Lancet Public Health 2022;7:e219–e228.
    // Квартили: 3553 → 1.0, 5801 → 0.60, 7842 → 0.55, 10901 → 0.47;
    // здесь пересчитано относительно 3-го квартиля (≈ 7800 шагов = HR 1).
    key: 'steps',
    hr: (n) => curve([[3553, 1.82], [5801, 1.09], [7842, 1.0], [10901, 0.855]], n),
    target: () => ({ lo: 10900, hi: null }),
  },
  {
    // Arem H et al. Leisure time physical activity and mortality: a detailed
    // pooled analysis of the dose-response relationship. JAMA Intern Med
    // 2015;175:959–967. 0 → 1.0, < 1× рекомендации → 0.80, 1–2× → 0.69,
    // 2–3× → 0.63, 3–5× → 0.61 (рекомендация 150 мин/нед). Относительно 150–300 мин.
    key: 'zones13',
    hr: (min) => curve([[0, 1.45], [75, 1.16], [225, 1.0], [375, 0.913], [600, 0.884]], min),
    target: () => ({ lo: 300, hi: null }),
  },
  {
    // Lee DH et al. Long-term leisure-time physical activity intensity and
    // all-cause and cause-specific mortality. Circulation 2022;146:523–534.
    // Интенсивная нагрузка 75–149 мин/нед ≈ −13%, 150–299 мин/нед ≈ −19…−21%,
    // выше — без заметной прибавки. Отсутствие нагрузки = HR 1 (без штрафа).
    key: 'zones45',
    hr: (min) => curve([[0, 1.0], [75, 0.87], [150, 0.81], [300, 0.79]], min),
    target: () => ({ lo: 150, hi: null }),
  },
  {
    // Momma H et al. Muscle-strengthening activities are associated with lower
    // risk and mortality in major non-communicable diseases: a systematic review
    // and meta-analysis. Br J Sports Med 2022;56:755–763. J-образная связь:
    // максимум ≈ −10…−17% при 30–60 мин/нед, после ~140 мин эффект слабеет.
    key: 'strength',
    hr: (min) => curve([[0, 1.0], [30, 0.87], [60, 0.86], [140, 0.95]], min),
    target: () => ({ lo: 30, hi: 60 }),
  },
  {
    // Kodama S et al. Cardiorespiratory fitness as a quantitative predictor of
    // all-cause mortality and cardiovascular events. JAMA 2009;301:2024–2035:
    // +1 MET (3.5 мл/кг/мин) → HR 0.87. Отсчёт от медианы для возраста и пола
    // (FRIEND), учёт в пределах ±3 MET. Mandsager K et al. JAMA Netw Open
    // 2018;1:e183605 — верхней границы пользы не найдено.
    key: 'vo2max',
    hr: (v, p) => {
      const ref = vo2Median(p.age, p.sex);
      return Math.pow(0.87, clamp(v - ref, -10.5, 10.5) / 3.5);
    },
    target: (p) => {
      const ref = vo2Median(p.age, p.sex);
      return { lo: isNum(ref) ? Math.round(ref + 7) : null, hi: null };
    },
  },
  {
    // Zhang D, Shen X, Qi X. Resting heart rate and all-cause and cardiovascular
    // mortality in the general population: a meta-analysis. CMAJ 2016;188:E53–E63:
    // +10 уд/мин → HR 1.09. Отсчёт от 65 уд/мин, учёт в диапазоне 45–100.
    key: 'restingHr',
    hr: (bpm) => !isNum(bpm) ? NaN : Math.pow(1.09, (clamp(bpm, 45, 100) - 65) / 10),
    target: () => ({ lo: null, hi: 55 }),
  },
  {
    // Srikanthan P, Karlamangla AS. Muscle mass index as a predictor of
    // longevity in older adults. Am J Med 2014;127:547–553: верхний квартиль
    // индекса мышечной массы против нижнего — HR ≈ 0.80. Индекс = безжировая
    // масса / рост², шкала по Schutz 2002 (см. FFMI выше).
    key: 'leanMass',
    hr: (lmi, p) => {
      const n = FFMI[p.sex === 'f' ? 'f' : 'm'];
      return curve([[n.low, 1.25], [n.mid, 1.0], [n.high, 0.80]], lmi);
    },
    target: (p) => ({ lo: FFMI[p.sex === 'f' ? 'f' : 'm'].high, hi: null }),
  },
];

// Метрика есть и ей можно пользоваться: ok и конечное число.
const hasValue = (v) => !!v && !!v.ok && isNum(v.value);

const BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]));

// Поправки по всем метрикам. values: { key: { value, days, ok } }.
// Возвращает { items: { key: { hr, raw, years } }, total }.
export function corrections(values, p) {
  const items = {};
  for (const m of METRICS) {
    const v = values[m.key];
    if (!hasValue(v)) continue;
    const hr = m.hr(v.value, p || {});
    // Нечисловой результат (NaN, Infinity) — как отсутствие метрики.
    if (!isNum(hr) || hr <= 0) continue;
    items[m.key] = { hr, raw: yearsFromHR(hr), years: 0 };
  }
  for (const keys of Object.values(GROUPS)) {
    const present = keys.filter((k) => items[k]);
    for (const sign of [1, -1]) {
      present
        .filter((k) => Math.sign(items[k].raw) === sign)
        .sort((a, b) => Math.abs(items[b].raw) - Math.abs(items[a].raw))
        .forEach((k, i) => { items[k].years = items[k].raw / (i + 1); });
    }
  }
  const sum = Object.values(items).reduce((s, it) => s + it.years, 0);
  return { items, total: clamp(sum, TOTAL_CAP.min, TOTAL_CAP.max) };
}

// Темп старения по поправкам за 6 месяцев и за 30 дней. Берём только метрики,
// которые есть в обоих окнах, чтобы сравнение было честным.
export function pace(values180, values30, p) {
  const common = {};
  const recent = {};
  for (const m of METRICS) {
    if (hasValue(values180[m.key]) && hasValue(values30[m.key])) {
      common[m.key] = values180[m.key];
      recent[m.key] = values30[m.key];
    }
  }
  if (!Object.keys(common).length) return null;
  const d = corrections(recent, p).total - corrections(common, p).total;
  return clamp(1 + d / PACE_HORIZON_YEARS, PACE_LIMITS.min, PACE_LIMITS.max);
}

export const metricTarget = (key, p) => BY_KEY[key].target(p);
