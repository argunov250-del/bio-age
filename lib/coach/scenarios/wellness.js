// Группа 15: вода, витамины, дыхание 4–6, лёгкий стресс, цифровая пауза. Только то, что уже умеет приложение:
// цель по воде — общий ориентир (activities.waterGoalMl), дыхание 4 с вдох / 6 с выдох, пауза по подтверждению.
// Никаких доз и лечения. Сильную тревогу и симптомы перехватывает чувствительная проверка раньше этой группы.
import { P } from '../nlu';
import { V, BV } from './kit';
import { L, Ln, S } from './lexC';

const g = { group: 'wellness', topic: 'wellness' };
const DOSE = P('сколько( \\S+)? (принимать|пить|глотать|съедать)|доз\\S*|мг|миллиграмм\\S*|курс|как принимать|how (much|many)( \\S+){0,3} (to take|should i take)|should i take|dose|dosage|mg|milligram\\S*');
const DOSE_W = P('доз\\S*|мг|миллиграмм\\S*|таблет\\S*|принимать|dose|dosage|mg|pills?');
const SEVERE = P('паническ\\S*|не могу дышать|задыхаюсь|сердце (колотится|болит)|мысли (о|навредить)|panic|cannot breathe|can t breathe|chest pain');

export const WELLNESS = [
  S({ ...g, id: 'well_water_goal', humor: [],
    test: L('сколько (мне )?(надо |нужно |стоит |следует )?(пить|выпивать)( воды)?( в день)?|сколько воды( пить| нужно| надо| в день| выпивать)?|норма воды|цель по воде|how much water|water goal|water target|how many (glasses|liters|litres)|how much should i drink', 9, (n) => !DOSE_W.test(n.norm) && !/алког|вин|пив|кофе|витамин|бад|vitamin|supplement/.test(n.norm)),
    positives: ['Сколько воды пить?', 'сколько пить воды в день', 'какая цель по воде', 'сколько мне надо пить', 'сколько воды нужно', 'how much water should i drink', 'water goal'],
    negatives: ['сколько стоит вода', 'не хочу пить воду', 'сколько пить таблеток', 'вчера пил воду'],
    continuations: { why: 'откуда цифра', other: 'другой вариант' },
    variants: [
      BV('well_water_goal_1', { main: ['Ориентир в приложении: {waterGoal} в день.', 'The app\'s guideline: {waterGoal} a day.'], explain: ['{waterNote} Это общий ориентир, а не медицинская норма: в жару, при нагрузке и при разном самочувствии потребность другая.', '{waterNote} It is a general guideline, not a medical norm: in heat, with exercise and with different health conditions the need differs.'], action: ['Удобно пить по стакану, около 250 мл, в течение дня.', 'It is easy to drink a glass, about 250 ml, through the day.'] }),
      BV('well_water_goal_2', { main: ['Приложение считает цель по воде примерно в {waterGoal}.', 'The app counts your water goal as about {waterGoal}.'], explain: ['{waterNote}', '{waterNote}'], action: ['Не нужно догонять вечером залпом: лучше понемногу в течение дня.', 'No need to catch up in one go in the evening: a little through the day is better.'] }, { humorOk: false }),
      BV('well_water_goal_3', { main: ['Цель на сегодня — {waterGoal}. Не соревнование, а ориентир.', 'Today\'s goal is {waterGoal}. A guideline, not a contest.'], action: ['Если есть особые указания врача по питью, они важнее моих цифр.', 'If your doctor has given special drinking guidance, it matters more than my numbers.'] }, { humorOk: false }),
      BV('well_water_goal_4', { main: ['{waterGoal} в день, это ориентир из приложения. {waterNote}', '{waterGoal} a day is the app\'s guideline. {waterNote}'], action: ['Стакан с утра и по стакану к каждой еде — простая схема.', 'A glass in the morning and one with each meal is a simple scheme.'] }),
      BV('well_water_goal_5', { main: ['Короткий ответ: около {waterGoal}.', 'Short answer: about {waterGoal}.'], explain: ['Потребность зависит от жары, нагрузки и здоровья, поэтому цифра общая.', 'The need depends on heat, activity and health, so the number is general.'] }, { humorOk: false, short: { ru: 'Около {waterGoal} в день.', en: 'About {waterGoal} a day.' } }),
    ] }),

  S({ ...g, id: 'well_water_log', humor: [],
    test: L('отметь (воду|стакан|выпитое)|запиши (воду|стакан)|выпил\\S* (стакан|воды|воду|\\d+ мл)|я выпил\\S* воды|добавь воду|log (a glass of )?water|add (a glass of )?water|i drank (a glass|some|water)|drank (a glass|water)', 9),
    positives: ['Отметь воду', 'я выпил стакан воды', 'запиши стакан', 'добавь воду', 'выпил 250 мл', 'i drank a glass of water', 'log water'],
    negatives: ['не пью воду', 'вчера выпил воды', 'сколько воды пить', 'расскажи про воду'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('well_water_log_1', { main: ['Сам записать не могу: отметка воды ставится в приложении, шаг — 250 мл.', 'I cannot record it myself: water is logged in the app, in 250 ml steps.'], action: ['Выпитое идёт в «Рост»: за воду по цели дают до 6 XP в день.', 'It counts toward Growth: water at goal gives up to 6 XP a day.'] }, { humorOk: false }),
      BV('well_water_log_2', { main: ['Отлично, что выпил. Отметь это в карточке воды, мне запись недоступна.', 'Good that you drank. Log it in the water card; I cannot write it.'], action: ['Цель на сегодня около {waterGoal}.', 'Today\'s goal is about {waterGoal}.'] }),
      BV('well_water_log_3', { main: ['Принял к сведению, но в дневник попадает только то, что отмечено в приложении.', 'Noted, but only what is logged in the app reaches the diary.'] }, { humorOk: false }),
      BV('well_water_log_4', { main: ['Почки скажут спасибо. Отметку про воду поставь сам: я только читаю данные.', 'Your kidneys say thanks. Log the water yourself: I only read data.'] }),
    ] }),

  S({ ...g, id: 'well_vitamins', humor: [],
    test: L('витамин\\S*|бады|vitamin\\S*|supplement\\S*|добавки', 9, (n) => !DOSE.test(n.norm) && !n.topics.includes('treatment')),
    positives: ['Что с витаминами?', 'отметь витамины', 'я выпил витамины', 'как отмечать витамины', 'про витамины в приложении', 'did my vitamins', 'vitamins'],
    negatives: ['не принимаю витамины', 'сколько принимать витамины', 'вчера пил витамины', 'какая доза витамина'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('well_vitamins_1', { main: ['В приложении есть отметка «Витамины» за день: просто галочка, это 2 XP в «Росте».', 'The app has a daily "Vitamins" check: just a tick, worth 2 XP in Growth.'], action: ['Принимать ли что-то и что именно — решаешь ты, лучше с врачом. Я такого не назначаю.', 'Whether and what to take is your decision, ideally with a doctor. I do not prescribe.'] }, { humorOk: false }),
      BV('well_vitamins_2', { main: ['Отметку про витамины ставь сам в приложении, мне запись недоступна.', 'Tick the vitamins yourself in the app; I cannot write it.'], action: ['Это лишь учёт привычки, а не совет что принимать.', 'It only tracks a habit, not advice on what to take.'] }),
      BV('well_vitamins_3', { main: ['Витамины в приложении — маленькая ежедневная привычка, не оценка здоровья.', 'Vitamins in the app are a small daily habit, not a health grade.'], action: ['Пропуск ничего не ломает.', 'A skipped day breaks nothing.'] }, { humorOk: false }),
      BV('well_vitamins_4', { main: ['Что именно принимать — вопрос к врачу или фармацевту. Моё дело — напомнить про галочку.', 'What exactly to take is a question for a doctor or pharmacist. My job is to remind you of the tick.'] }),
    ] }),

  S({ ...g, id: 'well_vitamins_dose', humor: [],
    test: L('витамин\\S*|бады|vitamin\\S*|supplement\\S*|добавки', 10, (n) => DOSE.test(n.norm)),
    positives: ['Сколько принимать витамины?', 'какая доза витамина D', 'сколько пить витаминов в день', 'сколько витаминов принимать', 'how much vitamin c should i take', 'how much vitamin d should i take'],
    negatives: ['отметь витамины', 'не принимаю витамины', 'вчера пил витамины', 'сколько воды пить'],
    variants: [
      V('well_vitamins_dose_1', 'Дозировки я не назначаю. Смотри инструкцию и спроси врача или фармацевта, особенно если есть болезни или лекарства.', 'I do not recommend doses. Check the label and ask a doctor or pharmacist, especially with conditions or medication.', { humorOk: false }),
      V('well_vitamins_dose_2', ['Про дозы честно не скажу: это решает врач по твоему случаю.', 'В приложении витамины — только отметка о том, что ты их принял.'], ['I honestly cannot say about doses: that is for a doctor, based on your case.', 'In the app, vitamins are just a mark that you took them.'], { humorOk: false }),
      V('well_vitamins_dose_3', 'Это вопрос к врачу, а не к коучу. Я могу только напомнить про отметку в приложении.', 'That is a question for a doctor, not a coach. I can only remind you about the app mark.', { humorOk: false }),
      V('well_vitamins_dose_4', 'Без дозировок: они зависят от возраста, самочувствия и анализов. Загляни в инструкцию и поговори с врачом.', 'No doses: they depend on age, health and tests. Read the label and talk to a doctor.', { humorOk: false }),
    ] }),

  S({ ...g, id: 'well_breath_why', humor: [],
    test: L('зачем (нужно )?(дыхани\\S*|дышать)|почему (выдох|дыхани\\S*)|для чего дыхани\\S*|поможет ли дыхани\\S*|помогает ли дыхани\\S*|why (breathing|breathe|a longer exhale)|does breathing help|what is the point of breathing', 10),
    positives: ['Зачем нужно дыхание 4-6?', 'почему выдох длиннее', 'помогает ли дыхание', 'зачем дышать по таймеру', 'why a longer exhale', 'does breathing help', 'зачем дыхание'],
    negatives: ['зачем жить', 'не помогает дыхание', 'как делать дыхание', 'почему сон короткий'],
    continuations: { other: 'другой вариант' },
    variants: [
      V('well_breath_why_1', ['Медленный ритм с выдохом дольше вдоха многие считают успокаивающим. Это не лечение, а способ дать себе паузу.', 'Три минуты в день — достаточно, чтобы попробовать.'], ['A slow rhythm with a longer exhale is found calming by many. It is not a treatment, just a way to give yourself a pause.', 'Three minutes a day is enough to try.'], { humorOk: false }),
      V('well_breath_why_2', 'Зачем: чтобы на пару минут замедлиться и переключить внимание на счёт. Обещать эффект не буду, но попробовать ничего не стоит.', 'Why: to slow down for a couple of minutes and shift attention to counting. I will not promise an effect, but trying costs nothing.', { humorOk: false }),
      V('well_breath_why_3', 'Это короткая практика-пауза: счёт занимает голову, пока тело успокаивается. Таймер есть в «Дыхание 4–6».', 'It is a short pause practice: counting occupies the mind while the body settles. The timer is in Breathing 4–6.'),
      V('well_breath_why_4', 'Для меня это прежде всего привычка, к которой легко вернуться в напряжённый день. А в «Росте» она даёт немного опыта.', 'To me it is first of all a habit that is easy to return to on a tense day. And in Growth it gives a bit of XP.', { humorOk: false }),
    ] }),

  S({ ...g, id: 'well_breath_how', humor: [],
    test: L('дыхани\\S* 4 ?[-–—]? ?6|как (делать|выполнять) дыхани\\S*|как (правильно )?дышать|(упражнение|техника|практика) дыхани\\S*|дыхательн\\S*|breathing 4 ?[-–—]? ?6|how (to|do i) breathe|breathing exercise|breathing timer|как работает дыхани\\S*', 10),
    positives: ['Как делать дыхание 4-6?', 'как правильно дышать', 'дыхательное упражнение', 'расскажи про дыхание 4–6', 'дыхательная практика', 'breathing 4-6', 'breathing exercise'],
    negatives: ['не хочу дышать так', 'как дыхание во сне', 'вчера делал дыхательное', 'задыхаюсь'],
    continuations: { why: 'зачем это', other: 'другой вариант' },
    variants: [
      BV('well_breath_how_1', { main: ['Вдох носом на 4 счёта, выдох на 6, без усилия. Так цикл за циклом.', 'Breathe in through the nose for 4 counts and out for 6, without strain. Cycle after cycle.'], action: ['Таймер есть в разделе «Дыхание 4–6», по умолчанию 3 минуты.', 'The timer is in the Breathing 4–6 section, 3 minutes by default.'] }),
      BV('well_breath_how_2', { main: ['Сядь удобно, плечи вниз. Вдох — 4 секунды, выдох — 6, чуть дольше вдоха.', 'Sit comfortably, shoulders down. Inhale for 4 seconds, exhale for 6, a bit longer than the inhale.'], explain: ['В приложении сессия засчитывается, если приложение остаётся на экране и прошло не меньше 90% времени.', 'In the app a session counts if it stays on screen and at least 90% of the time has passed.'] }, { humorOk: false }),
      BV('well_breath_how_3', { main: ['Запусти «Дыхание 4–6»: круг расширяется на вдохе и сжимается на выдохе, ты просто следуешь за ним.', 'Start "Breathing 4–6": the circle grows on the inhale and shrinks on the exhale; you just follow it.'], action: ['Если закружилась голова, дыши как обычно и остановись.', 'If you feel dizzy, breathe normally and stop.'] }, { humorOk: false }),
      BV('well_breath_how_4', { main: ['Проще простого: считай до 4 на вдохе и до 6 на выдохе. Три минуты хватит.', 'Simple: count to 4 on the inhale and to 6 on the exhale. Three minutes is enough.'], explain: ['Для «Роста» за день нужно набрать 5 минут дыхания, это 4 XP.', 'For Growth you need 5 minutes of breathing in a day, worth 4 XP.'] }),
    ] }),

  S({ ...g, id: 'well_stress_light', humor: [],
    test: Ln('(я )?(на нервах|на взводе|нервничаю|волнуюсь|тревожусь|переживаю|напряжен\\S*|напряжена)|мне (тревожно|неспокойно|страшновато|не по себе)|у меня стресс|я в стрессе|много стресса|стресс на работе|(i am|im|i m|feeling) (so )?(stressed|anxious|nervous|tense|on edge|worried)|so stressed|stressed out', 10, (n) => !SEVERE.test(n.norm) && !n.isQuestion),
    positives: ['Я на нервах', 'у меня стресс', 'нервничаю перед встречей', 'я в стрессе', 'я на взводе', 'i am so stressed', 'im stressed out'],
    negatives: ['нет стресса', 'как мой стресс по данным', 'вчера был стресс', 'паническая атака, не могу дышать'],
    continuations: { other: 'другой вариант', short: 'коротко' },
    variants: [
      BV('well_stress_light_1', { main: ['Понимаю. Попробуй три минуты дыхания 4–6: вдох на 4, выдох на 6.', 'I understand. Try three minutes of 4–6 breathing: in for 4, out for 6.'], action: ['Таймер есть в разделе «Дыхание 4–6».', 'The timer is in the Breathing 4–6 section.'] }, { humorOk: false }),
      BV('well_stress_light_2', { main: ['В напряжении помогает сменить обстановку: 10 минут спокойной ходьбы, лучше без телефона.', 'Under tension a change of scene helps: 10 minutes of easy walking, preferably without the phone.'], action: ['Потом стакан воды и одно дело за раз.', 'Then a glass of water and one thing at a time.'] }, { humorOk: false }),
      BV('well_stress_light_3', { main: ['Давай по шагам: выдохни, выпей воды, выбери одну задачу на ближайший час.', 'Step by step: exhale, drink some water, pick one task for the next hour.'] }, { humorOk: false }),
      BV('well_stress_light_4', { main: ['Может помочь цифровая пауза: 20 минут без ленты и уведомлений.', 'A digital pause may help: 20 minutes without feeds and notifications.'], action: ['Запустить можно в приложении, раздел «Цифровая пауза».', 'You can start it in the app, in the Digital pause section.'] }, { humorOk: false }),
      BV('well_stress_light_5', { main: ['Если тревога сильная, не отпускает или есть мысли навредить себе, не оставайся одна или один: поговори с близким или врачом, при опасности звони 112.', 'If the anxiety is strong, will not let go, or you think of harming yourself, do not stay alone: talk to someone close or a doctor, call 112 if in danger.'], action: ['А лёгкое напряжение хорошо снимает медленное дыхание.', 'Mild tension eases with slow breathing.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'well_pause', humor: [],
    test: L('цифров\\S* пауз\\S*|digital (pause|detox)|пауза от телефона|отдохнуть от телефона|отдых от телефона|как работает пауза|меньше сидеть в телефоне|break from (my )?phone|phone break|screen break', 10),
    positives: ['Что такое цифровая пауза?', 'как работает цифровая пауза', 'хочу отдохнуть от телефона', 'пауза от телефона', 'расскажи про цифровую паузу', 'digital pause', 'phone break'],
    negatives: ['не хочу паузу от телефона', 'вчера делал цифровую паузу', 'пауза между подходами', 'как спать'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('well_pause_1', { main: ['Цифровая пауза — таймер на 20 минут без телефона. Запусти и займись чем-то другим.', 'Digital pause is a 20-minute timer without the phone. Start it and do something else.'], explain: ['По завершении ты сам нажимаешь «Получилось»: следить, брал ли ты телефон, я не могу.', 'When it ends you press "Done" yourself: I cannot tell whether you picked up the phone.'] }, { humorOk: false }),
      BV('well_pause_2', { main: ['Это спокойный перерыв от экрана: прогулка, чай, окно. Таймер просто отмеряет время.', 'It is a calm break from the screen: a walk, tea, a window. The timer just measures time.'], action: ['Для «Роста» нужно набрать за день 15 минут паузы, это 4 XP.', 'For Growth you need 15 minutes of pause in a day, worth 4 XP.'] }),
      BV('well_pause_3', { main: ['Без штрафов: закончить раньше можно, просто не засчитается.', 'No penalties: you can finish early, it just will not count.'], action: ['Попробуй сегодня, например перед сном.', 'Try it today, for example before bed.'] }, { humorOk: false }),
      BV('well_pause_4', { main: ['Цифровая пауза — это договорённость с самим собой. Приложение лишь держит таймер и доверяет твоему слову.', 'A digital pause is an agreement with yourself. The app just holds the timer and trusts your word.'] }),
    ] }),
];
