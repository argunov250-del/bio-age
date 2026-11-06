// Дополнения к частым сценариям (приветствие, план, шаги, сон, мотивация, «спасибо», «не понял», справка): новые варианты подачи
// и новые формулировки, без правки файлов групп. Рекомендации прежние ({baseTrain}, {readiness}, 10 минут ходьбы, сон раньше):
// меняется подача, а не совет. Формулировки добавляются «псевдонимами»: слово целиком заменяется на привычную фразу и
// проходит прежнее правило сценария, поэтому все его условия (первый визит, перерыв, защитная пауза) сохраняются.
import { V, BV } from './kit';
import { W, S, noAct } from './lexC';

const num = (x) => typeof x === 'number' && isFinite(x);

// Псевдонимы: целое сообщение по rx -> стандартная фраза (ru/en) для правила сценария.
const ALIAS = [
  { ids: ['greet_first', 'greet_hello', 'greet_same_day', 'greet_break', 'greet_rank', 'greet_arc_healed', 'greet_arc_tired', 'greet_arc_back'],
    rx: /^(приветики|приветульки|приветствую вас|хэлоу|хеллоу|хелло|дарова|здарова|салам|ку|ку ку|куку|привет привет|hiya|heya|hey there|hello there|hey hey|hallo|heyo)$/, ru: 'привет', en: 'hello' },
  { ids: ['plan_today'],
    rx: /^(какие (у нас |у меня )?планы( на сегодня| на день)?|что у нас на сегодня|что планируем( сегодня)?|что сегодня делать то|что сегодня по делам|чем сегодня заняться то|what is the plan( for today| today)?|whats the plan( for today| today)?|what are we doing today)$/, ru: 'что делать сегодня', en: 'what should i do today' },
  { ids: ['steps_today'],
    rx: /^(шагов сколько( сегодня)?|сколько (щас|сейчас|уже) шагов|сколько (нашагал|нашагала|намотал|намотала)( шагов| сегодня)?|скок шагов (намотал|нашагал)|step count( today)?|how many steps (have i|did i) (done|taken|walked)( today)?|steps so far)$/, ru: 'сколько шагов сегодня', en: 'how many steps today' },
  { ids: ['mot_lazy'],
    rx: /^((мне )?(в лом|лом|впадлу)( \S+){0,2}|so lazy( today)?|cant be bothered|cba)$/, ru: 'мне лень', en: 'i am lazy' },
];
const aliasWrap = (by) => ALIAS.forEach((a) => a.ids.forEach((id) => {
  const sc = by[id];
  if (!sc || !sc.match) return;
  const m = sc.match;
  sc.match = (n, e) => {
    if (m(n, e)) return true;
    if (n.gibberish || n.cont || !a.rx.test(n.norm)) return false;
    const norm = /[а-яё]/.test(n.norm) ? a.ru : a.en;
    return m({ ...n, norm, tokens: norm.split(' ') }, e);
  };
}));

