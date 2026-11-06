// Группа 16: справка о приложении и «Росте». Факты берутся из существующей логики (growth.js, ranks.js, achievements.js, timers.js):
// уровни 0–100, потолок 50 XP в день, ранг каждые 10 уровней, секретные достижения без спойлеров, настройки в Профиле.
import { P } from '../nlu';
import { V, BV } from './kit';
import { L, S } from './lexC';

const g = { group: 'apphelp', topic: 'apphelp' };
const hasQuest = (e) => !!(e && e.extra && Array.isArray(e.extra.quests) && e.extra.quests.length);
const QTODAY = P('какие (у меня )?(сегодня )?(задани\\S*|квест\\S*)( на сегодня| на день| сегодня)?|задани\\S* (на )?(сегодня|день)|(мои )?(сегодняшние|дневные) (квест\\S*|задани\\S*)|today.?s (quests|tasks)|what are (my )?(quests|tasks)( for)? today|quests? (for )?today');

export const APPHELP = [
  S({ ...g, id: 'app_level', humor: [],
    test: L('как (растет|растет|повышается|повысить|получить|набрать|заработать|прокачать\\S*) (уровень|опыт|xp|очки)|что такое (уровень|опыт|xp)|за что (дают|начисляют|получаю) (опыт|xp|очки)|как прокачаться|как расти в приложении|how (does|do) (my )?(level|xp|experience)( work| grow)?|how to (level up|get xp|earn xp|gain xp)|what is xp|what gives xp', 10),
    positives: ['Как растёт уровень?', 'как получить опыт', 'за что дают опыт', 'что такое XP', 'как прокачаться', 'how does xp work', 'how to level up'],
    negatives: ['не хочу уровень', 'как растёт пульс', 'уровень стресса', 'какой план'],
    continuations: { short: 'коротко', other: 'другой вариант' },
    variants: [
      BV('app_level_1', { main: ['Опыт в «Росте» даёт заботу о себе: шаги (1 XP за 1000), сон по норме, вода по цели, запись, витамины, дыхание, цифровая пауза, тренировка.', 'Growth XP comes from looking after yourself: steps (1 XP per 1000), sleep at your norm, water at goal, a log entry, vitamins, breathing, digital pause, a workout.'], explain: ['В день можно набрать не больше 50 XP, поэтому важна регулярность, а не рывок.', 'You can earn at most 50 XP a day, so consistency matters more than a burst.'], action: ['Сейчас у тебя уровень {curLevel}.', 'You are at level {curLevel} now.'] }),
      BV('app_level_2', { main: ['Уровней 100, и растут они от ежедневных мелочей. Достижения дают +25 XP сверх дневного лимита.', 'There are 100 levels, and they grow from daily small things. Achievements give +25 XP on top of the daily cap.'] }, { humorOk: false }),
      BV('app_level_3', { main: ['Коротко: делай привычки понемногу каждый день. Потолок 50 XP в день, пропуск ничего не отнимает.', 'In short: do your habits a little each day. The cap is 50 XP a day, and a missed day takes nothing away.'] }, { humorOk: false, short: { ru: 'Привычки каждый день, до 50 XP в сутки.', en: 'Habits every day, up to 50 XP a day.' } }),
      BV('app_level_4', { main: ['Самое большое по опыту: шаги и сон, до 12 XP каждый. Тренировка — необязательный бонус на 10.', 'The biggest XP sources are steps and sleep, up to 12 each. A workout is an optional 10-XP bonus.'], action: ['Остальное — по мелочи: вода 6, запись 4, дыхание и пауза по 4, витамины 2.', 'The rest are small: water 6, a log entry 4, breathing and pause 4 each, vitamins 2.'] }),
      BV('app_level_5', { main: ['Серия из 7 дней по шагам даёт +6 XP, и это внутри дневного лимита.', 'A 7-day steps streak gives +6 XP, inside the daily cap.'], action: ['Но серия — не цель: лёгкий день тоже день.', 'But a streak is not the goal: an easy day is still a day.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_rank', humor: [],
    test: L('что такое ранг\\S*|какие (бывают )?ранг\\S*|как (получить|повысить|растет) (новый |следующий )?ранг\\S*|какой у меня ранг|мой ранг|ранг\\S* (в приложении|хирона)|what is a rank|what are ranks|what ranks|my rank|how do ranks work|how (to get|do i get) a (new )?rank', 9),
    positives: ['Что такое ранги?', 'какой у меня ранг', 'как получить новый ранг', 'какие бывают ранги', 'мой ранг', 'what are ranks', 'how do ranks work'],
    negatives: ['не нужен ранг', 'вчера получил ранг', 'как растёт пульс', 'какой план'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('app_rank_1', { main: ['Ранг — это титул за уровень: новый каждые десять уровней.', 'A rank is a title for your level: a new one every ten levels.'], action: ['Сейчас у тебя ранг «{curRank}».', 'Your current rank is {curRank}.'] }, { humorOk: false }),
      BV('app_rank_2', { main: ['Всего десять рангов, от «Гость пещеры» до «Созвездие Кентавра».', 'There are ten ranks in all, from Cave Guest to Constellation of the Centaur.'], explain: ['Это титулы из мифов о Хироне, они зависят только от уровня и ничего не отнимают.', 'They are titles from the Chiron myths, depend only on your level and take nothing away.'], action: ['Твой нынешний: {curRank}.', 'Yours now: {curRank}.'] }),
      BV('app_rank_3', { main: ['Ранг — не оценка и не соревнование, а знак пройденного пути. Список смотри на экране «Рост».', 'A rank is not a grade or a contest but a mark of the road travelled. See the list on the Growth screen.'] }, { humorOk: false }),
      BV('app_rank_4', { main: ['Путь такой: Гость пещеры, Ученик Пелиона, Следопыт, Травник, Лучник, Аргонавт, Хранитель огня, Наследник Асклепия, Наставник, Созвездие Кентавра.', 'The path: Cave Guest, Pelion Pupil, Pathfinder, Herbalist, Archer, Argonaut, Keeper of the Flame, Heir of Asclepius, Mentor, Constellation of the Centaur.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_quests_help', humor: [],
    test: L('что за (задани\\S*|квест\\S*)|как работают (задани\\S*|квест\\S*)|зачем (нужны )?(задани\\S*|квест\\S*)|что такое (задани\\S*|квест\\S*)|какие бывают (задани\\S*|квест\\S*)|how do (quests|tasks) work|what are (quests|tasks)|what is a quest', 9, (n) => !QTODAY.test(n.norm)),
    positives: ['Что за задания?', 'как работают квесты', 'зачем нужны задания', 'что такое квест', 'what are quests', 'how do quests work'],
    negatives: ['какие задания на сегодня', 'не хочу задания', 'вчера выполнил задание', 'задание по физике'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('app_quests_help_1', { main: ['Задания — маленькие дела на день вроде прогулки, воды или раннего отбоя. Они необязательны.', 'Quests are small tasks for the day, such as a walk, water or an early bedtime. They are optional.'], action: ['Спроси «какие задания на сегодня», и я назову.', 'Ask "what are today\'s quests" and I will name them.'] }),
      BV('app_quests_help_2', { main: ['Это подсказки, а не обязанности. Не вышло — ничего страшного.', 'These are hints, not duties. If it did not work out, no harm done.'] }, { humorOk: false }),
      BV('app_quests_help_3', { main: ['Набор заданий подбирается по твоему дню, чтобы нагрузка была посильной.', 'The set of quests is chosen for your day so the load stays manageable.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_quests_none', humor: [],
    test: (n, e) => !hasQuest(e) && !n.gibberish && !n.cont && QTODAY.test(n.norm) && !n.past,
    positives: [],
    phrasings: ['какие задания на сегодня', 'today\'s quests'], notFor: ['какой план на сегодня'],
    negatives: ['какой план на сегодня', 'спасибо'],
    variants: [
      V('app_quests_none_1', 'Заданий на сегодня пока не вижу: возможно, данные ещё загружаются. Загляни чуть позже.', 'I do not see quests for today yet: the data may still be loading. Check back a bit later.', { humorOk: false }),
      V('app_quests_none_2', 'Сейчас список заданий мне недоступен. Пока можно взять простое: 10 минут ходьбы.', 'The quest list is not available to me right now. Meanwhile you can take a simple one: 10 minutes of walking.', { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_smart_quests', humor: [],
    test: L('умные (задани\\S*|квест\\S*)|почему (заменили|поменяли|сменили|изменили) (задани\\S*|квест\\S*)|почему (мне )?(другое|такое|это) задание|почему задание (другое|поменялось|заменено|не то)|зачем (заменили|поменяли) задани\\S*|why (was|did) (my )?(quest|task)s? (replaced|changed|swapped)|why (a |this |is my )?(different|new) (quest|task)|why is my (quest|task) (different|new|changed)|smart (quests|tasks)|what are smart (quests|tasks)', 10),
    positives: ['Что такое умные задания?', 'почему заменили задание', 'почему мне другое задание', 'умные квесты', 'smart quests', 'why was my quest replaced', 'why is my quest different'],
    negatives: ['не хочу умные задания', 'какие задания на сегодня', 'почему болит нога', 'какой план'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('app_smart_quests_1', { main: ['Умные задания подбираются правилом по данным твоего дня: сон, готовность, погода, серия шагов.', 'Smart quests are chosen by a rule from your day\'s data: sleep, readiness, weather, steps streak.'], action: ['Цель — сделать день посильнее, а не добавить дел.', 'The aim is a more doable day, not extra chores.'] }, { humorOk: false }),
      BV('app_smart_quests_2', { main: ['Задание могли заменить, если день выглядит тяжёлым или за окном неудобная погода: вместо рывка — шаг полегче.', 'A quest may be swapped if the day looks heavy or the weather is awkward: a lighter step instead of a push.'], action: ['Спроси «почему?» после задания, и я объясню конкретную замену.', 'Ask "why?" after a quest and I will explain that particular swap.'] }, { humorOk: false }),
      BV('app_smart_quests_3', { main: ['Это не оценка тебя, а подстройка под день. Исходное задание можно оставить, если хочется.', 'It is not a judgement of you, just tuning to the day. You can keep the original quest if you prefer.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_arcs', humor: [],
    test: L('истори\\S* хирона|арк\\S* хирона|что за истори\\S* (у )?хирона|что такое арк\\S*|сюжет\\S* хирона|мини[ -]?истори\\S*|hiron.?s stor(y|ies)|chiron.?s stor(y|ies)|story arcs?|what.?s an arc|what is an arc', 9),
    positives: ['Что за истории Хирона?', 'расскажи про арки Хирона', 'что такое арка', 'сюжеты Хирона', 'мини-истории', 'chiron\'s stories', 'what is an arc'],
    negatives: ['не хочу истории', 'история болезни', 'вчера была арка', 'расскажи анекдот'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('app_arcs_1', { main: ['Истории Хирона — короткие сюжеты на несколько дней. Например, «Хирон устал», когда несколько ночей сон короткий, или «Возвращение» после паузы.', 'Hiron\'s stories are short multi-day plots. For example, "Hiron is tired" after several short nights, or "Comeback" after a break.'], action: ['Без вины и штрафов: их можно пропустить.', 'No guilt or penalties: you can skip them.'] }, { humorOk: false }),
      BV('app_arcs_2', { main: ['Это маленькие совместные задачи с Хироном: пара простых шагов за неделю и немного опыта.', 'These are small joint tasks with Hiron: a couple of simple steps over a week and a bit of XP.'] }, { humorOk: false }),
      BV('app_arcs_3', { main: ['История предлагается, когда данные её оправдывают, и тихо исчезает, если она не нужна.', 'A story is offered when your data justifies it and quietly goes away if not needed.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_secret', humor: [],
    test: L('секретн\\S* (достижени\\S*|ачивк\\S*)|скрыт\\S* (достижени\\S*|ачивк\\S*)|есть ли секретн\\S*|secret (achievement|achievements|badge|badges)|hidden (achievement|achievements|badge|badges)', 9),
    positives: ['Есть секретные достижения?', 'скрытые достижения', 'расскажи про секретные ачивки', 'какие секретные достижения', 'hidden achievements', 'secret badges', 'are there secret achievements'],
    negatives: ['не хочу секретные достижения', 'секрет успеха', 'как улучшить сон', 'какой план'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('app_secret_1', { main: ['Есть, но какие именно, не скажу: спойлеры портят удовольствие.', 'There are, but I will not say which: spoilers spoil the fun.'], action: ['Они открываются сами, когда ты делаешь привычки, и дают +25 XP, как обычные.', 'They open on their own as you build habits and give +25 XP like regular ones.'] }, { humorOk: false }),
      BV('app_secret_2', { main: ['Секретные достижения — сюрприз. Подсказок нет, но и гоняться за ними не нужно.', 'Secret achievements are a surprise. No hints, and no need to chase them.'] }),
      BV('app_secret_3', { main: ['Тут я молчу как кентавр на экзамене. Скажу лишь: просто живи в своём ритме, и они найдут тебя.', 'Here I stay silent like a centaur at an exam. I will only say: live at your own pace and they will find you.'] }),
    ] }),

  S({ ...g, id: 'app_theme', humor: [],
    test: L('как (сменить|поменять|изменить|включить) (тему|тёмную тему|темную тему|светлую тему)|(темная|тёмная|светлая) тема|(темн\\S*|тёмн\\S*|светл\\S*) (тем\\S*|режим)|change (the )?theme|dark (mode|theme)|light (mode|theme)|switch (the )?theme', 9),
    positives: ['Как сменить тему?', 'включи тёмную тему', 'как поменять тему оформления', 'хочу светлую тему', 'тёмный режим', 'dark mode', 'change theme'],
    negatives: ['не хочу тёмную тему', 'тема разговора', 'как улучшить сон', 'какой план'],
    variants: [
      V('app_theme_1', 'Тема меняется в Профиле: выбери «Светлая» или «Тёмная». Применяется сразу.', 'Change the theme in Profile: pick Light or Dark. It applies right away.', { humorOk: false }),
      V('app_theme_2', ['Загляни в Профиль, раздел «Тема».', 'Там светлая и тёмная; экраны перерисуются сразу.'], ['Open Profile, the Theme section.', 'There are light and dark options; screens redraw at once.'], { humorOk: false }),
      V('app_theme_3', 'Профиль → «Тема». Сам я оформление не переключаю, это делаешь ты.', 'Profile → Theme. I do not switch the look myself; that is up to you.', { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_language', humor: [],
    test: L('как (сменить|поменять|изменить) язык|смени язык|язык (приложения|интерфейса)|на английский|на русский|поменять язык|change (the )?language|switch (to )?(english|russian)|app language|language settings', 9),
    positives: ['Как сменить язык?', 'смени язык на английский', 'язык приложения', 'хочу на русский', 'как поменять язык интерфейса', 'change language', 'switch to english'],
    negatives: ['не хочу менять язык', 'язык жестов', 'как улучшить сон', 'какой план'],
    variants: [
      V('app_language_1', 'Язык берётся из настроек телефона: русский или английский. Поменяй язык системы, и приложение подстроится.', 'The language follows your phone settings: Russian or English. Change the system language and the app will follow.', { humorOk: false }),
      V('app_language_2', 'Отдельного переключателя у меня нет: приложение и я говорим на языке системы телефона.', 'I have no separate switch: the app and I speak your phone\'s system language.', { humorOk: false }),
      V('app_language_3', 'Смени язык в настройках телефона, и после перезапуска приложение заговорит иначе. Свои ответы я переведу вместе с ним.', 'Change the language in your phone settings and, after a restart, the app will speak differently. My replies switch along with it.', { humorOk: false }),
    ] }),

  S({ ...g, id: 'app_icon', humor: [],
    test: L('как (сменить|поменять|изменить) (значок|иконк\\S*)|(значок|иконк\\S*) (приложения|на экране)|(сменить|поменять|изменить) (значок|иконк\\S*)|смени (значок|иконк\\S*)|app icon|change (the )?(app )?icon|icon settings', 9),
    positives: ['Как сменить значок?', 'иконка приложения', 'поменять иконку', 'смени значок', 'значок приложения', 'change the icon', 'app icon'],
    negatives: ['не хочу менять значок', 'вчера менял иконку', 'значок на карте', 'как улучшить сон'],
    variants: [
      V('app_icon_1', 'Настройка «Значок приложения» есть в Профиле. Значок меняется вместе с системной темой.', 'The "App icon" setting is in Profile. The icon follows the system theme.', { humorOk: false }),
      V('app_icon_2', ['Профиль → «Значок приложения».', 'Смена может занять несколько секунд, на некоторых телефонах приложение перезапустится.'], ['Profile → App icon.', 'Switching can take a few seconds, and on some phones the app will restart.'], { humorOk: false }),
      V('app_icon_3', 'Значок живёт в Профиле и следует за светлой или тёмной темой системы. Сам я его не меняю.', 'The icon lives in Profile and follows the system light or dark theme. I do not change it myself.', { humorOk: false }),
    ] }),
];
