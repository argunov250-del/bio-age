// Группа 14: разговор и настроение. Обычная человеческая болтовня: коротко, тепло, без нотаций и без выдуманных чувств.
// Тяжёлое состояние сюда не попадает: его перехватывает чувствительная проверка раньше. Лёгкая грусть и усталость — мягко,
// без юмора и без диагнозов; дыхание 4–6 предлагается как действие, а не как лечение.
import { V, BV } from './kit';
import { W, L, Ln, S, noAct, humorOn } from './lexC';

const g = { group: 'smalltalk', topic: 'smalltalk' };
const off = (w) => !humorOn(w.env);
const on = (w) => humorOn(w.env);

export const SMALLTALK = [
  S({ ...g, id: 'st_howdo_you', humor: [],
    test: W('как у тебя дела|как твои дела|как у тебя дела сегодня|как ты себя чувствуешь|как ты сегодня|как у тебя день|как твой день|как твое настроение|как оно у тебя|как ты там|у тебя как|ты как|у тебя как дела|как сам|how are you feeling|how is your day|how has your day been|how have you been|how are you today|and you|how about you|what about you'),
    positives: ['Как у тебя дела?', 'как твои дела', 'а у тебя как дела', 'как ты себя чувствуешь', 'как твой день', 'how have you been', 'and you?'],
    negatives: ['как у меня дела', 'как ты считаешь бегать сегодня', 'как у тебя получается считать шаги', 'сколько у тебя дел сегодня'],
    continuations: { other: 'другой вариант ответа', short: 'короткий ответ' },
    variants: [
      BV('st_howdo_you_1', { main: ['У меня ровно, спасибо. Я коуч с правилами, настроение у меня по расписанию.', 'Steady, thanks. I am a coach with rules; my mood runs on a schedule.'], clarify: ['А у тебя как?', 'And you?'] }),
      BV('st_howdo_you_2', { main: ['Хорошо, я на месте и никуда не тороплюсь.', 'Fine, I am here and in no hurry.'], action: ['Расскажи, как ты: сил много или день тянется?', 'Tell me how you are: plenty of energy or is the day dragging?'] }, { humorOk: false }),
      BV('st_howdo_you_3', { main: ['Спасибо, что спросил. Жалоб нет, батарейки не нужны.', 'Thanks for asking. No complaints, no batteries needed.'], clarify: ['Что у тебя нового?', 'What is new with you?'] }),
      BV('st_howdo_you_4', { main: ['Как у кентавра: стою на четырёх, настроение рабочее.', 'Like a centaur should be: standing on four legs, in a working mood.'], action: ['Теперь твоя очередь: как день?', 'Your turn: how is the day?'] }),
      BV('st_howdo_you_5', { main: ['Нормально. Мне проще говорить о тебе: как самочувствие?', 'Fine. It is easier for me to talk about you: how do you feel?'] }, { humorOk: false, short: { ru: 'Нормально. А ты как?', en: 'Fine. And you?' } }),
    ] }),

  S({ ...g, id: 'st_bored', humor: ['simplify'],
    test: L('скучно|скучаю|скука|скучновато|скушно|нечем заняться|нечего делать|заняться нечем|мне нечем занят\\S*|bored|boring|nothing to do|i am bored|im bored', 8, noAct),
    positives: ['Скучно', 'мне скучно', 'блин, скучно сегодня', 'нечем заняться', 'скушно что-то', 'i am bored', 'nothing to do'],
    negatives: ['вчера было скучно', 'скучно бегать одному', 'как улучшить сон', 'мне не скучно'],
    continuations: { other: 'другая идея', short: 'короткая идея' },
    variants: [
      BV('st_bored_1', { main: ['Скучно — отличный повод выйти на 10 минут пройтись. Без цели и без счётчика.', 'Boredom is a fine reason to step out for a 10-minute walk. No goal, no counter.'], action: ['Вернёшься — расскажешь, что увидел.', 'Come back and tell me what you saw.'] }),
      BV('st_bored_2', { main: ['Давай лёгкое: загляни в задания на сегодня, спроси «какие задания на сегодня».', 'Something light: check today\'s quests, ask "what are today\'s quests".'] }, { humorOk: false }),
      BV('st_bored_3', { main: ['Можно потянуться, пока скучно: пара минут растяжки ничего не стоит.', 'You can stretch while bored: a couple of minutes of stretching costs nothing.'], action: ['А потом решим, что с оставшимся вечером.', 'Then we will decide what to do with the rest of the evening.'] }),
      BV('st_bored_4', { main: ['Могу поболтать. Расскажи, что за день, и придумаем что-нибудь не про экран.', 'I can chat. Tell me about the day and we will think of something that is not a screen.'] }, { humorOk: false }),
      BV('st_bored_5', { main: ['Попробуй три минуты дыхания 4–6: скука иногда уходит вместе с выдохом.', 'Try three minutes of 4–6 breathing: boredom sometimes leaves with the exhale.'], action: ['Таймер есть в разделе «Дыхание 4–6».', 'The timer is in the Breathing 4–6 section.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_chat', humor: [],
    test: L('давай (поболтать|болтать|потреплемся|потрындим|потрепаться|поболтаем по душам)|просто поболтать|хочу поболтать|поговори со мной|хочу пообщаться|давай пообщаемся|поболтай со мной|давай просто поболтаем|скажи что[ -]?нибудь|lets chat|let s chat|let\'s chat|chat with me|talk to me|just want to chat|want to talk|say something', 7, noAct),
    positives: ['давай поболтать', 'давай потреплемся', 'поговори со мной', 'хочу пообщаться', 'давай пообщаемся', 'скажи что-нибудь', 'let\'s chat', 'just want to chat', 'talk to me'],
    negatives: ['не хочу общаться', 'поговори со мной про сон', 'вчера хотел пообщаться', 'как улучшить сон'],
    continuations: { other: 'другой ответ' },
    variants: [
      BV('st_chat_1', { main: ['Давай. Я не великий болтун, но слушать умею.', 'Sure. I am no great talker, but I can listen.'], clarify: ['Как прошёл день?', 'How was your day?'] }),
      BV('st_chat_2', { main: ['С удовольствием. Говори о чём хочешь: если выйдем за мои темы, я честно скажу.', 'Gladly. Talk about anything: if we go beyond my topics, I will say so.'] }, { humorOk: false }),
      BV('st_chat_3', { main: ['Я здесь. Расскажи, что сегодня было приятного, хоть мелочь.', 'I am here. Tell me what was nice today, even something small.'] }, { humorOk: false }),
      BV('st_chat_4', { main: ['Можно. Только предупреждаю: я коуч с правилами, поэтому разговор у нас будет честный, но про здоровье и привычки.', 'Fine. A warning: I am a coach with rules, so the talk will be honest but about health and habits.'] }),
      BV('st_chat_5', { main: ['Поболтаем. С чего начнём: как спалось или чем занят день?', 'Let us chat. Where shall we start: how you slept or what the day holds?'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_good_mood', humor: ['personal_win'],
    test: L('хорошее настроение|настроение (хорошее|отличное|супер|классное|прекрасное|бодрое|боевое)|я в хорошем настроении|(все|всё) (хорошо|отлично|супер|прекрасно)|чувствую себя (хорошо|отлично|супер|прекрасно)|(хороший|отличный|классный) день|день удался|good mood|in a good mood|feeling (good|great|fine|amazing)|great day|good day|all good|i feel (good|great|fine|amazing)', 8, (n) => !n.isQuestion && noAct(n) && !/^(как|how|what|что|почему|why)( |$)/.test(n.norm)),
    positives: ['У меня хорошее настроение', 'настроение отличное', 'чувствую себя отлично', 'сегодня классный день', 'день удался!', 'feeling great', 'good mood today'],
    negatives: ['как сделать хороший день', 'вчера был хороший день', 'настроения нет', 'хочу хороший сон'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_good_mood_1', { main: ['Рад слышать. Хорошее настроение — тоже часть режима.', 'Glad to hear it. A good mood is part of the routine too.'], action: ['Используй: если есть желание, добавь прогулку.', 'Use it: if you feel like it, add a walk.'] }),
      BV('st_good_mood_2', { main: ['Отлично. Запомни, что сегодня сработало: сон, прогулка, люди?', 'Great. Make a note of what worked today: sleep, a walk, people?'] }, { humorOk: false }),
      BV('st_good_mood_3', { main: ['Приятно. Не нужно ничего менять, просто продолжай.', 'Nice. Nothing to change, just keep going.'] }),
      BV('st_good_mood_4', { main: ['Это хорошая новость. Тогда день можно прожить без планов и отчётов.', 'That is good news. Then the day can go without plans and reports.'], clarify: ['Чем порадуешь себя дальше?', 'How will you treat yourself next?'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_joy', humor: ['personal_win'],
    test: L('хорошие новости|отличные новости|мне повезло|меня похвалили|сегодня повезло|порадовало|радуюсь|(я )?(так |очень )?рад\\S*|счастлив\\S*|ура|день удался|good news|great news|made my day|best day|i am so happy|im so happy|so happy|hooray|yay', 9, (n) => !n.isQuestion && noAct(n)),
    positives: ['Хорошие новости!', 'мне сегодня повезло', 'я очень рад', 'я так счастлива', 'ура', 'good news today', 'i am so happy'],
    negatives: ['нет хороших новостей', 'какие новости', 'вчера повезло', 'расскажи новости'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_joy_1', { main: ['Здорово. Порадоваться — тоже навык, и у тебя он есть.', 'Wonderful. Being glad is a skill too, and you have it.'], clarify: ['Что случилось?', 'What happened?'] }),
      BV('st_joy_2', { main: ['Рад за тебя. Подержи это ощущение, оно полезнее любого плана.', 'Happy for you. Hold on to that feeling; it is worth more than any plan.'] }, { humorOk: false }),
      BV('st_joy_3', { main: ['Отличные новости. Расскажешь подробности?', 'Excellent news. Will you share the details?'] }),
      BV('st_joy_4', { main: ['Приятно слышать. Хороший день стоит отметить спокойным вечером.', 'Good to hear. A good day deserves a calm evening.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_bad_mood', humor: [],
    test: Ln('плохое настроение|настроение (плохое|паршивое|так себе|не очень|никакое|нулевое|ни к черту)|не в настроении|не в духе|нет настроения|грустно|грустновато|тоскливо|хандр\\S*|унылое настроение|bad mood|in a bad mood|feeling (down|low|blue|meh|sad)|not in the mood|a bit sad|sad today|no mood', 8, (n) => !n.isQuestion && !n.activity && !n.want),
    positives: ['У меня плохое настроение', 'настроение паршивое', 'грустно сегодня', 'что-то хандрю', 'настроение так себе', 'bad mood today', 'feeling meh today'],
    negatives: ['хорошее настроение', 'не хочу тренироваться, нет настроения', 'вчера было плохое настроение', 'как улучшить настроение сном'],
    continuations: { other: 'другой вариант', short: 'коротко' },
    variants: [
      BV('st_bad_mood_1', { main: ['Бывает. Бодрым быть не обязательно, день может быть просто тихим.', 'It happens. You do not have to be cheerful; the day can just be quiet.'], action: ['Если захочется, пройдись 10 минут без цели.', 'If you feel like it, take a 10-minute walk with no goal.'] }, { humorOk: false }),
      BV('st_bad_mood_2', { main: ['Понимаю. Не буду подбадривать лозунгами.', 'I get it. I will not cheer you up with slogans.'], action: ['Можно три минуты дыхания 4–6: вдох на 4, выдох на 6. Таймер есть в приложении.', 'You can do three minutes of 4–6 breathing: in for 4, out for 6. The timer is in the app.'] }, { humorOk: false }),
      BV('st_bad_mood_3', { main: ['Спасибо, что сказал. Давай день попроще: вода, прогулка, ранний отбой.', 'Thanks for telling me. Let us keep the day simple: water, a walk, an early night.'] }, { humorOk: false }),
      BV('st_bad_mood_4', { main: ['Грусть — не поломка. Ей можно просто дать побыть.', 'Sadness is not a malfunction. You can simply let it be.'], clarify: ['Хочешь рассказать, что случилось, или лучше отвлечься?', 'Want to tell me what happened, or would a distraction be better?'] }, { humorOk: false }),
      BV('st_bad_mood_5', { main: ['Если плохое настроение держится давно, стоит поговорить с близким человеком или врачом. Я лишь коуч.', 'If a low mood has been around for long, talk to someone close or a doctor. I am only a coach.'], action: ['А сегодня достаточно маленького шага.', 'For today, a small step is enough.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_tired_all', humor: [],
    test: Ln('устал\\S* от всего|устала от всего|(все|всё) надоело|надоело (все|всё)|(все|всё) достало|ничего не хочется|ничего не хочу|нет сил ни на что|нет сил вообще|замотал\\S*|задолбал\\S*|tired of everything|fed up|sick of everything|burned out|burnt out|worn out|drained', 9, (n) => !n.isQuestion && !n.activity),
    positives: ['Устал от всего', 'всё надоело', 'нет сил ни на что', 'замотался совсем', 'всё достало', 'tired of everything', 'i am fed up'],
    negatives: ['устал после тренировки', 'вчера устал от всего', 'как справиться с усталостью', 'не устал'],
    continuations: { other: 'другой вариант', short: 'коротко' },
    variants: [
      BV('st_tired_all_1', { main: ['Похоже, ты сильно вымотан. Сегодня можно сбросить обороты и ничего не доказывать.', 'You sound really worn out. Today you can slow down and prove nothing.'], action: ['Три минуты дыхания 4–6 и стакан воды — как маленькая пауза.', 'Three minutes of 4–6 breathing and a glass of water: a small pause.'] }, { humorOk: false }),
      BV('st_tired_all_2', { main: ['Понимаю. Из списка дел на сегодня оставь только то, что нельзя перенести.', 'I understand. From today\'s list keep only what cannot be moved.'], action: ['Для тела хватит 10 минут спокойной ходьбы или просто лечь пораньше.', 'For the body, 10 minutes of easy walking or an earlier bedtime is enough.'] }, { humorOk: false }),
      BV('st_tired_all_3', { main: ['Это нормально — устать от всего сразу. Лишнего от тебя сегодня не жду.', 'It is normal to get tired of everything at once. I expect nothing extra from you today.'], action: ['Если хочешь, включи цифровую паузу: телефон отдохнёт, и ты вместе с ним.', 'If you like, start a digital pause: the phone rests, and you with it.'] }, { humorOk: false }),
      BV('st_tired_all_4', { main: ['Слышу тебя. Когда такая усталость тянется долго, поговори с близким человеком или врачом: это важнее любых привычек.', 'I hear you. When such tiredness drags on, talk to someone close or a doctor: that matters more than any habit.'], action: ['А сегодня — вода, тишина и сон.', 'And for today: water, quiet and sleep.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_thanks_warm', humor: [],
    test: L('спасибо (тебе )?(что|за)|ты (мне )?(помог\\S*|классный|крутой|супер|лучший|умница|хороший|молодец)|благодарен|благодарна|рад что ты есть|круто что ты есть|thank you (so much )?for|thanks for|you (are|re) (great|awesome|the best|helpful|nice)|you helped|appreciate (it|you)', 10, (n) => !n.isQuestion),
    positives: ['ты мне помог', 'ты классный', 'спасибо, что ты есть', 'благодарен тебе', 'thanks for the help', 'you are the best', 'спасибо тебе за поддержку'],
    negatives: ['спасибо', 'ты не помог мне', 'спасибо, а что с пульсом?', 'как улучшить сон'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_thanks_warm_1', { main: ['Мне приятно, что это пригодилось. Но делаешь всё ты.', 'I am glad it was useful. But you are the one doing it.'] }, { humorOk: false }),
      BV('st_thanks_warm_2', { main: ['Взаимно. С тобой удобно работать: вопросы по делу.', 'Likewise. You are easy to work with: your questions are to the point.'] }),
      BV('st_thanks_warm_3', { main: ['Принято. Я рядом, если что.', 'Received. I am nearby if you need me.'] }, { humorOk: false }),
      BV('st_thanks_warm_4', { main: ['Рад помочь. Береги себя и не забывай про воду.', 'Glad to help. Take care and do not forget water.'] }, { humorOk: false }),
    ] }),

  S({ ...g, id: 'st_character', humor: [],
    test: L('ты кто по характеру|какой у тебя характер|какой ты|какой ты человек|расскажи (о|про) себя|кто такой хирон|что ты за (персонаж|зверь|существо)|ты кентавр|who are you really|what are you like|your personality|your character|who is (hiron|chiron)', 8),
    positives: ['Ты кто по характеру?', 'какой у тебя характер', 'какой ты по характеру', 'кто такой Хирон', 'ты кентавр?', 'what are you like', 'what is your personality'],
    negatives: ['какой сегодня план', 'какой у меня сон', 'не рассказывай о себе', 'сколько воды пить'],
    continuations: { other: 'другой вариант', short: 'коротко' },
    variants: [
      BV('st_character_1', { main: ['Я Хирон: спокойный наставник, наполовину кентавр. Наблюдаю, подсказываю, не командую.', 'I am Hiron: a calm mentor, half centaur. I watch, suggest and do not command.'], action: ['Привычки у меня не экзамен, а день бывает разным.', 'For me habits are not an exam, and days vary.'] }),
      BV('st_character_2', { main: ['Характер ровный и немного ироничный. Без нотаций и без криков «давай-давай».', 'Even-tempered and a little ironic. No lectures, no shouting "come on, come on".'] }, { humorOk: false }),
      BV('st_character_3', { main: ['Честно: я не человек и не языковая модель, а локальный коуч со сценариями и правилами.', 'Honest answer: I am not a person or a language model, but a local coach with scenarios and rules.'], action: ['Зато спокойный, и данные остаются на телефоне.', 'But a calm one, and your data stays on the phone.'] }, { humorOk: false }),
      BV('st_character_4', { main: ['Хирон из мифов учил героев лечить и беречь себя. Я по мелочи делаю то же: сон, шаги, спокойный темп.', 'The mythical Chiron taught heroes to heal and look after themselves. I do the same in small ways: sleep, steps, a calm pace.'] }),
    ] }),

  S({ ...g, id: 'st_joke', humor: [],
    test: L('расскажи (шутку|анекдот|что нибудь смешное)|пошути|шутк\\S*|анекдот|развесели|рассмеши|tell (me )?a joke|joke|make me laugh|say something funny|crack a joke', 6, (n) => !/без шуток|не шути|no jokes|как |how |отключ|выключ|убер|убрат|убира|turn off|disable|switch off/.test(n.norm)),
    positives: ['Расскажи шутку', 'расскажи анекдот', 'развесели меня', 'шутку давай', 'рассмеши', 'tell me a joke', 'make me laugh'],
    negatives: ['без шуток', 'не шути', 'как отключить шутки', 'вчера рассказал шутку'],
    continuations: { other: 'другая шутка' },
    variants: [
      V('st_joke_1', 'Шутка в моём стиле: я считаю шаги так аккуратно, что тапочки завидуют.', 'A joke in my style: I count steps so carefully that the slippers are jealous.', { humorOk: false, when: on }),
      V('st_joke_2', 'Кентавр заходит в зал. Тренер: «Тебе на какой тренажёр?» — «На оба, у меня четыре ноги».', 'A centaur walks into a gym. The trainer asks, "Which machine?" "Both, I have four legs."', { humorOk: false, when: on }),
      V('st_joke_3', 'Самый честный будильник — тот, что звонит после того, как ты уже выспался.', 'The most honest alarm clock is the one that rings after you have already slept enough.', { humorOk: false, when: on }),
      V('st_joke_4', 'Я бы пошутил про лень, но решил не откладывать, а просто отложить.', 'I would joke about laziness, but I decided not to put it off — I will just postpone it.', { humorOk: false, when: on }),
      V('st_joke_5', 'Диета, сон и шаги: три вещи, которые я бы продал, если бы они продавались. Но их можно только делать.', 'Diet, sleep and steps: three things I would sell if they were for sale. But you can only do them.', { humorOk: false, when: on }),
      V('st_joke_off', 'Сейчас у тебя включён режим без шуток, и я его уважаю. Вернуть юмор можно в Профиле, в настройке «Юмор Хирона».', 'Humor is switched off right now and I respect that. You can bring it back in Profile, under "Hiron\'s humor".', { humorOk: false, when: off }),
    ] }),

  S({ ...g, id: 'st_friends', humor: [],
    test: L('давай дружить|будем друзьями|давай будем друзьями|ты мой друг|хочу с тобой дружить|ты мне друг|мы друзья|be my friend|lets be friends|let us be friends|are we friends|you are my friend|youre my friend', 7),
    positives: ['Давай дружить', 'будем друзьями?', 'ты мой друг', 'мы друзья?', 'давай будем друзьями', 'be my friend', 'are we friends'],
    negatives: ['не хочу дружить', 'вчера мы дружили', 'как улучшить сон', 'давай тренироваться'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_friends_1', { main: ['Давай. Я надёжный попутчик: рядом, но без давления.', 'Deal. I am a dependable companion: nearby, but without pressure.'] }),
      BV('st_friends_2', { main: ['С радостью. Только честно: я программа с правилами, но на твоей стороне.', 'Gladly. To be honest, I am a program with rules, but on your side.'] }, { humorOk: false }),
      BV('st_friends_3', { main: ['Договорились. Друзья не ставят оценок за плохой день, и я тоже.', 'Agreed. Friends do not grade a bad day, and neither do I.'] }, { humorOk: false }),
      BV('st_friends_4', { main: ['Мне нравится. Начнём с малого: как ты сегодня?', 'I like it. Let us start small: how are you today?'] }),
    ] }),

  S({ ...g, id: 'st_goodnight', humor: [],
    test: W('спокойной ночи|доброй ночи|сладких снов|споки ноки|споки|good night|night night|sleep well|sweet dreams|gn|nighty night'),
    positives: ['Спокойной ночи', 'доброй ночи, Хирон', 'сладких снов', 'споки ноки', 'good night', 'sweet dreams', 'night night'],
    negatives: ['как спокойно уснуть', 'доброй ночи не вышло, не спал', 'как спать', 'сколько я спал'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_goodnight_1', { main: ['Спокойной ночи. Хорошего сна.', 'Good night. Sleep well.'] }, { humorOk: false }),
      BV('st_goodnight_2', { main: ['Доброй ночи. Телефон в сторону, свет потише.', 'Good night. Phone aside, lights low.'] }, { humorOk: false }),
      BV('st_goodnight_3', { main: ['Отдыхай. Завтра разберёмся с остальным.', 'Rest up. We will sort out the rest tomorrow.'] }, { humorOk: false }),
      BV('st_goodnight_4', { main: ['Сладких снов. Ровный режим сна — лучший подарок себе.', 'Sweet dreams. A steady sleep routine is the best gift to yourself.'] }),
      BV('st_goodnight_5', { main: ['До завтра. Кентавры спят стоя, а тебе лучше лёжа.', 'See you tomorrow. Centaurs sleep standing, you had better lie down.'] }),
    ] }),

  S({ ...g, id: 'st_bye', humor: [],
    test: (n, e) => W('пока|пока пока|бывай|прощай|bye|bye bye|goodbye|cya|see ya')(n) || L('до свидания|до встречи|до завтра|до скорого|увидимся|я пошел|я пошла|побежал|побежала|я ушел|я ушла|на сегодня (все|хватит)|see you|see you later|talk later|gotta go|got to go|im off', 5, (m) => !m.isQuestion)(n, e),
    positives: ['Пока', 'до завтра', 'ну всё, я пошёл', 'до встречи!', 'на сегодня хватит', 'bye', 'see you later'],
    negatives: ['пока не знаю', 'пока что болит', 'пока сплю мало', 'как сказать пока'],
    continuations: { other: 'другой вариант' },
    variants: [
      BV('st_bye_1', { main: ['До встречи. Береги себя.', 'See you. Take care.'] }, { humorOk: false }),
      BV('st_bye_2', { main: ['Пока. Если что, я здесь.', 'Bye. If anything, I am here.'] }),
      BV('st_bye_3', { main: ['Хорошего дня. Вода рядом, ноги на земле.', 'Have a good day. Water nearby, feet on the ground.'] }),
      BV('st_bye_4', { main: ['До завтра. Сегодня ты уже достаточно сделал.', 'See you tomorrow. You have done enough today.'] }, { humorOk: false }),
    ] }),
];
