// Ранги: титул зависит только от уровня (по 10 уровней), независим от «образа» (TIERS в growth.js).
import { RU } from './i18n';

const t = (ru, en) => (RU ? ru : en);
const mk = (ru, en) => ({ get name() { return t(ru, en); } });

export const RANKS = [
  mk('Гость пещеры', 'Cave Guest'),
  mk('Ученик Пелиона', 'Pelion Pupil'),
  mk('Следопыт', 'Pathfinder'),
  mk('Травник', 'Herbalist'),
  mk('Лучник', 'Archer'),
  mk('Аргонавт', 'Argonaut'),
  mk('Хранитель огня', 'Keeper of the Flame'),
  mk('Наследник Асклепия', 'Heir of Asclepius'),
  mk('Наставник', 'Mentor'),
  mk('Созвездие Кентавра', 'Constellation of the Centaur'),
];

export const rankIndex = (level) => {
  const n = Math.floor(Number(level));
  return isFinite(n) && n > 0 ? Math.min(RANKS.length - 1, Math.floor(n / 10)) : 0;
};

// -> { index, name, minLevel, nextAt } ; nextAt — уровень следующего ранга (null на последнем).
export function rankFor(level) {
  const index = rankIndex(level);
  return {
    index,
    name: RANKS[index].name,
    minLevel: index * 10,
    nextAt: index >= RANKS.length - 1 ? null : (index + 1) * 10,
  };
}
