// Единицы и конвертация. Внутри всё хранится в метрических единицах (кг, см, °C);
// пересчёт — только для показа и ввода.
export const MASS = {
  kg: { label: 'кг', from: (kg) => kg, to: (v) => v },
  lb: { label: 'lb', from: (kg) => kg * 2.2046226, to: (v) => v / 2.2046226 },
};

export const TEMP = {
  c: { label: '°C', from: (c) => c, to: (v) => v, delta: (d) => d },
  f: { label: '°F', from: (c) => c * 9 / 5 + 32, to: (v) => (v - 32) * 5 / 9, delta: (d) => d * 9 / 5 },
};

// Единицы отображения из профиля (по умолчанию метрические).
export const unitsOf = (profile) => ({
  mass: (profile && profile.units && profile.units.mass) || 'kg',
  temp: (profile && profile.units && profile.units.temp) || 'c',
});