const NEWV = {
  greet_hello: [
    BV('greet_hello_10', { main: ['Привет. Сегодня без спешки: что бы ни случилось, начнём с малого.', 'Hi. No rush today: whatever happens, we start small.'], action: ['Скажи, чего хочется: двигаться, выспаться или разобраться в цифрах.', 'Say what you feel like: moving, sleeping or making sense of the numbers.'] }, { humorOk: false }),
    BV('greet_hello_11', { main: ['Рад тебя видеть.', 'Good to see you.'], action: ['Если есть вопрос по сну, шагам или тренировке, спрашивай.', 'If you have a question about sleep, steps or training, go ahead.'] }),
    BV('greet_hello_12', { main: ['Привет! Я тут, никуда не убегал.', 'Hi! I am here, I did not run off.'], clarify: ['С чем сегодня поможем?', 'What can we help with today?'] }),
    BV('greet_hello_13', { main: ['Здравствуй. День у каждого свой, и мой план на него простой: слушать тебя.', 'Hello. Every day is different, and my plan for it is simple: to listen to you.'], action: ['Что у тебя на уме?', 'What is on your mind?'] }, { humorOk: false }),
  ],
  plan_today: [
    BV('plan_today_b1', { main: ['Сегодня достаточно одного дела для тела. Про него: {baseTrain}', 'Today one thing for the body is enough. About it: {baseTrain}'], action: ['Всё остальное — по настроению.', 'Everything else is as you feel.'] }),
    BV('plan_today_b2', { main: ['Разложим день на три куска: утро, день, вечер.', 'Let us split the day into three parts: morning, day, evening.'], action: ['В каждом по одному маленькому действию: вода, движение, ранний отбой.', 'One small action in each: water, movement, an early night.'] }, { humorOk: false }),
    BV('plan_today_b3', { main: ['Готовность {readiness}: день подстроим под неё.', 'Readiness {readiness}: we will shape the day around it.'], action: ['Про тренировку: {baseTrain}', 'About training: {baseTrain}'] }, { humorOk: false }),
    BV('plan_today_b4', { main: ['Если совсем коротко: двигайся понемногу, пей воду и ложись вовремя.', 'In short: move a little, drink water and go to bed on time.'], action: ['Про тренировку сегодня: {baseTrain}', 'About training today: {baseTrain}'] }),
  ],
  steps_today: [
    BV('steps_today_10', { main: ['Среднее за 7 дней — {steps7|full} в день; отдельной цифры за сегодня у меня нет.', 'The 7-day average is {steps7|full} a day; I have no separate number for today.'], action: ['Точный счёт смотри на часах или в приложении-источнике.', 'For the exact count, look at the watch or the source app.'] }, { humorOk: false }),
    BV('steps_today_11', { main: ['За неделю выходит {steps7|full} в день.', 'Over the week it comes to {steps7|full} a day.'], action: ['Число за сегодня я не выделяю, чтобы не выдавать среднее за один день.', 'I do not single out today, so as not to pass an average off as one day.'] }),
    V('steps_today_12', 'Шагов за сегодня я не вижу. Источник не передал значения, и это не ноль шагов, а отсутствие данных.', 'I do not see steps for today. The source has not passed values, and that is not zero steps but missing data.', { humorOk: false, when: (w) => !(w.env && w.env.s && num(w.env.s.steps7)) }),
  ],
  sleep_last_night: [
    BV('sleep_last_7', { main: ['Прошлая ночь — {sleepH}.', 'Last night: {sleepH}.'], action: ['Это длина сна, а самочувствие ты оцениваешь сам.', 'That is the length of sleep; how you feel is for you to judge.'] }, { humorOk: false }),
    BV('sleep_last_8', { main: ['По записи ты спал {sleepH}.', 'By the record you slept {sleepH}.'], explain: ['Одна ночь — не картина недели, поэтому смотрю и на среднее за 7 дней: {sleep7}.', 'One night is not the picture of a week, so I also look at the 7-day average: {sleep7}.', ['sleep7']] }),
    BV('sleep_last_9', { main: ['Сон за последнюю ночь: {sleepH}.', 'Sleep for the last night: {sleepH}.'], action: ['Про вечер: приглушённый свет и телефон подальше помогают лечь вовремя.', 'About the evening: dim light and the phone away help you go to bed on time.'] }),
  ],
  mot_lazy: [
    BV('mot_lazy_x1', { main: ['Лень — не приговор. Договоримся на пять минут: если не пойдёт, останавливаемся.', 'Laziness is not a verdict. Let us agree on five minutes: if it does not work, we stop.'], action: ['Чаще всего втягиваешься сам.', 'Most often you get into it yourself.'] }),
    BV('mot_lazy_x2', { main: ['Тогда выбери самое лёгкое: 10 минут ходьбы или пара растяжек.', 'Then pick the lightest: 10 minutes of walking or a couple of stretches.'], action: ['Остальное можно отложить без вины.', 'The rest can wait, no guilt.'] }, { humorOk: false }),
    BV('mot_lazy_x3', { main: ['Не буду уговаривать. Скажи только, во сколько сможешь выйти, пусть даже на пять минут.', 'I will not talk you into it. Just tell me when you could step out, even for five minutes.'] }, { humorOk: false }),
  ],
  ctl_thanks: [
    V('ctl_thanks_11', 'Пожалуйста. Береги себя.', 'You are welcome. Take care.', { humorOk: false }),
    V('ctl_thanks_12', 'Рад, что получилось помочь.', 'Glad I could help.', { humorOk: false }),
    V('ctl_thanks_13', 'Всегда рад. Будет вопрос, пиши.', 'Always glad. Write if you have a question.', { humorOk: true }),
    V('ctl_thanks_14', 'Не за что. Остальное, как всегда, за тобой.', 'No worries. The rest, as always, is up to you.', { humorOk: false }),
  ],
  scope_unknown: [
    V('scope_unknown_11', 'С этим у меня нет готового ответа. Я понимаю сон, тренировки, шаги, пульс и привычки, а ещё немного болтаю.', 'I have no ready answer for that. I understand sleep, training, steps, heart rate and habits, and can chat a little.'),
    V('scope_unknown_12', 'Не совсем понял. Скажи иначе, например: «как сон», «план на сегодня» или «сколько воды пить».', 'I did not quite get that. Say it another way, for example: "how is my sleep", "plan for today" or "how much water to drink".', { humorOk: false }),
    V('scope_unknown_13', 'Тут мой каталог молчит. Это не отговорка: у меня сценарии, а не языковая модель, поэтому лучше короче и по теме.', 'My catalog is silent here. It is not an excuse: I have scenarios, not a language model, so shorter and on topic works best.', { humorOk: false }),
    V('scope_unknown_14', 'Похоже, это не про здоровье и привычки. Хочешь, вернёмся к плану на день?', 'This does not look like health and habits. Shall we go back to the plan for the day?', { humorOk: false }),
  ],
  cap_humor_off: [
    V('cap_humor_off_3', 'Постоянно — в Профиле, «Юмор Хирона»: «Без шуток», «В меру» или «Побольше». А в разговоре хватит слов «без шуток».', 'Permanently in Profile, Hiron\'s humor: No jokes, Balanced or More. In the chat, the words "no jokes" are enough.', { humorOk: false }),
    V('cap_humor_off_4', 'Шутки отключаются в Профиле, пункт «Юмор Хирона». Когда они выключены, я не шучу и по просьбе.', 'Jokes are turned off in Profile under Hiron\'s humor. When they are off, I do not joke even on request.', { humorOk: false }),
  ],
  cap_clear: [
    V('cap_clear_x1', 'Сам себя очистить не могу: открой Профиль и нажми «Очистить память Хирона». Переписка и мои заметки о разговоре исчезнут, Health Connect останется как был.', 'I cannot clear myself: open Profile and tap Clear Hiron\'s memory. The chat and my notes about the talk will disappear, Health Connect stays as it was.', { humorOk: false }),
    V('cap_clear_x2', 'Профиль → «Очистить память Хирона». После этого я не помню ни тем, ни настроек вроде «без шуток».', 'Profile → Clear Hiron\'s memory. After that I remember neither topics nor settings such as "no jokes".', { humorOk: false }),
  ],
  cap_privacy: [
    V('cap_privacy_x1', 'Мои ответы собираются на телефоне, сообщения и показатели никуда не уходят. Интернет нужен только погоде: туда идут округлённые координаты или название города.', 'My answers are put together on the phone, and messages and health data go nowhere. The internet is used only for weather: rounded coordinates or a city name go there.', { humorOk: false }),
    V('cap_privacy_x2', 'Ни облачного ИИ, ни аккаунта для разговора со мной нет: диалог остаётся на устройстве, а память можно стереть в Профиле.', 'There is no cloud AI and no account for talking to me: the chat stays on the device, and the memory can be erased in Profile.', { humorOk: false }),
  ],
};

