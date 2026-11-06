// Дополнительные сведения для приветствия Хирона: активная арка и новый ранг (spec 1.2.5, 3.3).
// Чистая функция; результат передаётся в reply(..., { extra }). Ничего не хранит: флаги ставит вызывающий код
// по полю consumed из ответа reply() (arcMarkGreeted / saveRankGreeted).
export const RANK_NAMES = [
  ['Гость пещеры', 'Cave Guest'], ['Ученик Пелиона', 'Pelion Pupil'], ['Следопыт', 'Pathfinder'], ['Травник', 'Herbalist'], ['Лучник', 'Archer'],
  ['Аргонавт', 'Argonaut'], ['Хранитель огня', 'Keeper of the Flame'], ['Наследник Асклепия', 'Heir of Asclepius'], ['Наставник', 'Mentor'], ['Созвездие Кентавра', 'Constellation of the Centaur'],
];
export const rankIndexOf = (level) => (typeof level === 'number' && isFinite(level) ? Math.max(0, Math.min(9, Math.floor(level / 10))) : null);

/**
 * @param {{ arc?: object, level?: number, rankGreeted?: number|null, stored?: object, quests?: Array, rest?: boolean }} i
 *   arc — результат arcState(); stored — arcs.v1 (для greetedKey); rankGreeted — rank.greeted.v1.
 * @returns {{ arc, rank, quests, rest }} для opts.extra функции reply()
 */
export function buildGreetExtra({ arc, level, rankGreeted = null, stored, quests, rest = false, dayKey } = {}) {
  const idx = rankIndexOf(level);
  const rank = idx != null && idx > (rankGreeted == null ? 0 : rankGreeted) ? { index: idx, ru: RANK_NAMES[idx][0], en: RANK_NAMES[idx][1] } : null;
  const greeted = stored && dayKey && stored.greetedKey === dayKey;
  const a = arc && arc.id && !greeted && !arc.blocked ? { id: arc.id, stage: arc.stage } : null;
  return { arc: a, rank, quests: Array.isArray(quests) ? quests : [], rest: !!rest, level: idx != null ? Math.floor(level) : null };
}
