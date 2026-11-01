// Группа 13: вне области, неоднозначно, случайные символы, несколько тем. Не перечисляем все возможности
// на каждый непонятный запрос: часть вариантов просто просит переформулировать.
import { V, SC } from './kit';

const g = { group: 'scope', topic: 'scope' };

export const SCOPE = [
  SC({ ...g, id: 'scope_unknown',
    positives: ['неведомая абракадабра', 'сколько звёзд на небе'], negatives: ['как улучшить сон', 'что с пульсом'],
    variants: [
      V('scope_unknown_1', 'Такой формулировки я не знаю. Попробуй спросить про сон, тренировки, шаги или пульс другими словами.', 'I do not know that phrasing. Try asking about sleep, training, steps or heart rate in other words.'),
      V('scope_unknown_2', 'Не уверен, что понял. Я локальный коуч со сценариями и правилами, без языковой модели, поэтому сложную формулировку лучше упростить.', 'I am not sure I got that. I am a local coach with scenarios and rules, with no language model, so a complex phrasing is better simplified.'),
      V('scope_unknown_3', 'Это мимо моих тем. Могу помочь с планом на день, сном или тренировкой.', 'That is outside my topics. I can help with the day plan, sleep or training.'),
      V('scope_unknown_4', 'Пока не вижу, как на это ответить. Перефразируй, пожалуйста: что именно хочешь узнать?', 'I do not see how to answer that yet. Please rephrase: what exactly do you want to know?'),
      V('scope_unknown_5', 'С этим я не помогу. Зато по шагам, сну и восстановлению у меня есть что сказать.', 'I cannot help with that one. For steps, sleep and recovery, though, I have something to say.'),
      V('scope_unknown_6', 'Я не разобрал вопрос. Скажи короче и по теме здоровья или активности, и я постараюсь.', 'I could not parse the question. Say it shorter and about health or activity, and I will try.'),
      V('scope_unknown_7', 'Тут я пас: мои сценарии про здоровье и привычки. Если вопрос оттуда, спроси проще.', 'I pass on this one: my scenarios cover health and habits. If your question is from there, ask it simpler.'),
      V('scope_unknown_8', 'Не нашёл подходящего ответа. Хочешь, начнём с плана на сегодня?', 'I found no fitting answer. Shall we start with the plan for today?', { humorOk: false }),
      V('scope_unknown_9', 'Не угадаю, что ты имел в виду, а гадать не люблю. Уточни, о чём речь.', 'I cannot guess what you meant, and I do not like guessing. Tell me what it is about.'),
      V('scope_unknown_10', 'Эта тема за пределами моих сценариев. Могу ответить про сон, нагрузку, шаги или стресс.', 'This topic is beyond my scenarios. I can answer about sleep, load, steps or stress.'),
    ] }),
  SC({ ...g, id: 'scope_ambiguous', match: (n) => n.ambiguous,
    positives: ['помоги', 'подскажи', 'не знаю'], negatives: ['помоги с планом на сегодня', 'как сон'],
    variants: [
      V('scope_ambiguous_1', 'С чем помочь: план на день, сон, шаги или тренировка?', 'What do you need help with: the day plan, sleep, steps or training?', { pending: { key: 'which_topic' }, humorOk: false }),
      V('scope_ambiguous_2', 'Уточни, пожалуйста, о чём речь: о тренировке, сне или обычном дне?', 'Please tell me what it is about: a workout, sleep or an ordinary day?', { pending: { key: 'which_topic' }, humorOk: false }),
      V('scope_ambiguous_3', 'Я готов, но не понял с чего начать. Назови тему одним словом.', 'I am ready, but I am not sure where to start. Name the topic in one word.', { pending: { key: 'which_topic' }, humorOk: false }),
    ] }),
  SC({ ...g, id: 'scope_gibberish', match: (n) => n.gibberish,
    positives: ['фывапролдж', 'asdfghjkl', '???!!!', 'ыыыыыыы'], negatives: ['привет', 'как сон', 'ok'],
    variants: [
      V('scope_gibberish_1', 'Получился набор символов. Напиши вопрос словами, и я отвечу.', 'That came through as a string of symbols. Write your question in words and I will answer.', { humorOk: false }),
      V('scope_gibberish_2', 'Не разобрал сообщение. Возможно, клавиатура поспешила. Отправь ещё раз?', 'I could not read that message. Maybe the keyboard rushed. Send it again?', { humorOk: true }),
      V('scope_gibberish_3', 'Это не похоже на слова. Попробуй написать вопрос заново.', 'That does not look like words. Try writing the question again.', { humorOk: false }),
    ] }),
  SC({ ...g, id: 'scope_multi', match: (n) => n.multiTopic,
    positives: ['Плохо сплю, мало хожу, хочу похудеть и ещё болит пульс, что делать со всем этим сразу?'], negatives: ['как сон', 'сколько шагов'],
    variants: [
      V('scope_multi_1', 'Тут сразу несколько тем: {topicList}. Давай по порядку. С какой начнём?', 'There are several topics here: {topicList}. Let us take them in order. Which first?', { pending: { key: 'which_topic' }, humorOk: false }),
      V('scope_multi_2', 'Много всего сразу: {topicList}. Выбери одну тему, а остальные разберём следом.', 'That is a lot at once: {topicList}. Pick one topic and we will take the rest next.', { pending: { key: 'which_topic' }, humorOk: false }),
      V('scope_multi_3', 'Вижу несколько вопросов ({topicList}). Чтобы ответить по делу, начнём с одного. С какого?', 'I see several questions ({topicList}). To answer properly, we start with one. Which one?', { pending: { key: 'which_topic' }, humorOk: false }),
    ] }),
  SC({ ...g, id: 'scope_unsupported', match: (n) => !!n.unsupported && n.unsupported !== 'joke_order',
    positives: ['дай рецепт борща', 'какой курс доллара', 'напиши код на python', 'переведи это'], negatives: ['как улучшить сон', 'рассказать анекдот'],
    variants: [
      V('scope_unsupported_1', 'Это вне моих тем, я не отвечу надёжно. Про сон, нагрузку, шаги и стресс — пожалуйста.', 'That is outside my topics and I cannot answer it reliably. Sleep, load, steps and stress — happily.'),
      V('scope_unsupported_2', 'С этим мне лучше не лезть: я коуч по здоровью и привычкам, а не справочник.', 'Better I stay out of that: I coach health and habits, I am not a reference book.'),
      V('scope_unsupported_3', 'Тут я не помощник. Если вопрос про самочувствие или активность, переформулируй.', 'I am not the right helper here. If it is about how you feel or activity, rephrase.'),
      V('scope_unsupported_4', 'Не моя область, чтобы не вводить в заблуждение, промолчу. Мои темы: сон, тренировки, шаги, пульс.', 'Not my area, so I will stay quiet rather than mislead. My topics: sleep, workouts, steps, heart rate.'),
    ] }),
  SC({ ...g, id: 'scope_joke_order', match: (n) => n.unsupported === 'joke_order',
    positives: ['расскажи анекдот', 'tell me a joke'], negatives: ['без шуток', 'как сон'],
    variants: [
      V('scope_joke_order_1', 'Анекдоты на заказ у меня не получаются: юмор появляется по ситуации. Зато можно поговорить о плане на день.', 'Jokes on demand do not work for me: humor shows up when the situation gives a reason. We can talk about the day plan, though.', { humorOk: false }),
      V('scope_joke_order_2', 'Шутки по заявкам не принимаю, они у меня привязаны к поводам. Дай повод — например, расскажи про план на день.', 'I do not take joke requests; mine are tied to occasions. Give me one — tell me about your plan for the day.', { humorOk: false }),
    ] }),
];
