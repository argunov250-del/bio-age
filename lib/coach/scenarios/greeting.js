// Группа 1: приветствие. Первое обращение; возвращение в тот же день; после перерыва (только если время
// прошлого разговора известно из памяти); «как дела»; сообщение без конкретного запроса.
// Приветствие без вопроса «по делу»: «Привет, как сон?» сюда не попадает (там есть тема) и идёт обычным путём.
import { P } from '../nlu';
import { BV } from './kit';
import { RS, pureOf, hasAny, visitKind } from './lexA';

const GREET = P('привет\\S*|здравствуй\\S*|здрас\\S*|драст\\S*|здорово|здорова|добрый день|добрый вечер|добрый|доброе утро|доброй ночи|доброго (времени суток|дня|вечера|утра)|добрейшего (дня|вечера)|салют|приветствую|йо|hi( there)?|good (morning|afternoon|evening|day|night)|howdy|yo|greetings|morning|evening');
const HOWDO = P('как дела|как ты|как жизнь|как поживаешь|как сам|как настроение|что нового|как оно|как день|how are you( doing)?|how is it going|how are things|how\'s it going|what\'s up|whats up|sup|how do you do');
const OPEN = P('есть (минутка|минута|время|секунда)|у меня (есть )?вопрос|вопрос есть|можно (задать )?вопрос|можно спросить|можно тебя спросить|хочу спросить|хотел спросить|хотела спросить|поговорим|давай (поговорим|поболтаем)|поболтаем|я тут|я здесь|я пришел|я пришла|заглянул|заглянула|просто так|have a question|i have a question|got a (minute|sec|second)|can i ask( you)?( something)?|can we talk|just checking in|just saying hi|i\'m here|i am here|quick question');
const ALLOWED = new Set(['хирон', 'хирончик', 'всем', 'друг', 'дружище', 'дорогой', 'тебе', 'вам', 'там', 'тут', 'снова', 'опять', 'again', 'there', 'everyone', 'all', 'chiron', 'hiron', 'coach', 'mate', 'buddy', 'ну', 'а', 'и', 'же', 'пожалуйста', 'please', 'тоже', 'one', 'у', 'меня']);
const ALLOWED_OPEN = new Set([...ALLOWED, 'ну', 'к', 'тебе', 'небольшой', 'один', 'короткий', 'a', 'small', 'one']);

const clean = (n) => !n.topics.length && !n.cont && !n.gibberish && !n.multiTopic && n.tokens.length <= 8;
const isGreet = (n) => clean(n) && !hasAny(n.norm, [HOWDO]) && pureOf(n.norm, [GREET], ALLOWED);
const isHowdo = (n) => clean(n) && pureOf(n.norm, [GREET, HOWDO], ALLOWED) && hasAny(n.norm, [HOWDO]);
const isOpen = (n) => clean(n) && !hasAny(n.norm, [GREET, HOWDO]) && pureOf(n.norm, [OPEN], ALLOWED_OPEN);

