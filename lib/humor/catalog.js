// Каталог мемов и авторских подколов. Только русский текст: в английском интерфейсе
// юмор не показывается (variantsEn пуст — лучше полезный ответ без шутки, чем неестественная).
// Поля: id, kind ('meme'|'jab'), variants, variantsEn, enabled, matchingIntents (ситуации-интенты),
// contextualTriggers (ситуации из context.js), blockedContexts (флаги, при которых нельзя),
// tone, priority (1..10), cooldownAssistantMessages, placements (где можно ставить шутку).
const ALL = ['lead', 'inline', 'closing'];
const mk = (o) => ({ kind: 'meme', enabled: true, variantsEn: [], tone: 'light', cooldownAssistantMessages: 15, placements: ALL, blockedContexts: [], contextualTriggers: [], matchingIntents: [], ...o });

export const MEMES = [
  mk({ id: 'mozhno_a_zachem', variants: ['Можно, а зачем?'], matchingIntents: ['round_chase', 'danger_weather_outdoor'], contextualTriggers: ['unneeded_load'], tone: 'dry', priority: 8, placements: ['lead', 'inline'] }),
  mk({ id: 'pochemu_1749', variants: ['Почему 1749?', 'Почему 1749? Потому что связи с вот этими вот..'], matchingIntents: ['number_1749'], contextualTriggers: ['number_1749'], tone: 'absurd', priority: 10, placements: ['lead'] }),
  mk({ id: 'eto_baza', variants: ['Это база.'], matchingIntents: ['simplify'], contextualTriggers: ['simple_plan', 'plan_ok'], tone: 'approving', priority: 7, placements: ['lead', 'closing'] }),
  mk({ id: 'silno', variants: ['Сильно.'], matchingIntents: ['achievement'], contextualTriggers: ['personal_win'], blockedContexts: ['danger'], tone: 'approving', priority: 6, placements: ['lead', 'closing'] }),
  mk({ id: 'uvazhenie', variants: ['Уважение.'], matchingIntents: ['return_habit', 'plan_reduce'], contextualTriggers: ['consistency'], tone: 'approving', priority: 7, placements: ['lead', 'closing'] }),
  mk({ id: 'tak_mozhno_bylo', variants: ['А что, так можно было?'], matchingIntents: ['easier_way'], contextualTriggers: ['simplify'], tone: 'light', priority: 5, placements: ['lead', 'inline'] }),
  mk({ id: 'plan_nadezhny', variants: ['Надёжный план.'], matchingIntents: ['plan_ok'], contextualTriggers: ['harmless_odd_plan'], blockedContexts: ['danger_weather', 'danger'], tone: 'ironic', priority: 4, placements: ['lead', 'closing'] }),
  mk({ id: 'bez_paniki', variants: ['Спокойствие, только спокойствие.'], matchingIntents: ['odd_number', 'minor_deviation'], blockedContexts: ['anxiety', 'symptoms', 'pain', 'distress'], tone: 'calm', priority: 4, placements: ['lead', 'inline'] }),
  mk({ id: 'prodolzhaem', variants: ['Продолжаем наблюдение.'], matchingIntents: ['single_trend'], contextualTriggers: ['single_value'], blockedContexts: ['needs_action'], tone: 'calm', priority: 8, placements: ['closing', 'lead'] }),
  mk({ id: 'vot_eto_povorot', variants: ['Вот это поворот.'], matchingIntents: ['plan_surprise'], blockedContexts: ['health_news'], tone: 'light', priority: 7, placements: ['lead', 'inline'] }),
  mk({ id: 'bez_lishnih_dvizheniy', variants: ['Без лишних движений.'], matchingIntents: ['simplify'], contextualTriggers: ['short_practical'], blockedContexts: ['avoid_activity'], tone: 'dry', priority: 6, placements: ['lead', 'closing'] }),
  mk({ id: 'otmena', variants: ['Отмена. У нас отмена.'], matchingIntents: ['plan_change'], blockedContexts: ['serious'], tone: 'light', priority: 7, placements: ['lead', 'inline'] }),
];

export const JABS = [
  mk({ id: 'jab_round', kind: 'jab', variants: ['Круглое число красивое, но мы тренируем тебя, а не счётчик.'], matchingIntents: ['round_chase'], tone: 'ironic', priority: 7 }),
  mk({ id: 'jab_overload', kind: 'jab', variants: ['План такой подробный, что ему самому нужен выходной.'], matchingIntents: ['overloaded_plan'], tone: 'ironic', priority: 9 }),
  mk({ id: 'jab_sneakers', kind: 'jab', variants: ['Кроссовки готовы. Осталось согласовать участие владельца.'], matchingIntents: ['procrastination'], blockedContexts: ['tired', 'illness', 'upset', 'reason_given', 'distress', 'skip_guilt'], tone: 'ironic', priority: 8 }),
  mk({ id: 'jab_boss', kind: 'jab', variants: ['Давай без финального босса в первый день.'], matchingIntents: ['beginner_heavy'], tone: 'ironic', priority: 9 }),
  mk({ id: 'jab_table', kind: 'jab', variants: ['Таблица впечатлена. Теперь сделаем план выполнимым.'], matchingIntents: ['detailed_tracking'], tone: 'ironic', priority: 9 }),
];

export const CATALOG = [...MEMES, ...JABS];
