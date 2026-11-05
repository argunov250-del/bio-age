// Группа «умные квесты»: Хирон называет задания дня, а «почему?» объясняет заменой голосом Хирона (spec 1.3, 2.2).
// Данные приходят в env.extra.quests из reply(..., { extra }): результат smartQuests(). Решает правило, а не эта группа.
import { P } from '../nlu';
import { BV } from './kit';
import { RS } from './lexA';

const ASK = P('какие (у меня )?(сегодня )?(задани\\S*|квест\\S*)( на сегодня| на день| сегодня)?|задани\\S* (на )?(сегодня|день)|(мои )?(умные|сегодняшние|дневные) (квест\\S*|задани\\S*)|что (там )?(за|с) (квест\\S*|задани\\S*)( сегодня)?|what are (my )?(quests|tasks)( for)?( today)?|today.?s (quests|tasks)|(my )?(daily|smart) (quests|tasks)|quests? (for )?today');
const hasQuest = (e) => !!(e && e.extra && Array.isArray(e.extra.quests) && e.extra.quests.length);

export const QUESTS_SC = [
  RS({ group: 'quests', topic: 'quests', route: true, id: 'quest_today', humor: [],
    phrase: (n) => !n.cont && !n.gibberish && ASK.test(n.norm),
    applies: hasQuest,
    blocked: (e) => !!e.sens,
    positives: [],
    phrasings: ['какие задания на сегодня', 'мои умные квесты', 'today\'s quests'], notFor: ['какой план на сегодня', 'спасибо'],
    continuations: { why: 'голос Хирона: почему такая замена', other: 'другой вариант' },
    variants: [
      BV('quest_today_1', { main: ['Сегодня для тебя: {questTitle}.', 'Today for you: {questTitle}.'], explain: ['{questWhy}', '{questWhy}'], clarify: ['Спроси «почему?», и расскажу, откуда это.', 'Ask "why?" and I will tell you where this comes from.'] }, { humorOk: false }),
      BV('quest_today_2', { main: ['Я подобрал на сегодня так: {questTitle}.', 'Here is what I picked for today: {questTitle}.'], explain: ['{questWhy}', '{questWhy}'], action: ['Обычные задания можно оставить, если не хочется.', 'You can keep your usual quests if you prefer.'] }, { humorOk: false }),
      BV('quest_today_3', { main: ['По данным дня выходит: {questTitle}.', 'The day\'s data points to this: {questTitle}.'], explain: ['{questWhy}', '{questWhy}'] }, { humorOk: false }),
    ] }),
];