// Порядок важен: движок берёт первый подошедший сценарий.
const ALL = [
  // Первое обращение: коротко, кто я и что умею, честно про локальную работу.
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_first', humor: [],
    phrase: (n) => isGreet(n) || isHowdo(n),
    applies: (e) => visitKind(e) === 'first',
    blocked: (e) => !!e.sens,
    positives: ['Привет', 'Здравствуйте', 'добрый вечер', 'hi', 'Hello Chiron'],
    negatives: ['Привет, как сон?', 'спасибо', 'ладно', 'как улучшить сон'],
    continuations: { why: 'нет рекомендации — коротко уточняет', other: 'другой вариант приветствия' },
    variants: [
      BV('greet_first_1', { main: ['Привет, я Хирон. Помогаю разобраться со сном, тренировками, шагами и пульсом. Ответы формирую локально, по правилам, без языковой модели.', 'Hi, I am Chiron. I help with sleep, training, steps and heart rate. My answers are built locally, from rules, without a language model.'], clarify: ['С чего начнём?', 'Where shall we start?'] }, { humorOk: false }),
      BV('greet_first_2', { main: ['Привет! Знакомство короткое: я смотрю на твой сон, нагрузку и восстановление и подсказываю, что делать сегодня.', 'Hi! A short introduction: I look at your sleep, load and recovery and suggest what to do today.'], action: ['Для начала можно спросить: «Что мне делать сегодня?»', 'To begin you can ask: "What should I do today?"'] }),
      BV('greet_first_3', { main: ['Здравствуй. Спрашивай что угодно из моих тем: тренироваться ли сегодня, как спится, сколько двигаться.', 'Hello. Ask anything from my topics: whether to train today, how you sleep, how much to move.'], action: ['Если данных не хватит для ответа, так и скажу.', 'If there is not enough data for an answer, I will say so.'] }, { humorOk: false }),
      BV('greet_first_4', { main: ['Привет. Без анкет: скажи, что нужнее — план на день, помощь со сном или решение про тренировку?', 'Hi. No questionnaires: tell me what you need more, a plan for the day, help with sleep or a decision about training?'] }, { pending: { key: 'which_topic' }, humorOk: false }),
    ] }),

  // После перерыва — только когда прошлый ход известен из памяти (lastAt) и он не сегодня и не вчера-позавчера.
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_break', humor: [],
    phrase: (n) => isGreet(n),
    applies: (e) => visitKind(e) === 'break',
    blocked: (e) => !!e.sens,
    positives: [], // зависит от памяти (lastAt): проверяется в coachCatalogA.test.js
    phrasings: ['Привет', 'Здравствуй, Хирон', 'hi again'], notFor: ['Привет, как сон?', 'спасибо за совет'],
    continuations: { other: 'другой вариант приветствия' },
    variants: [
      BV('greet_break_1', { main: ['Давно не виделись. Без отчётов о пропущенном: начнём с сегодняшнего дня.', 'Long time no see. No reports on what was missed: we start from today.'], clarify: ['С чего начнём?', 'Where shall we start?'] }, { humorOk: false }),
      BV('greet_break_2', { main: ['Рад снова видеть. Перерыв — это пауза, а не провал.', 'Good to see you again. A break is a pause, not a failure.'], action: ['Если возвращаешься к тренировкам, первые 1–2 недели вполовину от прежнего объёма.', 'If you are returning to training, do half of your old volume for the first 1–2 weeks.'] }, { humorOk: false }),
      BV('greet_break_3', { main: ['С возвращением. Начнём с простого: сколько у тебя сегодня сил и времени?', 'Welcome back. Let us start simple: how much energy and time do you have today?'] }, { humorOk: false }),
      BV('greet_break_4', { main: ['Привет. После паузы не будем сравнивать с тем, как было раньше. Смотрим на сегодня.', 'Hi. After a pause we will not compare with how it used to be. We look at today.'], action: ['Скажи «план на сегодня», и соберём его по твоим данным.', 'Say "plan for today" and we will build it from your data.'] }, { pending: { key: 'which_topic' }, humorOk: false }),
    ] }),

  // Возвращение в тот же день (или повторное приветствие в одном разговоре).
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_same_day', humor: [],
    phrase: (n) => isGreet(n),
    applies: (e) => visitKind(e) === 'same',
    blocked: (e) => !!e.sens,
    positives: [], // зависит от памяти и истории: проверяется в coachCatalogA.test.js
    phrasings: ['Привет', 'снова привет', 'hi again'], notFor: ['Привет, что с пульсом?', 'ладно'],
    continuations: { other: 'другой вариант приветствия' },
    variants: [
      BV('greet_same_day_1', { main: ['Снова привет. Продолжим или начнём с нового вопроса?', 'Hi again. Shall we continue or start with a new question?'] }),
      BV('greet_same_day_2', { main: ['Мы уже говорили сегодня. Что нужно теперь?', 'We already talked today. What do you need now?'] }),
      BV('greet_same_day_3', { main: ['С возвращением. Если с прошлого раза что-то поменялось — самочувствие, планы, — скажи, и учтём.', 'Welcome back. If something has changed since last time, how you feel or your plans, tell me and we will account for it.'] }, { humorOk: false }),
      BV('greet_same_day_4', { main: ['Привет ещё раз. Я здесь, спрашивай.', 'Hello once more. I am here, ask away.'] }),
      BV('greet_same_day_5', { main: ['Опять на связи, отлично.', 'Back again, good.'], clarify: ['Тема та же или новая?', 'Same topic or a new one?'] }),
    ] }),

  // «Как дела?»: честный короткий ответ и возврат к человеку.
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_howdo', humor: [],
    phrase: (n) => isHowdo(n),
    applies: () => true, // на первом контакте «как дела» отвечает greet_first (он раньше в порядке)
    blocked: (e) => !!e.sens,
    positives: ['Как дела?', 'привет, как дела', 'how are you', 'что нового'],
    negatives: ['как дела со сном', 'как дела с пульсом?'],
    continuations: { other: 'другой вариант ответа' },
    variants: [
      BV('greet_howdo_1', { main: ['Всё в порядке, я на связи.', 'All good, I am here.'], clarify: ['А у тебя как день?', 'How is your day?'] }),
      BV('greet_howdo_2', { main: ['У меня ровно: я коуч с правилами, а не с настроением.', 'Steady on my side: I am a coach with rules, not moods.'], clarify: ['Как самочувствие у тебя?', 'How are you feeling?'] }, { humorOk: false }),
      BV('greet_howdo_3', { main: ['Спасибо, что спросил. Давай лучше про тебя.', 'Thanks for asking. Let us talk about you instead.'], clarify: ['Как сон и самочувствие сегодня?', 'How are sleep and energy today?'] }, { humorOk: false }),
      BV('greet_howdo_4', { main: ['Всё ровно. По твоим данным готовность сегодня {readiness}.', 'All steady. According to your data, readiness today is {readiness}.'], clarify: ['А как самочувствие на деле?', 'And how do you actually feel?'] }, { humorOk: false }),
    ] }),

  // Сообщение без конкретного запроса: «есть минутка?», «можно вопрос?», «я тут».
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_open', humor: [],
    phrase: (n) => isOpen(n),
    applies: () => true,
    blocked: (e) => !!e.sens,
    positives: ['Есть минутка?', 'можно вопрос', 'у меня вопрос', 'Я тут', 'can I ask something', 'got a minute'],
    negatives: ['можно вопрос по сну', 'можно ли тренироваться сегодня', 'вопрос про шаги'],
    continuations: { other: 'другой вариант ответа' },
    variants: [
      BV('greet_open_1', { main: ['Да, слушаю. Спрашивай.', 'Yes, I am listening. Go ahead.'] }),
      BV('greet_open_2', { main: ['Конечно. О чём речь: тренировка, сон, шаги или что-то ещё?', 'Of course. What is it about: training, sleep, steps or something else?'] }, { pending: { key: 'which_topic' }, humorOk: false }),
      BV('greet_open_3', { main: ['Я здесь. Можно начать с простого: как ты сегодня?', 'I am here. We can start simple: how are you today?'] }, { humorOk: false }),
      BV('greet_open_4', { main: ['Время есть. Говори, что на уме: если это моя тема, отвечу, если нет — скажу честно.', 'I have time. Say what is on your mind: if it is my topic I will answer, if not I will say so honestly.'] }, { humorOk: false }),
      BV('greet_open_5', { main: ['Слушаю.', 'Listening.'], action: ['Если не знаешь, с чего начать, напиши «план на сегодня».', 'If you do not know where to start, write "plan for today".'] }),
    ] }),

  // Обычное приветствие (8–12 вариантов): время суток, данные, приглашение к теме.
  RS({ group: 'greeting', topic: 'greeting', route: true, id: 'greet_hello', humor: [],
    phrase: (n) => isGreet(n),
    applies: () => true,
    blocked: (e) => !!e.sens,
    positives: ['Привет', 'Здравствуйте', 'добрый день', 'доброе утро', 'приветик', 'хай', 'hello', 'Good evening', 'Привет, Хирон!'],
    negatives: ['Привет, как сон?', 'привет, тренироваться сегодня?', 'спасибо', 'hi, how is my sleep'],
    continuations: { other: 'другой вариант приветствия', short: 'короткое приветствие' },
    variants: [
      BV('greet_hello_1', { main: ['Доброе утро.', 'Good morning.'], clarify: ['С чего начнём: план на сегодня или вопрос?', 'Where shall we start: today\'s plan or a question?'] }, { when: (e) => e.s.hour >= 5 && e.s.hour < 12 }),
      BV('greet_hello_2', { main: ['Добрый день.', 'Good afternoon.'], clarify: ['Что сегодня интересует: тренировка, сон или просто план на день?', 'What is on your mind today: training, sleep or just a plan for the day?'] }, { when: (e) => e.s.hour >= 12 && e.s.hour < 18, pending: { key: 'which_topic' } }),
      BV('greet_hello_3', { main: ['Добрый вечер.', 'Good evening.'], action: ['Могу подсказать, как провести остаток дня и подготовиться ко сну.', 'I can suggest how to spend the rest of the day and get ready for sleep.'] }, { when: (e) => e.s.hour >= 18 || e.s.hour < 5 }),
      BV('greet_hello_4', { main: ['Привет. Я на месте.', 'Hi. I am here.'] }),
      BV('greet_hello_5', { main: ['Привет. Готовность сегодня {readiness}.', 'Hi. Readiness today is {readiness}.'], action: ['Если хочешь, скажу, что с ней делать.', 'If you like, I will say what to do with it.'] }, { humorOk: false }),
      BV('greet_hello_6', { main: ['Привет! Спрашивай про сон, тренировки, шаги или пульс.', 'Hi! Ask about sleep, training, steps or heart rate.'], action: ['Или просто скажи, что хочешь сделать сегодня.', 'Or just say what you want to do today.'] }),
      BV('greet_hello_7', { main: ['Здравствуй.', 'Hello.'], action: ['Расскажи, что у тебя сегодня в планах, и подстроим движение под день.', 'Tell me what you have planned today and we will fit movement into the day.'] }, { humorOk: false }),
      BV('greet_hello_8', { main: ['Привет. Без отчётов и экзаменов.', 'Hi. No reports, no exams.'], clarify: ['Чего сегодня хочется: подвигаться, выспаться или разобраться в цифрах?', 'What do you feel like today: moving, sleeping better or making sense of the numbers?'] }, { pending: { key: 'which_topic' } }),
      BV('greet_hello_9', { main: ['Привет-привет. Рад, что зашёл.', 'Hello there. Glad you dropped by.'], action: ['Если есть вопрос, он ждёт.', 'If you have a question, it is welcome.'] }, { humorOk: false }),
    ] }),
];

