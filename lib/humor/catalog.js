// Каталог мемов и авторских подколов. Русские variants и английские variantsEn — не дословный
// перевод, а естественные аналоги. Где аналога нет (pochemu_1749), variantsEn пуст:
// в английском интерфейсе такая шутка не показывается (лучше полезный ответ, чем неловкая).
// Поля: id, kind ('meme'|'jab'), variants, variantsEn, enabled, matchingIntents (ситуации-интенты),
// contextualTriggers (ситуации из context.js), blockedContexts (флаги, при которых нельзя),
// tone, priority (1..10), cooldownAssistantMessages, placements (где можно ставить шутку).
const ALL = ['lead', 'inline', 'closing'];
const mk = (o) => ({ kind: 'meme', enabled: true, variantsEn: [], tone: 'light', cooldownAssistantMessages: 15, placements: ALL, blockedContexts: [], contextualTriggers: [], matchingIntents: [], ...o });

export const MEMES = [
  mk({ id: 'mozhno_a_zachem', variants: ['Можно, а зачем?'], variantsEn: ['You could. But why?'], matchingIntents: ['round_chase', 'danger_weather_outdoor'], contextualTriggers: ['unneeded_load'], tone: 'dry', priority: 8, placements: ['lead', 'inline'] }),
  mk({ id: 'pochemu_1749', variants: ['Почему 1749?', 'Почему 1749? Потому что связи с вот этими вот..'], matchingIntents: ['number_1749'], contextualTriggers: ['number_1749'], tone: 'absurd', priority: 10, placements: ['lead'] }),
  mk({ id: 'eto_baza', variants: ['Это база.'], variantsEn: ['Solid basics.'], matchingIntents: ['simplify'], contextualTriggers: ['simple_plan', 'plan_ok'], tone: 'approving', priority: 7, placements: ['lead', 'closing'] }),
  mk({ id: 'silno', variants: ['Сильно.'], variantsEn: ['Impressive.'], matchingIntents: ['achievement'], contextualTriggers: ['personal_win'], blockedContexts: ['danger'], tone: 'approving', priority: 6, placements: ['lead', 'closing'] }),
  mk({ id: 'uvazhenie', variants: ['Уважение.'], variantsEn: ['Respect.'], matchingIntents: ['return_habit', 'plan_reduce'], contextualTriggers: ['consistency'], tone: 'approving', priority: 7, placements: ['lead', 'closing'] }),
  mk({ id: 'tak_mozhno_bylo', variants: ['А что, так можно было?'], variantsEn: ['Wait, that was an option?'], matchingIntents: ['easier_way'], contextualTriggers: ['simplify'], tone: 'light', priority: 5, placements: ['lead', 'inline'] }),
  mk({ id: 'plan_nadezhny', variants: ['Надёжный план.'], variantsEn: ['Solid plan.'], matchingIntents: ['plan_ok'], contextualTriggers: ['harmless_odd_plan'], blockedContexts: ['danger_weather', 'danger'], tone: 'ironic', priority: 4, placements: ['lead', 'closing'] }),
  mk({ id: 'bez_paniki', variants: ['Спокойствие, только спокойствие.'], variantsEn: ['Easy, nice and easy.'], matchingIntents: ['odd_number', 'minor_deviation'], blockedContexts: ['anxiety', 'symptoms', 'pain', 'distress'], tone: 'calm', priority: 4, placements: ['lead', 'inline'] }),
  mk({ id: 'prodolzhaem', variants: ['Продолжаем наблюдение.'], variantsEn: ['We keep watching.'], matchingIntents: ['single_trend'], contextualTriggers: ['single_value'], blockedContexts: ['needs_action'], tone: 'calm', priority: 8, placements: ['closing', 'lead'] }),
  mk({ id: 'vot_eto_povorot', variants: ['Вот это поворот.'], variantsEn: ['Plot twist.'], matchingIntents: ['plan_surprise'], blockedContexts: ['health_news'], tone: 'light', priority: 7, placements: ['lead', 'inline'] }),
  mk({ id: 'bez_lishnih_dvizheniy', variants: ['Без лишних движений.'], variantsEn: ['No extra moves.'], matchingIntents: ['simplify'], contextualTriggers: ['short_practical'], blockedContexts: ['avoid_activity'], tone: 'dry', priority: 6, placements: ['lead', 'closing'] }),
  mk({ id: 'otmena', variants: ['Отмена. У нас отмена.'], variantsEn: ['Cancel. We have a cancel.'], matchingIntents: ['plan_change'], blockedContexts: ['serious'], tone: 'light', priority: 7, placements: ['lead', 'inline'] }),
];

export const JABS = [
  mk({ id: 'jab_round', kind: 'jab', variants: ['Круглое число красивое, но мы тренируем тебя, а не счётчик.'], variantsEn: ['A round number is pretty, but we are training you, not the counter.'], matchingIntents: ['round_chase'], tone: 'ironic', priority: 7 }),
  mk({ id: 'jab_overload', kind: 'jab', variants: ['План такой подробный, что ему самому нужен выходной.'], variantsEn: ['That plan is so detailed it needs a day off itself.'], matchingIntents: ['overloaded_plan'], tone: 'ironic', priority: 9 }),
  mk({ id: 'jab_sneakers', kind: 'jab', variants: ['Кроссовки готовы. Осталось согласовать участие владельца.'], variantsEn: ["The sneakers are ready. Only the owner's approval is pending."], matchingIntents: ['procrastination'], blockedContexts: ['tired', 'illness', 'upset', 'reason_given', 'distress', 'skip_guilt', 'danger', 'danger_weather'], tone: 'ironic', priority: 8 }),
  mk({ id: 'jab_boss', kind: 'jab', variants: ['Давай без финального босса в первый день.'], variantsEn: ["Let's skip the final boss on day one."], matchingIntents: ['beginner_heavy'], tone: 'ironic', priority: 9 }),
  mk({ id: 'jab_table', kind: 'jab', variants: ['Таблица впечатлена. Теперь сделаем план выполнимым.'], variantsEn: ["The spreadsheet is impressed. Now let's make the plan doable."], matchingIntents: ['detailed_tracking'], tone: 'ironic', priority: 9 }),
  mk({ id: 'jab_spetseffekty', kind: 'quip', rightsStatus: 'own', variants: ['Погода решила добавить спецэффектов.'], variantsEn: ['The weather decided to add special effects.'], matchingIntents: ['weather_ask'], blockedContexts: ['danger', 'danger_weather'], tone: 'ironic', priority: 8, placements: ['lead'] }),
  mk({ id: 'jab_kosmodrom', kind: 'quip', rightsStatus: 'own', variants: ['Тогда не будем строить космодром.'], variantsEn: ["Then let's not build a spaceport."], matchingIntents: ['nothing_hard'], tone: 'ironic', priority: 8, placements: ['lead'] }),
];

export const CATALOG = [...MEMES, ...JABS];
