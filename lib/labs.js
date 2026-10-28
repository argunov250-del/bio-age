// Лабораторные анализы: базовые единицы (в них хранится значение и считается PhenoAge),
// альтернативные единицы для ввода и правдоподобные диапазоны для проверки ввода.
// Диапазоны — не нормы, а границы, за которыми значение почти наверняка ошибка ввода.
import { tr } from './i18n';

// k: base = alt × k
export const LABS = {
  albumin: { name: () => tr('Альбумин'), base: 'г/л', alt: { 'г/дл': 10 }, range: [20, 60] },
  creatinine: { name: () => tr('Креатинин'), base: 'мкмоль/л', alt: { 'мг/дл': 88.4 }, range: [20, 1000] },
  fasting_glucose: { name: () => tr('Глюкоза натощак'), base: 'ммоль/л', alt: { 'мг/дл': 1 / 18.016 }, range: [2, 30] },
  crp: { name: () => tr('С-реактивный белок (СРБ)'), base: 'мг/л', alt: { 'мг/дл': 10 }, range: [0.01, 300], temporary: 10 },
  lymphocyte_percent: { name: () => tr('Лимфоциты'), base: '%', alt: {}, range: [1, 80] },
  mcv: { name: () => tr('Средний объём эритроцита (MCV)'), base: 'фл', alt: {}, range: [50, 130] },
  rdw: { name: () => tr('Ширина распределения эритроцитов (RDW)'), base: '%', alt: {}, range: [8, 30] },
  alkaline_phosphatase: { name: () => tr('Щелочная фосфатаза (ЩФ)'), base: 'Ед/л', alt: {}, range: [10, 1000] },
  white_blood_cell_count: { name: () => tr('Лейкоциты'), base: '×10⁹/л', alt: { '×10³/мкл': 1 }, range: [1, 50], temporary: 11 },

  hba1c: { name: () => tr('Гликированный гемоглобин (HbA1c)'), base: '%', alt: {}, range: [3, 20] },
  total_cholesterol: { name: () => tr('Общий холестерин'), base: 'ммоль/л', alt: { 'мг/дл': 1 / 38.67 }, range: [1.5, 15] },
  ldl_cholesterol: { name: () => tr('ЛПНП'), base: 'ммоль/л', alt: { 'мг/дл': 1 / 38.67 }, range: [0.3, 12] },
  hdl_cholesterol: { name: () => tr('ЛПВП'), base: 'ммоль/л', alt: { 'мг/дл': 1 / 38.67 }, range: [0.2, 5] },
  triglycerides: { name: () => tr('Триглицериды'), base: 'ммоль/л', alt: { 'мг/дл': 1 / 88.57 }, range: [0.2, 30] },
  egfr: { name: () => tr('СКФ (eGFR)'), base: 'мл/мин/1,73м²', alt: {}, range: [5, 150] },
  alt: { name: () => 'АЛТ', base: 'Ед/л', alt: {}, range: [2, 1000] },
  ast: { name: () => 'АСТ', base: 'Ед/л', alt: {}, range: [2, 1000] },
  ggt: { name: () => tr('ГГТ'), base: 'Ед/л', alt: {}, range: [2, 1500] },
  ferritin: { name: () => tr('Ферритин'), base: 'нг/мл', alt: { 'мкг/л': 1 }, range: [1, 3000] },
  vitamin_d: { name: () => tr('Витамин D (25-OH)'), base: 'нг/мл', alt: { 'нмоль/л': 1 / 2.496 }, range: [2, 250] },
  tsh: { name: () => tr('ТТГ'), base: 'мЕд/л', alt: {}, range: [0.01, 100] },
};

export const PHENO_REQUIRED = ['albumin', 'creatinine', 'fasting_glucose', 'crp', 'lymphocyte_percent', 'mcv', 'rdw', 'alkaline_phosphatase', 'white_blood_cell_count'];
export const EXTENDED = ['hba1c', 'total_cholesterol', 'ldl_cholesterol', 'hdl_cholesterol', 'triglycerides', 'egfr', 'alt', 'ast', 'ggt', 'ferritin', 'vitamin_d', 'tsh'];

export const unitsFor = (test) => [LABS[test].base, ...Object.keys(LABS[test].alt)];

export function toBase(test, value, unit) {
  const l = LABS[test];
  return unit === l.base ? value : value * l.alt[unit];
}

export function fromBase(test, value, unit) {
  const l = LABS[test];
  return unit === l.base ? value : value / l.alt[unit];
}

// Проверка введённого значения: 'ok' | 'invalid'. Значение не обнуляется, а помечается.
export function checkValue(test, base) {
  const [lo, hi] = LABS[test].range;
  return typeof base === 'number' && isFinite(base) && base >= lo && base <= hi ? 'ok' : 'invalid';
}

// Признаки временного повышения (инфекция, воспаление, нагрузка).
export function temporaryFlags(values) {
  return Object.entries(values)
    .filter(([k, v]) => LABS[k] && LABS[k].temporary && v && v.status === 'ok' && v.base > LABS[k].temporary)
    .map(([k]) => k);
}
