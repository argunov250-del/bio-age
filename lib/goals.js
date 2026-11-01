// Общие цели: используются и достижениями, и коучем, и уведомлениями.
export const SLEEP_GOAL_H = 7; // запасная цель, если личной нормы ещё нет

// Цель по сну — личная норма (медиана за 30 дней, scores.sleep.norm); нет нормы — 7 ч.
export function sleepGoal(norm) {
  return typeof norm === 'number' && isFinite(norm) && norm >= 3 && norm <= 12 ? Math.round(norm * 10) / 10 : SLEEP_GOAL_H;
}

// Цель по шагам в день: 7000 с 60 лет, иначе 8000. Принимает возраст в годах.
export function stepGoal(age) {
  return age != null && age >= 60 ? 7000 : 8000;
}