export function enrich(list) {
  const by = Object.fromEntries(list.map((s) => [s.id, s]));
  Object.entries(NEWV).forEach(([id, vs]) => { if (by[id]) by[id].variants.push(...vs); });
  aliasWrap(by);
  // Слэнговые «спасибо» (обычные «спасибо» и «thanks» ловит управление ctl_thanks раньше).
  const thanks = S({ group: 'smalltalk', topic: 'smalltalk', id: 'st_thanks_slang', humor: [],
    test: W('благодарочка|спасибочки|спасибище|мерси|благодарствую|merci|cheers|thank u|thanks mate|thanks buddy|thank you very much|ty|tysm'),
    positives: ['благодарочка', 'мерси', 'cheers', 'merci', 'thanks mate', 'thank u'],
    negatives: ['спасибо', 'не благодарю', 'как улучшить сон', 'какой план'],
    continuations: { other: 'другой вариант' },
    variants: [
      V('st_thanks_slang_1', 'Пожалуйста. Заходи ещё.', 'You are welcome. Drop in again.', { humorOk: false }),
      V('st_thanks_slang_2', 'Принято, рад помочь.', 'Noted, glad to help.', { humorOk: false }),
      V('st_thanks_slang_3', 'На здоровье. Вода, шаги, сон: ты знаешь, где меня искать.', 'Cheers. Water, steps, sleep: you know where to find me.'),
      V('st_thanks_slang_4', 'Обращайся, на связи.', 'Any time, I am here.', { humorOk: false }),
    ] });
  void noAct;
  list.push(thanks);
  // Смех: «умираю со смеху», «ору», «ахах» — лёгкая реакция, никогда не кризис.
  list.push(S({ group: 'smalltalk', topic: 'smalltalk', id: 'st_laugh', humor: [],
    test: (n, e) => !n.isQuestion && n.tokens.length <= 6 && !n.topics.length && (W('(а|х)?(ха|хе|хи)+х?|ахах\\S*|хаха\\S*|ха ха( ха)*|ору( в голос)?|ржу( \\S+)?|ржака|лол|кек|лмао|угар|смешно|прикол|lol|lmao|rofl|haha\\S*|hehe\\S*|so funny|dying laughing')(n, e) || /со смеху|от смеха|смеюсь|laughing|lol/.test(n.norm)),
    positives: ['умираю со смеху', 'ахаха умираю со смеху', 'ору', 'ахах', 'ржу', 'лол', 'помираю со смеху', 'lmao', 'haha'],
    negatives: ['не смешно', 'как улучшить сон', 'сколько воды пить', 'почему смешно'],
    continuations: { other: 'другой вариант' },
    variants: [
      V('st_laugh_1', 'Рад, что смешно. Смех — хорошая часть дня.', 'Glad it is funny. Laughter is a good part of the day.', { humorOk: false }),
      V('st_laugh_2', 'Ха, понял. Хорошее настроение мне только на руку.', 'Ha, got it. A good mood suits me fine.', { humorOk: false }),
      V('st_laugh_3', 'Смейся на здоровье. Только дыши, а то я за тебя переживаю.', 'Laugh away. Just keep breathing, I would worry otherwise.'),
      V('st_laugh_4', 'Вот это настроение. Расскажешь, что рассмешило?', 'Now that is a mood. Will you tell me what was funny?', { humorOk: false }),
      V('st_laugh_5', 'Приятно слышать. Смех полезнее любого плана.', 'Nice to hear. Laughter beats any plan.', { humorOk: false }),
    ] }));
  // «Тренировка меня убила» — шутливая фигура речи о тяжёлой нагрузке (не симптом). Группа training, чтобы идти раньше общих тренировочных правил.
  list.unshift(S({ group: 'training', topic: 'train', id: 'st_workout_killed', humor: [],
    test: (n) => !n.isQuestion && n.tokens.length <= 9 && !/боль|болит|грудь|сердце|дыша|дышать|голов|тошн|chest|pain|breath|dizzy/.test(n.norm) && /(тренировк\S*|пробежк\S*|зал\S*|кардио|workout|run|gym) (меня |нас )?(убил\S*|добил\S*|доконал\S*|разбил\S*)|(меня |нас )?(убил\S*|добил\S*|доконал\S*) (эта |сегодняшняя |такая )?(тренировк\S*|пробежк\S*|зал|кардио)|после (зала|тренировки|пробежки|кардио) я (труп|овощ|не живой|не жив|как выжатый)|ноги отваливаются|не чувствую ног|(workout|run|gym|that workout) (killed|destroyed|wrecked) me|dead after (the )?(gym|workout|run)|legs are (dead|gone|jelly)/.test(n.norm),
    positives: ['эта тренировка меня убила', 'тренировка убила меня', 'меня убила эта пробежка', 'после зала я труп', 'ноги отваливаются после бега', 'тренировка меня доконала', 'that workout killed me', 'legs are dead'],
    negatives: ['боль в груди после тренировки', 'как улучшить сон', 'какой план на сегодня', 'тренировка убила и болит сердце'],
    continuations: { other: 'другой вариант' },
    variants: [
      V('st_workout_killed_1', ['Похоже, тренировка была тяжёлой. Дай телу восстановиться: вода, еда и спокойный вечер.', 'Если появится боль, головокружение или одышка, остановись и обратись к врачу.'], ['Sounds like a hard workout. Let your body recover: water, food and a calm evening.', 'If pain, dizziness or shortness of breath appear, stop and see a doctor.'], { humorOk: false }),
      V('st_workout_killed_2', 'Значит, нагрузка получилась сильной. Сегодня достаточно прогулки и сна пораньше, а завтра выберем нагрузку полегче.', 'So the load was heavy. A walk and an earlier night are enough today, and tomorrow we pick something lighter.', { humorOk: false }),
      V('st_workout_killed_3', ['Тяжёлая тренировка бывает такой. Поешь, попей воды и не геройствуй вечером.', 'Если что-то болит по-настоящему, это уже не усталость: напиши, и разберёмся осторожно.'], ['A hard session feels like that. Eat, drink water and do not be a hero tonight.', 'If something really hurts, that is no longer tiredness: tell me and we will be careful.'], { humorOk: false }),
      V('st_workout_killed_4', 'Живой и пишешь, уже хорошо. Потянись, отдохни, а следующую тренировку сделай мягче, чем эту.', 'You are alive and writing, which is a start. Stretch, rest, and make the next session gentler than this one.', { humorOk: false }),
    ] }));
}
