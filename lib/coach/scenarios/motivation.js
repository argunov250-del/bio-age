// Группа 4: мотивация и сопротивление. Не хочу; лень; трудно начать; боюсь снова бросить; хочу минимум;
// начал, хочу закончить; без мотивационных речей. Лень — не диагноз и не повод делать вывод об усталости:
// о состоянии говорим только по данным приложения (state из analyze()) и только когда они есть.
// Рекомендации — малые шаги из существующих текстов (10 минут ходьбы, прогулка 15–30 минут, разминка и главный блок,
// возвращаться мягко); без лозунгов и нравоучений. «Боюсь бросить» и «без речей» — без юмора.
import { P } from '../nlu';
import { BV } from './kit';
import { RS, hasAny, isTired, isUnknown, isTrainish, CANCELLED } from './lexA';

const LAZY = P('ленив\\S*|лентяй\\S*|лень|лениво|ленюсь|неохота|не охота|нет настроения|не в настроении|не тянет|не могу себя заставить|не могу заставить себя|can\'t be bothered|cant be bothered|lazy|too lazy|(?:don\'t|do not) feel like (?:it|training|working out|exercising|going|moving|doing)|no motivation|not in the mood|couldn\'t be bothered');
const NOT_LAZY = P('не лень|не лениво|not lazy');
const HARD = P('трудно начать|тяжело начать|сложно начать|не могу начать|никак не начну|никак не могу начать|не получается начать|тяжело собраться|сложно собраться|трудно собраться|не могу собраться|не могу раскачаться|раскачаться|все откладываю|постоянно откладываю|откладываю (?:тренировку|занятия|начало)|не могу заставить себя начать|can\'t get started|hard to start|hard to get started|struggling to start|can\'t start|keep putting (?:it )?off|procrastinat\\S*');
const FEAR = P('боюсь (?:опять |снова |что снова |что опять |что )?(?:брошу|бросить|бросать|забросить|заброшу|забросу|сорваться|сорвусь|не выдержу|не потяну|не справлюсь)|опять брошу|снова брошу|опять забросил\\S*|снова забросил\\S*|всегда бросаю|вечно бросаю|всегда бросал\\S*|вечно бросал\\S*|в итоге брошу|как не бросить|как не забросить|как не сорваться|как не сойти с дистанции|как не бросать|afraid (?:i will|i\'ll|of) (?:quit|quitting|give up|giving up|drop)|i always quit|i keep quitting|i\'ll quit again|scared i\'ll (?:quit|give up)|how (?:do i|to) (?:not quit|stay consistent|keep going)');
const MINI = P('хочу минимум|только минимум|сделать минимум|минимум на сегодня|минимум сегодня|что минимум|самый минимум|минимальн\\S* (?:план|вариант|нагрузк\\S*|тренировк\\S*|программ\\S*)|хоть что нибудь|хоть что-нибудь|хоть что то|хоть что-то|хотя бы немного|хоть немного|самое малое|just the minimum|bare minimum|the minimum|minimum for today|smallest (?:thing|step)|at least something|something small');
const FIN = P('начал(?:а|и)? (?:и )?(?:хочу|надо|нужно|хочется) (?:закончить|довести|дожать|доделать|дойти до конца)|хочу (?:закончить|довести до конца|дойти до конца|доделать|дожать)|как (?:мне )?(?:закончить|довести до конца|дойти до конца|не бросить на полпути)|уже начал\\S* (?:хочу|надо|нужно)|не остановиться на полпути|на полпути|started (?:and )?(?:want|need) to finish|want to (?:finish|see it through|stick with it)|how (?:do i|to) finish|halfway (?:through|there)|see it through');
const NOSP = P('без мотивационн\\S* (?:речей|речи|слов|лозунгов|разговоров)|без мотивации|не надо (?:меня )?мотивировать|не мотивируй|не нужна мотивация|не надо мотивации|только по делу|без пафоса|без нравоучений|без лекций|не читай (?:мне )?(?:мораль|нотации)|без морали|без нотаций|без вдохновляющих|no (?:motivational )?(?:speech|speeches|pep talk)|skip the pep talk|don\'t motivate me|no motivation (?:talk|speech|speeches)|just facts|just the facts|no lectures|no preaching|spare me the (?:pep talk|motivation)');

