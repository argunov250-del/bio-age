// Clinical BioAge — Phenotypic Age (PhenoAge) по 9 анализам крови и возрасту.
// Levine ME et al. An epigenetic biomarker of aging for lifespan and healthspan.
// Aging (Albany NY) 2018;10(4):573–591. Коэффициенты — из таблицы модели
// (Gompertz, NHANES III). Единицы: альбумин г/л, креатинин мкмоль/л, глюкоза ммоль/л,
// СРБ мг/дл (натуральный логарифм), лимфоциты %, MCV фл, RDW %, ЩФ Ед/л, лейкоциты 10³/мкл.
// Не медицинский показатель: расчёт только при полном наборе анализов, без подстановок.
import { PHENO_REQUIRED, checkValue } from './labs';

export const PHENOAGE_VERSION = 'phenoage-levine2018-v1';
export const MIN_AGE = 18;
export const RETEST_DAYS = [28, 56];

const B = {
  intercept: -19.907,
  albumin: -0.0336,
  creatinine: 0.0095,
  fasting_glucose: 0.1953,
  crp: 0.0954, // × ln(СРБ, мг/дл)
  lymphocyte_percent: -0.0120,
  mcv: 0.0268,
  rdw: 0.3306,
  alkaline_phosphatase: 0.00188,
  white_blood_cell_count: 0.0554,
  age: 0.0804,
};
const GAMMA = 0.0076927;

// values: { test: { base, status } } (база — единицы из labs.js; СРБ в мг/л).
// → { status: 'ok' | 'missing' | 'invalid' | 'too_young', phenoAge, delta, missing[], invalid[] }
export function phenoAge(values, age) {
  const missing = PHENO_REQUIRED.filter((k) => !values[k] || values[k].base == null);
  if (missing.length) return { status: 'missing', missing };
  const bad = PHENO_REQUIRED.filter((k) => checkValue(k, values[k].base) !== 'ok');
  if (bad.length) return { status: 'invalid', invalid: bad };
  if (!(age >= MIN_AGE)) return { status: 'too_young' };
  const v = (k) => values[k].base;
  const xb = B.intercept
    + B.albumin * v('albumin')
    + B.creatinine * v('creatinine')
    + B.fasting_glucose * v('fasting_glucose')
    + B.crp * Math.log(v('crp') / 10)
    + B.lymphocyte_percent * v('lymphocyte_percent')
    + B.mcv * v('mcv')
    + B.rdw * v('rdw')
    + B.alkaline_phosphatase * v('alkaline_phosphatase')
    + B.white_blood_cell_count * v('white_blood_cell_count')
    + B.age * age;
  const mortality = 1 - Math.exp((-Math.exp(xb) * (Math.exp(120 * GAMMA) - 1)) / GAMMA);
  const pa = 141.50225 + Math.log(-0.00553 * Math.log(1 - mortality)) / 0.090165;
  return { status: 'ok', phenoAge: pa, delta: pa - age, mortality10y: mortality };
}
