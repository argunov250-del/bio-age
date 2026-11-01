// Группа 2: план на сегодня. Что делать; с чего начать; простой план; мало времени; слишком много задач;
// один конкретный шаг. Рекомендации только из существующей логики приложения: состояние дня analyze()
// (готовность/восстановление) через {baseTrain} и прежние формулировки (прогулка, растяжка, сон раньше).
// Готовность никогда не выводится из одних шагов; нет данных — честно говорим и не подставляем «норму».
import { P } from '../nlu';
import { BV } from './kit';
import { RS, hasAny, isTired, isUnknown, isOk } from './lexA';

const WHAT = P('что (мне )?(делать|сегодня делать|делать сегодня)|что мне сегодня делать|что на сегодня|что сегодня по плану|чем (мне )?заняться( сегодня)?|какой (у меня )?план( на сегодня| на день)?|план на (сегодня|день|вечер)|что по плану|составь (мне )?план( на сегодня| на день)?|дай (мне )?план( на сегодня)?|подскажи план|what (should|do) i do( today)?|what to do today|plan for today|today\'s plan|what\'s the plan|my plan for today|make me a plan|give me a plan');
const START = P('с чего (мне )?(начать|начинать|начнем|начну)|с чего начинаем|где начать|откуда начать|что сначала|что сперва|что в первую очередь|что делать в первую очередь|where (do i|should i|to) start|where to begin|what first|what do i do first|what should i do first|how do i start');
const SIMPLE = P('простой план|план проще|несложный план|легкий план|план без заморочек|план без сложностей|минимальный план|план минимум|план покороче|simple plan|easy plan|keep (the )?plan simple|plan without (the )?fuss|a simpler plan|simpler plan|lighter plan');
const SHORT = P('мало времени|времени мало|нет времени|времени нет|некогда|всего \\d+ мин\\S*|только \\d+ мин\\S*|есть \\d+ мин\\S*|\\d+ мин\\S* есть|short on time|not much time|only \\d+ min\\S*|got \\d+ min\\S*|\\d+ minutes');
const ASK_DO = P('что (мне )?(делать|можно|успеть|сделать|подойдет)|чем (мне )?заняться|как успеть|какой план|план|what (can|should) i (do|fit)|what fits|what can i do|how (to|do i) fit|fit (in )?(a )?(workout|something)|something quick');
const TOO_MANY = P('слишком много (дел|задач|всего|планов|пунктов)|много (дел|задач)|куча (дел|задач)|гора (дел|задач)|столько (дел|задач)|не успеваю|не успею|всего не успеть|все не успеть|не знаю за что хвататься|за что хвататься|завал( на работе| дел)?|too many (tasks|things|to-?dos|errands)|so much to do|too much to do|can\'t fit everything|cannot fit everything|swamped|buried in (tasks|work)');
const ONE = P('один (конкретный |простой |маленький |небольшой |первый )?шаг|первый шаг|дай (мне )?(один )?шаг|какой (самый )?первый шаг|одно (простое |маленькое )?действие|одну (маленькую )?вещь|что сделать (прямо )?(сейчас|сразу)|что можно сделать (прямо )?сейчас|с одного шага|only one step|one (concrete |small |simple |first )?step|first step|one (small )?thing|what can i do right now|what to do right now|one action|one move');

const only = (n, ...allowed) => n.topics.every((t) => allowed.includes(t));
const base = (n) => !n.past && n.want !== 'neg' && !n.cont && !n.gibberish && !n.avoid;
const isOne = (n) => base(n) && only(n, 'steps') && hasAny(n.norm, [ONE]);
const isTooMany = (n) => base(n) && only(n) && hasAny(n.norm, [TOO_MANY]);
const isShort = (n) => base(n) && only(n, 'train', 'steps') && hasAny(n.norm, [SHORT]) && hasAny(n.norm, [ASK_DO]);
const isSimple = (n) => base(n) && only(n, 'train') && hasAny(n.norm, [SIMPLE]);
const isStart = (n) => base(n) && only(n) && hasAny(n.norm, [START]);
const isWhat = (n) => base(n) && only(n) && hasAny(n.norm, [WHAT]) && !isOne(n) && !isTooMany(n) && !isShort(n) && !isSimple(n) && !isStart(n);

