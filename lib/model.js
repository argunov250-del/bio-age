// Единый вид метрики: значение, единица, источник, состояние, окно, сколько данных.
// status: ok — можно показывать; no_data — данных нет; insufficient — мало данных;
// invalid — значения вне правдоподобного диапазона (не обнуляем, а помечаем).
export const SOURCE = {
  hc: 'health_connect',
  manual: 'manual_input',
  calc: 'calculated',
};

export const metric = (value, unit, source, n, extra) => ({ status: 'ok', value, unit, source, n, ...extra });
export const noData = (unit, note = 'noData') => ({ status: 'no_data', value: null, unit, n: 0, note });
export const insufficient = (unit, n, value = null, extra) => ({ status: 'insufficient', value, unit, n, ...extra });
export const invalid = (unit, n) => ({ status: 'invalid', value: null, unit, n });

// Правдоподобные диапазоны: всё, что вне них, считается ошибкой измерения.
export const VALID = {
  hr: [25, 230],
  rhr: [25, 130],
  hrv: [3, 300],
  sys: [60, 260],
  dia: [30, 160],
  spo2: [70, 100],
  weight: [25, 350],
  height: [100, 250],
  temp: [33, 42],
  resp: [4, 60],
  vo2: [10, 95],
};

export const isValid = (kind, v) => typeof v === 'number' && isFinite(v) && v >= VALID[kind][0] && v <= VALID[kind][1];