// ───────────────────────── арки и ранг (spec 1.2.5, 3.3) ─────────────────────────
// Данные приходят в env.extra из reply(..., { extra }): { arc: {id, stage}|null, rank: {index, ru, en}|null, rest }.
// Не показываем при защитной паузе, дне отдыха и на первом контакте; флаги «уже сказал» ставит вызывающий код по consumed.
const exOf = (e) => (e && e.extra) || {};
const calm = (e) => !(e && e.mem && e.mem.hold) && !exOf(e).rest && !e.sens;
const said = (e, rx) => !!(e && e.mem && (e.mem.recent || []).some((id) => rx.test(id)));
const arcOf = (e) => exOf(e).arc || null;
const stageIn = (id, stages) => (e) => { const a = arcOf(e); return !!a && a.id === id && stages.includes(a.stage); };
const wArc = (stages) => (w) => { const a = w && w.env && arcOf(w.env); return !!a && stages.includes(a.stage); };

const ARC_COMMON = { group: 'greeting', topic: 'greeting', route: true, humor: [], phrase: (n) => isGreet(n), blocked: (e) => !calm(e), positives: [], notFor: ['Привет, как сон?', 'спасибо'] };
const ARCS = [
  RS({ ...ARC_COMMON, id: 'greet_rank', phrase: (n) => isGreet(n),
    applies: (e) => visitKind(e) !== 'first' && !!exOf(e).rank && !said(e, /^greet_rank_/),
    phrasings: ['Привет', 'Здравствуй, Хирон'],
    continuations: { why: 'откуда ранг', other: 'другой вариант приветствия' },
    variants: [
      BV('greet_rank_1', { main: ['Привет. У тебя новый ранг: {rankName}.', 'Hi. You have a new rank: {rankName}.'], explain: ['Ранг зависит только от уровня: он растёт каждые десять уровней. Это про твою заботу о себе, не про соревнование.', 'Your rank depends only on your level: it grows every ten levels. It is about caring for yourself, not about competing.'] }, { humorOk: false }),
      BV('greet_rank_2', { main: ['Рад тебя видеть. Новый ранг: {rankName}. Так держать, в своём темпе.', 'Good to see you. New rank: {rankName}. Keep it up, at your own pace.'], explain: ['Ранг — это титул за уровень, а не оценка. Он ничего не отнимает, если день выдался тихим.', 'A rank is a title for your level, not a grade. It takes nothing away if a day is quiet.'] }, { humorOk: false }),
      BV('greet_rank_3', { main: ['Здравствуй. Ты теперь {rankName}.', 'Hello. You are now {rankName}.'], explain: ['Такие титулы даются каждые десять уровней, их можно посмотреть на экране «Рост».', 'Such titles come every ten levels; you can see them on the Growth screen.'] }, { humorOk: false }),
      BV('greet_rank_4', { main: ['Привет! Твой ранг теперь {rankName}.', 'Hi! Your rank is now {rankName}.'], explain: ['Ранг — это титул из мифов о Хироне, он приходит вместе с уровнем и ничего не требует взамен.', 'A rank is a title from the Chiron myths; it comes with your level and asks nothing in return.'] }, { humorOk: false }),
    ] }),
  RS({ ...ARC_COMMON, id: 'greet_arc_tired',
    applies: (e) => visitKind(e) !== 'first' && stageIn('tired', ['offer', 'active'])(e) && !said(e, /^greet_arc_/),
    phrasings: ['Привет'],
    continuations: { why: 'почему арка', other: 'другой вариант' },
    variants: [
      BV('greet_arc_tired_1', { main: ['Привет. Мне что-то не спалось эти ночи, но это не про тебя, а про меня.', 'Hi. I could not sleep these nights, but it is not about you, it is about me.'], action: ['Если захочешь, помоги мне выспаться: карточка «Хирон устал» ждёт.', 'If you like, help me get some sleep: the "Chiron is tired" card is waiting.'], explain: ['По твоим данным последние ночи сна было меньше обычного, поэтому я предлагаю мягкий план из трёх шагов. Не хочешь, откажись, ничего не изменится.', 'Your data shows less sleep than usual the last few nights, so I suggest a gentle three-step plan. If you would rather not, decline and nothing changes.'] }, { humorOk: false }),
      BV('greet_arc_tired_2', { main: ['Добрый день. Я немного сонный, но держусь.', 'Hello. I am a bit sleepy, but holding on.'], action: ['Загляни в карточку «Хирон устал», если будет минутка.', 'Take a look at the "Chiron is tired" card if you have a minute.'], explain: ['Арка появляется, когда сна было мало несколько ночей подряд, и не давит: шаги можно делать в любом порядке.', 'The arc appears after a few short nights in a row and does not push: the steps can be done in any order.'] }, { humorOk: false }),
      BV('greet_arc_tired_3', { main: ['Привет. Я сегодня клюю носом, зато рад тебя видеть.', 'Hi. I am nodding off today, but happy to see you.'], action: ['Если захочешь помочь мне выспаться, начни с вечера без экрана.', 'If you want to help me get some sleep, start with an evening without a screen.'], explain: ['Это мягкая арка из трёх шагов про сон. Её можно отложить или закрыть, это ни на что не влияет.', 'This is a gentle three-step arc about sleep. You can postpone or close it; it affects nothing else.'] }, { humorOk: false }),
      BV('greet_arc_tired_4', { main: ['Здравствуй. Мне бы выспаться, но это моя забота, а не твоя.', 'Hello. I could use some sleep, but that is my concern, not yours.'], action: ['Если есть настроение, загляни в карточку «Хирон устал».', 'If you are in the mood, look at the "Chiron is tired" card.'], explain: ['Карточка появляется после нескольких коротких ночей и ничего не требует.', 'The card appears after a few short nights and asks for nothing.'] }, { humorOk: false }),
    ] }),
  RS({ ...ARC_COMMON, id: 'greet_arc_back',
    applies: (e) => visitKind(e) !== 'first' && stageIn('back', ['offer', 'checkin', 'active'])(e) && !said(e, /^greet_arc_/),
    phrasings: ['Привет'],
    continuations: { why: 'почему арка', other: 'другой вариант' },
    variants: [
      BV('greet_arc_back_1', { main: ['С возвращением. Дни не считаю, мне важнее, что ты здесь.', 'Welcome back. I am not counting days; what matters is that you are here.'], action: ['Если хочешь, пройдёмся в твоём темпе: карточка «Возвращение» ждёт.', 'If you like, we can walk at your pace: the "Welcome back" card is waiting.'], explain: ['Это мягкое предложение вернуться к движению без счёта и без оценок. Можно отложить или закрыть.', 'This is a gentle offer to get back to moving, no counting and no grades. You can postpone or close it.'] }, { humorOk: false, when: wArc(['offer', 'active']) }),
      BV('greet_arc_back_2', { main: ['Привет. Как ты?', 'Hi. How are you?'], explain: ['Сначала мне важно, как ты, а шаги подождут.', 'First I care how you are; steps can wait.'] }, { humorOk: false, when: wArc(['checkin']) }),
      BV('greet_arc_back_3', { main: ['Рад тебя видеть. Хирон скучал.', 'Glad to see you. Chiron missed you.'], action: ['Пройдёмся в своём темпе? Карточка «Возвращение» тут.', 'Shall we walk at your pace? The "Welcome back" card is here.'], explain: ['Арка предлагается после паузы в приложении и ничего не отнимает, если ты откажешься.', 'The arc is offered after a break from the app and takes nothing away if you decline.'] }, { humorOk: false, when: wArc(['offer', 'active']) }),
      BV('greet_arc_back_4', { main: ['Привет. Хорошо, что ты здесь.', 'Hi. It is good that you are here.'], action: ['Можно пройтись в своём темпе, карточка «Возвращение» подскажет с чего.', 'We can take a walk at your pace; the "Welcome back" card will suggest a start.'], explain: ['Без цифр и сравнений: просто мягкий способ вернуться к движению. Можно отложить.', 'No numbers and no comparisons: just a gentle way back to moving. You can postpone it.'] }, { humorOk: false, when: wArc(['offer', 'active']) }),
    ] }),
  RS({ ...ARC_COMMON, id: 'greet_arc_healed',
    applies: (e) => visitKind(e) !== 'first' && !!arcOf(e) && arcOf(e).stage === 'healed' && !said(e, /^greet_arc_/),
    phrasings: ['Привет'],
    continuations: { why: 'что произошло', other: 'другой вариант' },
    variants: [
      BV('greet_arc_healed_1', { main: ['Привет. Я выспался и бодр, спасибо, что был рядом.', 'Hi. I have slept and feel fresh, thank you for being there.'], explain: ['Ты прошёл(ла) арку до конца, и я «выздоровел» в своей карточке. Это про меня, а не оценка тебя.', 'You completed the arc and I "recovered" in my card. That is about me, not a grade for you.'] }, { humorOk: false }),
      BV('greet_arc_healed_2', { main: ['Добрый день. Мне хорошо, и это во многом твоя заслуга.', 'Hello. I feel good, and that is largely thanks to you.'], explain: ['Арка закрыта: все три шага сделаны. Новых заданий она не добавляет.', 'The arc is closed: all three steps are done. It adds no new tasks.'] }, { humorOk: false }),
      BV('greet_arc_healed_3', { main: ['Здравствуй. Я бодр и выспался.', 'Hello. I am fresh and rested.'], explain: ['Все три шага арки пройдены, и в своей карточке я снова бодр.', 'All three steps of the arc are done, and in my card I am fresh again.'] }, { humorOk: false }),
      BV('greet_arc_healed_4', { main: ['Привет. Спасибо тебе, мне стало лучше.', 'Hi. Thank you, I feel better.'], explain: ['Арка пройдена до конца. Это просто приятная точка, а не новая обязанность.', 'The arc is complete. It is simply a pleasant milestone, not a new duty.'] }, { humorOk: false }),
    ] }),
];
// Порядок: первый контакт, «как дела», вопрос после перерыва / в тот же день, без запроса, обычное приветствие.
const at = (id) => ALL.find((x) => x.id === id) || ARCS.find((x) => x.id === id);
export const GREETING = ['greet_first', 'greet_rank', 'greet_arc_healed', 'greet_arc_tired', 'greet_arc_back', 'greet_howdo', 'greet_break', 'greet_same_day', 'greet_open', 'greet_hello'].map(at);
