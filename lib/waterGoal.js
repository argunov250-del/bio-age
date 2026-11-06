// Цель по воде (чистая функция, без хранилища): отдельно от activities.js, чтобы её мог читать коуч без AsyncStorage.
const DEFAULT_GOAL = 2000;

// Цель по воде. Это общая бытовая ориентировка (~30 мл на кг массы тела, берём 33),
// а НЕ медицинская норма: потребность зависит от жары, нагрузки, питания и здоровья.
// Округление до 50 мл, границы 1500–3500; без правдоподобного веса — 2000.
export function waterGoalMl(profile) {
  const w = Number(profile && profile.weightKg);
  if (!isFinite(w) || w < 30 || w > 300) return DEFAULT_GOAL;
  return Math.max(1500, Math.min(3500, Math.round((w * 33) / 50) * 50));
}