const g = { group: 'plan', topic: 'today', recommends: 'today', route: true };
const EXP_EVE = ['Вечером хороши спокойные дела: приглушённый свет и телефон подальше помогают подготовиться ко сну, а сон — часть восстановления.', 'Calm things suit the evening: dim light and the phone away help you get ready for sleep, and sleep is part of recovery.'];
const EXPLAIN = ['Опираюсь на готовность {readiness} из расчётов приложения, а не на шаги и не на настроение дня.', 'I rely on readiness {readiness} from the app\'s calculations, not on steps or the mood of the day.', ['readiness']];

const ALL = [
  RS({ ...g, id: 'plan_one_step', humor: ['simplify'],
    phrase: isOne, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Дай один шаг', 'какой первый шаг?', 'один конкретный шаг на сегодня', 'what is one small step', 'first step?'],
    negatives: ['сколько шагов сегодня', 'мало шагов', 'не хочу делать первый шаг', 'вчера не сделал первый шаг'],
    continuations: { why: 'объяснение по готовности', simpler: 'шаг без изменений', other: 'другой шаг' },
    variants: [
      BV('plan_one_step_1', { main: ['Один шаг: выйти на 10 минут пройтись.', 'One step: go out for a 10-minute walk.'], action: ['Не пойдёт — вернёшься, это тоже засчитывается.', 'If it does not work out, come back; that still counts.'] }),
      BV('plan_one_step_2', { main: ['Один шаг: лечь на 30 минут раньше обычного.', 'One step: go to bed 30 minutes earlier than usual.'], action: ['Всё остальное сегодня необязательно.', 'Everything else today is optional.'] }, { humorOk: false }),
      BV('plan_one_step_3', { main: ['Один шаг, один: тренировка по готовности.', 'One step, just one: training based on readiness.'], action: ['{baseTrain}', '{baseTrain}'] }),
      BV('plan_one_step_4', { main: ['Один шаг: 5 минут медленного дыхания — вдох на 4 счёта, выдох на 6.', 'One step: 5 minutes of slow breathing, in for 4, out for 6.'], action: ['Просто чтобы день начался со спокойного действия.', 'Just so the day starts with a calm action.'] }, { humorOk: false }),
      BV('plan_one_step_5', { main: ['Один шаг: 10–15 минут ходьбы после ближайшей еды.', 'One step: 10–15 minutes of walking after your next meal.'], explain: EXPLAIN }),
    ] }),

  RS({ ...g, id: 'plan_too_many', humor: ['overloaded_plan'],
    phrase: isTooMany, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Слишком много дел, что делать?', 'столько задач, не успеваю', 'куча дел на сегодня', 'too many tasks today', 'so much to do'],
    negatives: ['Составил план: бег, силовая, растяжка и ещё вечером велосипед', 'слишком много шагов', 'много сплю', 'вчера было слишком много дел'],
    continuations: { why: 'объяснение', simpler: 'plan_one_step' },
    variants: [
      BV('plan_too_many_1', { main: ['Выбери одно. Остальное пусть будет вариантами, а не обязательствами.', 'Pick one. The rest can be options rather than obligations.'], action: ['Из этого одного для тела хватит 10 минут ходьбы.', 'For the body, 10 minutes of walking is enough out of that.'] }),
      BV('plan_too_many_2', { main: ['Список не обязан выполняться целиком.', 'The list does not have to be done in full.'], action: ['Отметь то, что нельзя перенести, а на движение оставь 10–15 минут.', 'Mark what cannot be moved and leave 10–15 minutes for movement.'] }),
      BV('plan_too_many_3', { main: ['Разложим на три части: обязательное, желательное и «если останутся силы».', 'Let us split it in three: must, should and "if energy remains".'], action: ['Для тела берём только третью часть.', 'For the body we take only the third part.'] }, { humorOk: false }),
      BV('plan_too_many_4', { main: ['В такой день тренировку из списка можно вычеркнуть: прогулка 15–30 минут в спокойном темпе тоже настоящий день движения.', 'On a day like this the workout can come off the list: an easy 15–30 minute walk is a real day of movement too.'] }, { when: (e) => isTired(e) }),
      BV('plan_too_many_5', { main: ['Начнём не со списка, а с одного дела для себя.', 'We start not with the list but with one thing for you.'], action: ['Тренировка по готовности: {baseTrain}', 'Training by readiness: {baseTrain}'] }),
    ] }),

  RS({ ...g, id: 'plan_short_time', humor: ['simplify'],
    phrase: isShort, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Мало времени, что можно успеть?', 'у меня всего 15 минут, что делать', 'нет времени, какой план', 'short on time, what can I do', 'only 10 minutes, what fits'],
    negatives: ['мало времени', 'быстро ответь', 'сколько времени сплю', 'вчера было мало времени'],
    continuations: { why: 'объяснение', simpler: 'plan_one_step', other: 'другой короткий вариант' },
    variants: [
      BV('plan_short_time_1', { main: ['Времени мало, берём одну вещь: прогулка 10–15 минут.', 'Time is short, so one thing: a 10–15 minute walk.'], action: ['Это уже движение, а не пустой день.', 'That is already movement, not an empty day.'] }),
      BV('plan_short_time_2', { main: ['Тренировку сократим до основного: разминка и главный блок.', 'We trim the workout to the essentials: warm-up and the main block.'], action: ['Сегодня: {baseTrain}', 'Today: {baseTrain}'] }, { when: (e) => isOk(e) }),
      BV('plan_short_time_3', { main: ['Короткое тоже считается: даже 20 минут лучше, чем ничего.', 'Short counts too: even 20 minutes beat nothing.'], action: ['Выбери одно: ходьба или растяжка.', 'Pick one: walking or stretching.'] }),
      BV('plan_short_time_4', { main: ['Разбей движение на части.', 'Split the movement into pieces.'], action: ['10–15 минут ходьбы после еды — и день не пустой.', '10–15 minutes of walking after a meal and the day is not empty.'] }, { humorOk: false }),
      BV('plan_short_time_5', { main: ['Если совсем мало времени, хватит 10 минут ходьбы.', 'If time is really short, 10 minutes of walking is enough.'], action: ['Обуйся и выйди, остальное по самочувствию.', 'Put your shoes on and step out; the rest by feel.'] }),
      BV('plan_short_time_6', { main: ['Готовность сегодня {readiness}, так что короткая прогулка даже лучше тяжёлой тренировки.', 'Readiness today is {readiness}, so a short walk beats a hard workout.'] }, { when: (e) => isTired(e), humorOk: false }),
    ] }),

  RS({ ...g, id: 'plan_simple', humor: ['simplify'],
    phrase: isSimple, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Дай простой план', 'план попроще на сегодня', 'нужен несложный план', 'easy plan for today', 'a simpler plan please'],
    negatives: ['проще', 'а попроще?', 'составил план на неделю', 'слишком сложный план у меня был'],
    continuations: { why: 'объяснение по готовности', simpler: 'plan_one_step', other: 'другой простой план' },
    variants: [
      BV('plan_simple_1', { main: ['Простой план тоже план: прогулка 15–30 минут в спокойном темпе.', 'A simple plan is still a plan: an easy 15–30 minute walk.'], action: ['Если по ходу появятся силы, можно добавить, но обязательства нет.', 'If energy shows up along the way you can add more, but there is no obligation.'] }),
      BV('plan_simple_2', { main: ['План из одного пункта.', 'A plan with a single item.'], action: ['Тренировка: {baseTrain}', 'Training: {baseTrain}'], extra: ['Всё остальное — по желанию.', 'Everything else is optional.'] }),
      BV('plan_simple_3', { main: ['Тренировку на сегодня убираем.', 'We drop the workout for today.'], action: ['Остаётся прогулка и сон: вечером лечь на 30–45 минут раньше.', 'What stays is a walk and sleep: go to bed 30–45 minutes earlier tonight.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('plan_simple_4', { main: ['Один основной блок вместо нескольких.', 'One main block instead of several.'], action: ['Тренировка: {baseTrain}', 'Training: {baseTrain}'] }, { when: (e) => isOk(e) }),
      BV('plan_simple_5', { main: ['Два пункта: движение и сон.', 'Two items: movement and sleep.'], action: ['Движение — прогулка 15–30 минут, сон — лечь на 30 минут раньше обычного.', 'Movement is a 15–30 minute walk, sleep is going to bed 30 minutes earlier than usual.'] }),
      BV('plan_simple_6', { main: ['Данных для точной настройки мало, поэтому план самый простой: прогулка 15–30 минут.', 'There is little data for fine tuning, so the plan is the simplest one: a 15–30 minute walk.'], action: ['По самочувствию добавляй.', 'Add more by feel.'] }, { when: (e) => isUnknown(e), humorOk: false }),
    ] }),

  RS({ ...g, id: 'plan_start', humor: [],
    phrase: isStart, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['С чего начать?', 'с чего начнём сегодня', 'где начать', 'where should I start', 'what do I do first'],
    negatives: ['с чего начать тренироваться', 'с чего начался день', 'вчера не знал с чего начать', 'не могу начать'],
    continuations: { why: 'объяснение по готовности', simpler: 'plan_one_step', other: 'другой вариант старта' },
    variants: [
      BV('plan_start_1', { main: ['Начнём с главного: решим про тренировку.', 'Let us start with the main thing: decide about training.'], action: ['{baseTrain}', '{baseTrain}'], extra: ['Остальное пусть будет вариантами, а не обязательствами.', 'The rest can be options, not obligations.'] }),
      BV('plan_start_2', { main: ['Старт — готовность: сегодня {readiness}.', 'The start is readiness: {readiness} today.'], action: ['Если на тренировку не хочется, 10 минут прогулки тоже старт.', 'If a workout does not appeal, a 10-minute walk is a start too.'], explain: EXPLAIN }, { humorOk: false }),
      BV('plan_start_3', { main: ['Сегодня старт — отдых: прогулка и сон пораньше.', 'Today the start is rest: a walk and an earlier bedtime.'], action: ['Тяжёлое оставим на потом.', 'The heavy stuff can wait.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('plan_start_4', { main: ['Начни с самого маленького: обуйся и выйди на 10 минут.', 'Start with the smallest thing: put your shoes on and step out for 10 minutes.'], action: ['Не пойдёт — вернёшься, и это тоже засчитывается.', 'If it does not work, come back; that counts too.'] }),
      BV('plan_start_5', { main: ['Сначала цифры: запиши сон и шаги в «Записать вручную», и по ним решим.', 'Numbers first: log sleep and steps in Log manually and we will decide from them.'], action: ['Без данных начинай со спокойной прогулки.', 'Without data, start with an easy walk.'] }, { when: (e) => isUnknown(e), humorOk: false }),
      BV('plan_start_6', { main: ['Начнём с того, что для тебя важнее сегодня.', 'Let us start with what matters most to you today.'], clarify: ['Тренировка, сон или движение в течение дня?', 'Training, sleep or movement through the day?'] }, { pending: { key: 'which_topic' }, humorOk: false }),
    ] }),

  // Вечер: план про спокойные дела и сон, а не принудительная тренировка (время суток — из слов человека).
  RS({ ...g, id: 'plan_evening', humor: [],
    phrase: (n) => isWhat(n) && n.dayPart === 'evening', applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Что мне делать вечером?', 'что делать сегодня вечером', 'план на вечер', 'what should I do this evening'],
    negatives: ['Что мне делать сегодня?', 'что делать утром', 'вчера вечером не знал что делать', 'как спать вечером'],
    continuations: { why: 'объяснение про вечер', simpler: 'plan_one_step', other: 'другой вечерний вариант' },
    variants: [
      BV('plan_eve_1', { main: ['Вечер — время спокойных дел.', 'The evening is for calm things.'], action: ['Прогулка 15–30 минут в спокойном темпе, приглушённый свет и телефон подальше за час до сна.', 'An easy 15–30 minute walk, dim light and the phone away an hour before bed.'], explain: EXP_EVE }, { humorOk: false, noRec: true }),
      BV('plan_eve_2', { main: ['К вечеру из плана достаточно двух вещей: движение и сон.', 'By the evening two things from the plan are enough: movement and sleep.'], action: ['Движение — прогулка 15–30 минут, сон — лечь на 30 минут раньше обычного.', 'Movement is a 15–30 minute walk, sleep is going to bed 30 minutes earlier than usual.'], explain: EXP_EVE }, { noRec: true }),
      BV('plan_eve_3', { main: ['Вечером главное — не набирать новых обязательств.', 'In the evening the main thing is not to take on new obligations.'], action: ['Спокойное движение, если хочется, и пораньше спать. Тренировка не обязательна.', 'Easy movement if you like, and an earlier night. A workout is not required.'], explain: EXP_EVE }, { humorOk: false, noRec: true }),
      BV('plan_eve_4', { main: ['Если после дня остались силы, тренировка возможна: готовность {readiness}.', 'If you have energy left after the day, a workout is possible: readiness {readiness}.'], action: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'], extra: ['Не хочется — прогулки и раннего сна вполне достаточно.', 'If you do not feel like it, a walk and an early night are plenty.'], explain: EXPLAIN }, { when: (e) => !isTired(e) }),
    ] }),

  RS({ ...g, id: 'plan_today', humor: [],
    phrase: isWhat, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Что мне делать сегодня?', 'что делать', 'план на сегодня', 'составь мне план на день', 'чем заняться сегодня', 'what should I do today', 'plan for today', 'шо делать сегодня'],
    negatives: ['что делать с бессонницей', 'как улучшить сон', 'вчера не знал что делать', 'слишком много дел, что делать', 'не хочу ничего делать', 'мало времени, что делать'],
    continuations: { why: 'объяснение по готовности', simpler: 'простой план (прогулка 15–30 минут)', other: 'другой вариант плана' },
    variants: [
      BV('plan_today_t1', { main: ['Сегодня лучше дать себе восстановиться: готовность {readiness}.', 'Today is better spent recovering: readiness {readiness}.'], action: ['План: прогулка 20–40 минут или растяжка, без тяжёлых тренировок, и лечь на 30–45 минут раньше.', 'Plan: a 20–40 minute walk or stretching, no hard training, and bed 30–45 minutes earlier.'], explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('plan_today_t2', { main: ['День бережный: сначала спокойная прогулка, тяжёлое откладываем.', 'A gentle day: an easy walk first, the heavy stuff waits.'], action: ['Вечером — раньше в постель, на 30–45 минут.', 'In the evening, bed earlier by 30–45 minutes.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('plan_today_t3', { main: ['Из всего на сегодня оставь два пункта: движение без нагрузки (прогулка или растяжка) и сон.', 'Of everything for today keep two items: movement without strain (a walk or stretching) and sleep.'], action: ['Ничего тяжёлого.', 'Nothing heavy.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('plan_today_u1', { main: ['Пока мало данных, чтобы оценить восстановление, поэтому начнём с простого: прогулка, а дальше по самочувствию.', 'There is not enough data yet to judge recovery, so we start simple: a walk, then by feel.'], action: ['Добавь сон и шаги в «Записать вручную» — советы станут точнее.', 'Log sleep and steps in Log manually and the tips will get sharper.'] }, { when: (e) => isUnknown(e), humorOk: false }),
      BV('plan_today_u2', { main: ['Скажу честно: восстановление оценить не могу, так что план без привязки к цифрам.', 'Honestly, I cannot judge recovery, so the plan is not tied to numbers.'], action: ['Бодр — умеренная тренировка, вял — прогулка.', 'Energetic: a moderate workout. Sluggish: a walk.'] }, { when: (e) => isUnknown(e), humorOk: false }),
      BV('plan_today_o1', { main: ['Обычный день: готовность {readiness}, подойдёт умеренная нагрузка.', 'A regular day: readiness {readiness}, moderate effort fits.'], action: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'], explain: EXPLAIN }, { when: (e) => e.s.state === 'normal' }),
      BV('plan_today_o2', { main: ['Готовность высокая ({readiness}): день подходит для нагрузки.', 'Readiness is high ({readiness}): a good day for effort.'], action: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'], explain: EXPLAIN }, { when: (e) => e.s.state === 'fresh' }),
      BV('plan_today_a1', { main: ['Готовность {readiness}.', 'Readiness {readiness}.'], action: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'], explain: EXPLAIN }, { when: (e) => !isTired(e) }),
      BV('plan_today_a2', { main: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'], action: ['Остальное — по ходу дня; завтра посмотрим снова.', 'The rest as the day goes; we will look again tomorrow.'] }),
      BV('plan_today_a3', { main: ['За неделю у тебя {workouts7|full}.', 'This week you have {workouts7|full}.'], action: ['Про тренировку сегодня: {baseTrain}', 'About training today: {baseTrain}'] }),
      BV('plan_today_a4', { main: ['План из двух частей: тренировка по состоянию и спокойный вечер.', 'A two-part plan: training by how you are doing and a calm evening.'], action: ['Тренировка: {baseTrain}', 'Training: {baseTrain}'], extra: ['Вечером приглуши свет и отложи телефон за час до сна.', 'In the evening dim the lights and put the phone away an hour before bed.'] }),
      BV('plan_today_a5', { main: ['Сон за неделю — {sleep7} в среднем.', 'Sleep this week averages {sleep7}.'], action: ['Цель на вечер — лечь так, чтобы спать 7+ часов.', 'Tonight, aim for 7+ hours.'], extra: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'] }, { when: (e) => e.s.sleep7 != null && e.s.sleep7 < 7 }),
    ] }),
];

// Порядок: узкие формулировки раньше общей «что делать сегодня».
const at = (id) => ALL.find((x) => x.id === id);
export const PLAN = ['plan_one_step', 'plan_too_many', 'plan_short_time', 'plan_simple', 'plan_start', 'plan_evening', 'plan_today'].map(at);
