// Названия метрик и форматирование чисел для экранов.
import { tr, RU } from './i18n';
import { isNum } from './num';

export const fmt = (x, digits = 0) => {
  const n = typeof x === 'string' && x.trim() !== '' ? Number(x) : x;
  if (!isNum(n)) return '—';
  return n.toLocaleString(RU ? 'ru-RU' : 'en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

export const signed = (x, digits = 1) => !isNum(x) ? '—' : (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(Math.abs(x), digits);

export const METRIC_INFO = {
  sleepDuration: { name: () => tr('Длительность сна'), unit: () => tr('ч'), digits: 1 },
  sleepRegularity: { name: () => tr('Регулярность сна (SRI)'), unit: () => '', digits: 0 },
  steps: { name: () => tr('Шаги в день'), unit: () => '', digits: 0 },
  zones13: { name: () => tr('Пульсовые зоны 1–3'), unit: () => tr('мин/нед'), digits: 0 },
  zones45: { name: () => tr('Пульсовые зоны 4–5'), unit: () => tr('мин/нед'), digits: 0 },
  strength: { name: () => tr('Силовые тренировки'), unit: () => tr('мин/нед'), digits: 0 },
  vo2max: { name: () => 'VO2max', unit: () => tr('мл/кг/мин'), digits: 1 },
  restingHr: { name: () => tr('Пульс в покое'), unit: () => tr('уд/мин'), digits: 0 },
  leanMass: { name: () => tr('Безжировая масса (индекс)'), unit: () => tr('кг/м²'), digits: 1 },
};

export const valueText = (key, v) => {
  const i = METRIC_INFO[key];
  const u = i.unit();
  if (!isNum(v)) return '—';
  return fmt(v, i.digits) + (u ? ' ' + u : '');
};

export const targetText = (key, t) => {
  const i = METRIC_INFO[key];
  const u = i.unit() ? ' ' + i.unit() : '';
  if (!t || (!isNum(t.lo) && !isNum(t.hi))) return '—';
  if (isNum(t.lo) && isNum(t.hi)) return `${fmt(t.lo, i.digits)}–${fmt(t.hi, i.digits)}${u}`;
  if (isNum(t.lo)) return `≥ ${fmt(t.lo, i.digits)}${u}`;
  return `≤ ${fmt(t.hi, i.digits)}${u}`;
};

export const NOTE_TEXT = {
  noAccess: () => tr('нет доступа'),
  noData: () => tr('нет данных'),
  few: () => tr('мало данных'),
  noHeight: () => tr('не указан рост'),
};