const calm = (n) => !n.past && !n.aboutPrev && !n.cont && !n.gibberish && n.tokens.length <= 14;
const isLazy = (n) => calm(n) && hasAny(n.norm, [LAZY]) && !hasAny(n.norm, [NOT_LAZY]) && !hasAny(n.norm, [FEAR, HARD, NOSP])
  && (isTrainish(n) || n.tokens.length <= 4 || /идти|выходить|вставать|двигаться|выйти|начинать|go|going/.test(n.norm));
const isHard = (n) => calm(n) && hasAny(n.norm, [HARD]) && !hasAny(n.norm, [FEAR]);
const isFear = (n) => !n.cont && !n.gibberish && n.tokens.length <= 16 && hasAny(n.norm, [FEAR]);
const isMini = (n) => calm(n) && hasAny(n.norm, [MINI]) && !hasAny(n.norm, [FEAR, NOSP]);
const isFin = (n) => calm(n) && hasAny(n.norm, [FIN]) && !hasAny(n.norm, [FEAR]) && (isTrainish(n) || /начал|started|полпути|halfway|план|конца|finish|through/.test(n.norm));
const isNoSpeech = (n) => !n.past && !n.cont && !n.gibberish && n.tokens.length <= 14 && hasAny(n.norm, [NOSP]);
const isNoWant = (n) => calm(n) && n.want === 'neg' && !n.nothingHard && !(n.avoid && (n.place || n.altRequest)) && !hasAny(n.norm, [LAZY, FEAR, HARD, MINI, NOSP, CANCELLED])
  && (isTrainish(n) || /(?:^| )план/.test(n.norm));

const EXPLAIN = ['Опираюсь на готовность {readiness} из расчётов приложения, а не на шаги и не на настроение дня.', 'I rely on readiness {readiness} from the app\'s calculations, not on steps or the mood of the day.', ['readiness']];
const BT = ['{baseTrain}', '{baseTrain}'];

const g = { group: 'motivation', recommends: 'train' };

