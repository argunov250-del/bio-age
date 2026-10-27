// Названия типов тренировок Health Connect (ExerciseType) и значки.
import { RU } from './i18n';

const NAMES = {
  2: ['Бадминтон', 'Badminton', '🏸'], 5: ['Баскетбол', 'Basketball', '🏀'], 8: ['Велосипед', 'Cycling', '🚴'],
  9: ['Велотренажёр', 'Stationary bike', '🚴'], 10: ['Буткемп', 'Boot camp', '💪'], 11: ['Бокс', 'Boxing', '🥊'],
  13: ['Калистеника', 'Calisthenics', '💪'], 16: ['Танцы', 'Dancing', '💃'], 25: ['Эллипс', 'Elliptical', '🏃'],
  26: ['Групповое занятие', 'Exercise class', '🤸'], 32: ['Гольф', 'Golf', '⛳'], 33: ['Дыхание', 'Breathing', '🫁'],
  34: ['Гимнастика', 'Gymnastics', '🤸'], 36: ['Интервальная (HIIT)', 'HIIT', '🔥'], 37: ['Поход', 'Hiking', '🥾'],
  38: ['Хоккей', 'Ice hockey', '🏒'], 39: ['Коньки', 'Ice skating', '⛸️'], 41: ['Скакалка', 'Jump rope', '🪢'],
  44: ['Единоборства', 'Martial arts', '🥋'], 48: ['Пилатес', 'Pilates', '🧘'], 51: ['Скалолазание', 'Climbing', '🧗'],
  53: ['Гребля', 'Rowing', '🚣'], 54: ['Гребной тренажёр', 'Rowing machine', '🚣'], 56: ['Бег', 'Running', '🏃'],
  57: ['Беговая дорожка', 'Treadmill', '🏃'], 61: ['Лыжи', 'Skiing', '⛷️'], 62: ['Сноуборд', 'Snowboarding', '🏂'],
  64: ['Футбол', 'Football', '⚽'], 68: ['Лестница', 'Stairs', '🪜'], 69: ['Степпер', 'Stair machine', '🪜'],
  70: ['Силовая', 'Strength', '🏋️'], 71: ['Растяжка', 'Stretching', '🤸'], 73: ['Плавание (открытая вода)', 'Open water swim', '🏊'],
  74: ['Бассейн', 'Pool swim', '🏊'], 75: ['Настольный теннис', 'Table tennis', '🏓'], 76: ['Теннис', 'Tennis', '🎾'],
  78: ['Волейбол', 'Volleyball', '🏐'], 79: ['Ходьба', 'Walking', '🚶'], 81: ['Тяжёлая атлетика', 'Weightlifting', '🏋️'],
  83: ['Йога', 'Yoga', '🧘'],
};

export function workoutName(type, title) {
  const n = NAMES[type];
  if (n) return RU ? n[0] : n[1];
  return title || (RU ? 'Тренировка' : 'Workout');
}

export const workoutIcon = (type) => (NAMES[type] ? NAMES[type][2] : '⚡');
