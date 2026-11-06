// Разделы каталога вопросов Хирона. icon — имя иконки в духе lib/icons.js (Icon<Имя>); для разделов без своей иконки
// берётся ближайшая по смыслу из существующих.
export const SECTIONS = [
  { id: 'sleep', icon: 'Home', title: { ru: 'Сон', en: 'Sleep' } },
  { id: 'activity', icon: 'Activity', title: { ru: 'Шаги и активность', en: 'Steps and activity' } },
  { id: 'heart', icon: 'Activity', title: { ru: 'Пульс и HRV', en: 'Heart rate and HRV' } },
  { id: 'training', icon: 'Workout', title: { ru: 'Тренировки', en: 'Training' } },
  { id: 'recovery', icon: 'Growth', title: { ru: 'Восстановление', en: 'Recovery' } },
  { id: 'bodyage', icon: 'Profile', title: { ru: 'Возраст тела', en: 'Body age' } },
  { id: 'nutrition', icon: 'Home', title: { ru: 'Питание и вода', en: 'Nutrition and water' } },
  { id: 'stress', icon: 'Chiron', title: { ru: 'Стресс и дыхание', en: 'Stress and breathing' } },
  { id: 'cycle', icon: 'Profile', title: { ru: 'Цикл', en: 'Cycle' } },
  { id: 'app', icon: 'Home', title: { ru: 'Как работает приложение', en: 'How the app works' } },
  { id: 'chiron', icon: 'Chiron', title: { ru: 'О Хироне', en: 'About Chiron' } },
];
export const SECTION_IDS = SECTIONS.map((x) => x.id);
