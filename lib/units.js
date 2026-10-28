// Единицы и конвертация. Внутри всё хранится в метрических единицах (кг, см, °C,
// и для анализов — единицы формулы PhenoAge); пересчёт — только для показа и ввода.
export const MASS = {
  kg: { label: 'кг', from: (kg) => kg, to: (v) => v },
  lb: { label: 'lb', from: (kg) => kg * 2.2046226, to: (v) => v / 2.2046226 },
};

export const TEMP = {
  c: { label: '°C', from: (c) => c, to: (v) => v, delta: (d) => d },
  f: { label: '°F', from: (c) => c * 9 / 5 + 32, to: (v) => (v - 32) * 5 / 9, delta: (d) => d * 9 / 5 },
};

// Анализы: базовая единица → альтернативная (множитель: base = alt × k).
export const LAB_UNITS = {
  albumin: { base: 'г/л', alt: { 'г/дл': 10 } },
  creatinine: { base: 'мкмоль/л', alt: { 'мг/дл': 88.4 } },
  fasting_glucose: { base: 'ммоль/л', alt: { 'мг/дл': 1 / 18.016 } },
  crp: { base: 'мг/л', alt: { 'мг/дл': 10 } },
  white_blood_cell_count: { base: '×10⁹/л', alt: { '×10³/мкл': 1 } },
};

export function labToBase(test, value, unit) {
  const u = LAB_UNITS[test];
  if (!u || unit === u.base) return value;
  return value * u.alt[unit];
}

export function labFromBase(test, value, unit) {
  const u = LAB_UNITS[test];
  if (!u || unit === u.base) return value;
  return value / u.alt[unit];
}

// Единицы отображения из профиля (по умолчанию метрические).
export const unitsOf = (profile) => ({
  mass: (profile && profile.units && profile.units.mass) || 'kg',
  temp: (profile && profile.units && profile.units.temp) || 'c',
});