const ALL = [
  // «Без мотивационных речей»: факты и шаг, ни одного лозунга.
  RS({ ...g, topic: 'train', id: 'mot_no_speeches',
    phrase: isNoSpeech, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Только без мотивационных речей', 'не мотивируй меня', 'без пафоса, по делу', 'no pep talk please', 'just the facts', 'без нотаций'],
    negatives: ['мне нужна мотивация', 'вчера просил без речей', 'какая погода', 'расскажи про сон'],
    continuations: { why: 'объяснение по готовности', short: 'уже коротко' },
    variants: [
      BV('mot_no_speeches_1', { main: ['Понял, без речей. По делу:', 'Understood, no speeches. To the point:'], action: BT }, { humorOk: false }),
      BV('mot_no_speeches_2', { main: ['Только факты. Готовность {readiness}.', 'Facts only. Readiness {readiness}.'], action: BT, explain: EXPLAIN }, { when: (e) => !isTired(e), humorOk: false }),
      BV('mot_no_speeches_3', { main: ['Хорошо. Минимум слов, выбор из двух:', 'Fine. Few words, a choice of two:'], action: ['прогулка 15–30 минут или спокойное занятие 20–30 минут.', 'a 15–30 minute walk or an easy 20–30 minute session.'] }, { humorOk: false }),
      BV('mot_no_speeches_4', { main: ['Принято, дальше без вдохновляющих слов.', 'Noted, no inspiring words from here.'], clarify: ['Скажи задачу — дам шаг.', 'Tell me the task and I will give a step.'] }, { humorOk: false }),
      BV('mot_no_speeches_6', { main: ['По делу: готовность {readiness}, тяжёлую тренировку пропускаем.', 'To the point: readiness {readiness}, we skip the hard workout.'], action: ['Прогулка или растяжка 20–30 минут.', 'A walk or stretching for 20–30 minutes.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('mot_no_speeches_5', { main: ['Без речей и без домыслов: данных для вывода мало.', 'No speeches and no guessing: there is too little data for a conclusion.'], action: ['Бодр — умеренная тренировка, вял — прогулка.', 'Energetic: a moderate workout. Sluggish: a walk.'] }, { when: (e) => isUnknown(e), humorOk: false }),
    ] }),

  // «Боюсь снова бросить»: без юмора, без давления; запасной минимум и мягкое возвращение.
  RS({ ...g, topic: 'train', id: 'mot_fear_quit',
    phrase: isFear, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Боюсь опять бросить', 'боюсь, что снова забросу тренировки', 'я всегда бросаю', 'как не бросить', 'afraid I will quit again', 'I always quit', 'how to stay consistent'],
    negatives: ['бросил курить', 'я не боюсь тренироваться', 'не хочу тренироваться', 'как улучшить сон'],
    continuations: { why: 'объяснение', simpler: 'меньше обязательств', other: 'другой вариант' },
    variants: [
      BV('mot_fear_quit_1', { main: ['Страх бросить — повод сделать план проще, а не строже.', 'Fear of quitting is a reason to make the plan simpler, not stricter.'], action: ['Начнём с того, что трудно сорвать: прогулка 15–30 минут в спокойном темпе.', 'Let us start with what is hard to break: an easy 15–30 minute walk.'] }),
      BV('mot_fear_quit_2', { main: ['Привычки — не экзамен: пропуск не обнуляет прогресс.', 'Habits are not an exam: a miss does not reset progress.'], action: ['Возвращайся мягко: первые 1–2 недели вполовину от прежнего объёма.', 'Return gently: for the first 1–2 weeks do half of your old volume.'] }),
      BV('mot_fear_quit_3', { main: ['Давай заранее договоримся о запасном плане.', 'Let us agree on a backup plan in advance.'], action: ['В плохой день вместо тренировки — 10 минут ходьбы. Тогда пропуск не превращается в «бросил».', 'On a bad day, 10 minutes of walking instead of a workout. Then a miss does not turn into "I quit".'] }),
      BV('mot_fear_quit_4', { main: ['За неделю важна сумма движения, ориентир 150 минут умеренной активности, а не идеальный порядок.', 'What matters is the weekly total, about 150 minutes of moderate activity, not a perfect order.'], action: ['Пропущенный день можно просто сдвинуть.', 'A missed day can simply be moved.'] }),
      BV('mot_fear_quit_5', { main: ['Начнём с малого и посмотрим, что получится удержать.', 'Let us start small and see what you can keep up.'], action: ['Две-три лёгкие сессии в неделю по 20–30 минут в темпе, когда можно разговаривать.', 'Two or three easy sessions a week of 20–30 minutes at a talking pace.'] }),
      BV('mot_fear_quit_6', { main: ['Если в плохие дни сил нет, это тоже данные для плана.', 'If energy is missing on bad days, that is information for the plan too.'], action: ['Для таких дней нужен режим «минимум»: прогулка вместо тренировки.', 'Such days need a "minimum" mode: a walk instead of a workout.'] }),
    ].map((v) => ({ ...v, humorOk: false })) }),

  // «Хочу минимум».
  RS({ ...g, topic: 'train', id: 'mot_minimum', humor: ['simplify'],
    phrase: isMini, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Хочу минимум на сегодня', 'сделать только минимум', 'хоть что-нибудь сделать', 'минимальный план', 'the bare minimum', 'just the minimum for today', 'at least something'],
    negatives: ['хочу много', 'вчера делал минимум', 'какой минимум шагов', 'сон минимум'],
    continuations: { why: 'объяснение', simpler: 'plan_one_step', other: 'другой минимум' },
    variants: [
      BV('mot_minimum_1', { main: ['Минимум на сегодня: прогулка 15–30 минут в спокойном темпе.', 'The minimum for today: an easy 15–30 minute walk.'], action: ['Для дня движения этого достаточно.', 'That is enough for a day of movement.'] }),
      BV('mot_minimum_2', { main: ['Самое малое, что ещё считается, — 10 минут ходьбы.', 'The smallest thing that still counts is 10 minutes of walking.'], action: ['Пойдёт легко — можно добавить, но не обязательно.', 'If it goes easily you can add more, but you do not have to.'] }),
      BV('mot_minimum_3', { main: ['Минимальная версия тренировки: разминка и главный блок, остальное по самочувствию.', 'The minimal version of a workout: warm-up and the main block, the rest by feel.'], action: ['Сегодня: {baseTrain}', 'Today: {baseTrain}'] }, { when: (e) => !isTired(e) }),
      BV('mot_minimum_4', { main: ['Твой минимум сегодня совпадает с рекомендацией: без тяжёлой тренировки.', 'Your minimum today matches the recommendation: no hard workout.'], action: ['Прогулка или растяжка 20–30 минут, и день хороший.', 'A walk or stretching for 20–30 minutes and the day is good.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('mot_minimum_5', { main: ['Хотя бы 20 минут лучше, чем ничего.', 'Even 20 minutes beat nothing.'], action: ['Выбери ходьбу, растяжку или лёгкий велосипед.', 'Pick walking, stretching or an easy bike ride.'] }),
      BV('mot_minimum_6', { main: ['Минимум можно измерить: 10–15 минут ходьбы после еды.', 'The minimum can be measured: 10–15 minutes of walking after a meal.'], action: ['Так день точно не будет пустым.', 'That way the day is not empty.'] }, { humorOk: false }),
    ] }),

  // «Начал, хочу закончить».
  RS({ ...g, topic: 'train', id: 'mot_finish', humor: [],
    phrase: isFin, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Начал, хочу закончить', 'хочу довести до конца', 'как дойти до конца', 'я на полпути', 'I started and want to finish', 'want to see it through'],
    negatives: ['хочу закончить работу позже вечером', 'вчера хотел закончить', 'не хочу заканчивать'],
    continuations: { why: 'объяснение', simpler: 'меньше остаток', other: 'другой вариант' },
    variants: [
      BV('mot_finish_1', { main: ['Если ты посреди занятия: доведи основной блок до конца в своём темпе, остальное по самочувствию.', 'If you are in the middle of a session: finish the main block at your own pace, the rest by feel.'], action: ['Рекордов сегодня не нужно.', 'No records are needed today.'] }),
      BV('mot_finish_2', { main: ['Закончить лучше, чем начать идеально.', 'Finishing beats starting perfectly.'], action: ['Оставь в плане только основное: разминка и главный блок.', 'Keep only the essentials in the plan: warm-up and the main block.'] }),
      BV('mot_finish_3', { main: ['Чтобы довести до конца, уменьши остаток.', 'To get to the end, make what is left smaller.'], action: ['Остаток делай спокойно, в темпе, когда можно разговаривать.', 'Do the rest calmly, at a pace where you can talk.'] }, { humorOk: false }),
      BV('mot_finish_4', { main: ['Если речь о длинном плане, разделим его на недели.', 'If it is about a long plan, we split it into weeks.'], action: ['2–3 лёгких занятия по 20–30 минут, нагрузку повышай не больше чем на 10% в неделю.', '2–3 easy sessions of 20–30 minutes, raising the load by no more than 10% a week.'] }),
      BV('mot_finish_5', { main: ['По данным восстановление сегодня не лучшее, так что заканчивай спокойно.', 'By the data recovery is not at its best today, so finish calmly.'], action: ['Без прибавок и ускорений.', 'No increases and no speeding up.'] }, { when: (e) => isTired(e), humorOk: false }),
    ] }),

  // «Трудно начать».
  RS({ ...g, topic: 'procrastination', id: 'mot_hard_start', humor: ['procrastination'],
    phrase: isHard, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Мне трудно начать', 'не могу начать тренироваться', 'никак не раскачаться', 'всё откладываю', 'hard to get started', 'I keep putting it off'],
    negatives: ['вчера было трудно начать', 'начал и хочу закончить', 'как начать день', 'с чего начать'],
    continuations: { why: 'объяснение', simpler: 'меньше шаг', other: 'другой способ начать' },
    variants: [
      BV('mot_hard_start_1', { main: ['Начало — самая тяжёлая часть. Сделаем его совсем маленьким: обуйся и выйди на 10 минут.', 'The start is the hardest part. We make it tiny: put your shoes on and step out for 10 minutes.'], action: ['Не пойдёт — вернёшься, и это тоже засчитывается.', 'If it does not work, come back; that counts too.'] }),
      BV('mot_hard_start_2', { main: ['Не надо начинать тренировку целиком. Начни с разминки.', 'You do not have to start the whole workout. Start with the warm-up.'], action: ['Дальше решишь по самочувствию.', 'Then decide by how you feel.'] }),
      BV('mot_hard_start_3', { main: ['Если выбор мешает начать, решение за тебя уже есть:', 'If choosing gets in the way of starting, the decision is already made for you:'], action: BT }, { humorOk: false }),
      BV('mot_hard_start_4', { main: ['Поставь точку старта, а не цель: кроссовки у двери, одежда рядом.', 'Set a starting point, not a goal: shoes by the door, clothes close by.'], action: ['Старт — просто выйти за дверь, остальное потом.', 'The start is simply stepping out of the door; the rest comes later.'] }),
      BV('mot_hard_start_5', { main: ['Что планировалось? Выбор уже наполовину делает старт.', 'What was planned? Choosing already makes half of the start.'], clarify: ['Бег, силовая, прогулка или что-то спокойное?', 'Running, strength, a walk or something easy?'] }, { needs: ['askActivity'], pending: { key: 'activity' }, humorOk: false }),
      BV('mot_hard_start_6', { main: ['В плане {knownActivity}. Начни с самой лёгкой части.', 'You have {knownActivity} in mind. Start with the easiest part.'], action: ['Остальное подтянется, когда доберёшься до неё, а нет — тоже нормально.', 'The rest can follow once you get there, and if not, that is fine too.'] }, { humorOk: false }),
      BV('mot_hard_start_7', { main: ['Трудно начинать — обычное дело, не слабость.', 'Finding it hard to start is common, not a weakness.'], action: ['Идём по самому лёгкому пути: 10 минут ходьбы без плана и без счёта.', 'We take the easiest path: 10 minutes of walking, no plan, no counting.'] }, { humorOk: false }),
    ] }),

  // «Мне лень» (8–12 вариантов). Лень — не диагноз; об усталости говорим только по данным и только когда они есть.
  RS({ ...g, topic: 'procrastination', id: 'mot_lazy', humor: ['procrastination'],
    phrase: isLazy, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Мне лень идти бегать', 'лень тренироваться', 'неохота сегодня', 'ленюсь', 'не в настроении', 'мне что-то лень', 'лень', 'I can\'t be bothered', 'too lazy to work out', 'don\'t feel like training', 'не хочу, мне лень'],
    negatives: ['мне не лень', 'вчера мне было лень', 'лень готовить ужин и ещё куча дел по дому', 'что такое лень в психологии и откуда она берётся у людей', 'не хочу тренироваться'],
    continuations: { why: 'объяснение по готовности', simpler: 'меньше шаг', other: 'другой способ' },
    variants: [
      BV('mot_lazy_1', { main: ['Договорись с собой на 10 минут: обуйся, выйди и пройдись.', 'Make a deal for 10 minutes: shoes on, step out, walk.'], action: ['Не пойдёт — вернёшься, и это тоже засчитывается.', 'If it is not working, come back; that still counts.'] }),
      BV('mot_lazy_2', { main: ['Лень — не диагноз и не приговор, просто сегодня не хочется.', 'Feeling lazy is not a diagnosis or a verdict, you just do not feel like it today.'], action: ['Спорить с настроением не будем: возьмём самое малое — 10 минут ходьбы.', 'We will not argue with the mood: take the smallest thing, 10 minutes of walking.'] }, { humorOk: false }),
      BV('mot_lazy_3', { main: ['И по данным восстановление сегодня невысокое: {readiness}.', 'And by the data recovery is low today: {readiness}.'], action: ['Так что тяжёлую тренировку пропускаем, а прогулка 20–30 минут — достойная замена.', 'So we skip the hard workout, and a 20–30 minute walk is a fair swap.'], explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('mot_lazy_4', { main: ['Выбери самое лёгкое из списка: прогулка, растяжка или йога на 20–30 минут.', 'Pick the lightest item on the list: a walk, stretching or yoga for 20–30 minutes.'], action: ['Тренировка по плану подождёт.', 'The planned workout can wait.'] }),
      BV('mot_lazy_5', { main: ['Лень к чему именно: к тренировке или к обычному движению в течение дня?', 'Lazy about what exactly: the workout or ordinary movement through the day?'], action: ['От этого зависит, что предложить.', 'What I suggest depends on that.'] }, { pending: { key: 'simplify_what' }, humorOk: false }),
      BV('mot_lazy_6', { main: ['Принято: сегодня без подвигов.', 'Understood: no feats today.'], action: ['Минимальная версия — выйти из дома на 10 минут. Всё, что сверху, — приятный бонус.', 'The minimal version is stepping out for 10 minutes. Anything on top is a bonus.'] }),
      BV('mot_lazy_7', { main: ['Сделаем эксперимент на 10 минут: обуйся и выйди.', 'Let us run a 10-minute experiment: put your shoes on and go out.'], action: ['Через 10 минут решишь — продолжать или вернуться. Оба исхода подходят.', 'After 10 minutes you decide whether to continue or go back. Both outcomes are fine.'] }),
      BV('mot_lazy_8', { main: ['Чтобы не торговаться с собой, поставь условие.', 'To avoid bargaining with yourself, set a condition.'], action: ['Если не выйдешь, замени прогулку лестницей или ходьбой по дому: 10 минут.', 'If you do not go out, swap the walk for stairs or walking around the house: 10 minutes.'] }),
      BV('mot_lazy_9', { main: ['Лень принята.', 'Laziness acknowledged.'], action: ['Минимум на сегодня — 10 минут ходьбы.', 'The minimum for today is 10 minutes of walking.'] }),
      BV('mot_lazy_10', { main: ['На этой неделе у тебя {workouts7|full}.', 'This week you have {workouts7|full}.'], action: ['Сегодня можно обойтись малым — прогулкой — и не ломать общую картину недели.', 'Today you can get by with something small, a walk, without breaking the weekly picture.'] }, { humorOk: false }),
    ] }),

  // «Не хочу (тренироваться / идти в зал / двигаться)».
  RS({ ...g, topic: 'train', id: 'mot_no_want', humor: [],
    phrase: isNoWant, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Не хочу сегодня тренироваться', 'не хочу идти в зал', 'не хочется заниматься', 'не буду сегодня тренироваться', 'не хочу двигаться', 'I don\'t want to work out', 'не хочу выполнять план'],
    negatives: ['хочу тренироваться', 'вчера не хотел тренироваться', 'мне лень идти бегать', 'не хочу сегодня ничего сложного', 'не хочу бегать, предложи что-то дома', 'не хочу спать', 'не хочу', 'передумал, не хочу тренироваться'],
    continuations: { why: 'объяснение по готовности', simpler: 'plan_one_step', other: 'другой вариант' },
    variants: [
      BV('mot_no_want_1', { main: ['Можно и не тренироваться, но исчезать совсем не стоит.', 'You can skip the workout, but there is no need to vanish completely.'], action: ['Прогулка 15–30 минут в спокойном темпе — тоже полноценный день движения.', 'An easy 15–30 minute walk is a full day of movement too.'] }),
      BV('mot_no_want_2', { main: ['Это твой день, решать тебе.', 'It is your day and your call.'], action: ['Если вариант «никак» не подходит, вот самый лёгкий: 10 минут ходьбы.', 'If "nothing" does not work for you, here is the lightest option: 10 minutes of walking.'] }, { humorOk: false }),
      BV('mot_no_want_3', { main: ['Сегодня организм и сам просит бережного режима, так что отказ уместен: готовность {readiness}.', 'Today your body itself asks for an easy day, so skipping makes sense: readiness {readiness}.'], action: ['Прогулка или растяжка вместо тренировки, а завтра посмотрим снова.', 'A walk or stretching instead of a workout, and we look again tomorrow.'], explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('mot_no_want_4', { main: ['Может, дело в месте?', 'Maybe it is about the place?'], clarify: ['Где было бы приятнее: дома, в зале или на улице?', 'Where would it feel nicer: at home, at the gym or outdoors?'] }, { needs: ['askPlace'], pending: { key: 'place' }, humorOk: false }),
      BV('mot_no_want_5', { main: ['Тогда пусть будет {knownPlace}, но в лёгком варианте.', 'Then let it be {knownPlace}, but in an easy version.'], action: ['То, что можно делать в разговорном темпе.', 'Something you can do at a talking pace.'] }, { humorOk: false }),
      BV('mot_no_want_6', { main: ['Не хочешь — не надо, но давай договоримся о замене, а не об отмене.', 'If you do not want to, you do not have to, but let us agree on a swap rather than a cancel.'], action: ['Любое движение на 10 минут сгодится.', 'Any movement for 10 minutes will do.'] }),
      BV('mot_no_want_7', { main: ['Принято. Тогда что хочется вместо?', 'Okay. Then what do you feel like instead?'], clarify: ['Пройтись, растянуться или размяться дома?', 'A walk, some stretching or loosening up at home?'] }, { needs: ['askActivity'], pending: { key: 'activity' }, humorOk: false }),
      BV('mot_no_want_8', { main: ['Хорошо, {knownActivity} — это уже вариант.', 'Okay, {knownActivity} is already an option.'], action: ['Спокойно, без счёта.', 'Calmly, no counting.'] }, { humorOk: false }),
      BV('mot_no_want_9', { main: ['За неделю важна сумма движения, ориентир 150 минут умеренной активности, а не строгий порядок.', 'What matters is the weekly total, about 150 minutes of moderate activity, not a strict order.'], action: ['Один день без тренировки это не ломает.', 'One day without a workout does not break that.'] }, { humorOk: false }),
    ] }),
];

// Порядок: узкие раньше общих («Не хочу» — последним).
const at = (id) => ALL.find((x) => x.id === id);
export const MOTIVATION = ['mot_no_speeches', 'mot_fear_quit', 'mot_minimum', 'mot_finish', 'mot_hard_start', 'mot_lazy', 'mot_no_want'].map(at);
