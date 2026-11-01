// Группа 9: результаты и эмоции. Тон: спокойно, без восторгов и нотаций. Когда человек расстроен, раздражён или винит себя,
// юмора нет вообще (humorOk:false, без humor-ситуаций). Успех — единственное место с коротким одобрением из каталога юмора.
import { P } from '../nlu';
import { V, BV, SC } from './kit';
import { STEPS, REFUSE, ILLNESS, ACTW } from './bkit';

const g = { group: 'results', topic: 'result' };
const SUCCESS = P('получилось|справил\\S*|смог|смогла|выполнил\\S*|достиг\\S*|добился|добилась|закрыл\\S* (цель|план|неделю)|сделал (план|все|всё)|побил\\S* рекорд|рекорд|did it|i did it|managed to|achieved|reached (my|the) goal|hit (my|the) goal|completed (my|the) (plan|goal|week)|personal best|new record|nailed it');
const NEGSUCC = P('не (получилось|справил\\S*|смог|смогла|выполнил\\S*|достиг\\S*)|didn\'t|did not|could not|couldn\'t|failed');
const DISAPP = P('разочаров\\S*|расстро\\S*|огорч\\S*|обидно|досадно|грустно|не радует|меньше (чем )?ожидал\\S*|ожидал\\S* (больше|лучше)|disappointed|let down|bummed|sad about|upset about|expected (more|better)');
const NUMW = P('числ\\S*|цифр\\S*|результат\\S*|шаг\\S*|оценк\\S*|показател\\S*|значени\\S*|баллы?|number\\S*|result\\S*|score\\S*|steps|metric\\S*|reading\\S*|figure\\S*');
const COMPSELF = P('отстаю от (других|всех)|сравнива\\S* себя с|я хуже (других|всех)|comparing myself (to|with)|i am behind everyone|everyone is ahead');
const OTHERS = P('(у )?(все|всех|других|друзей|друга|подруг\\S*|коллег\\S*|соседа|брата|сестры|жены|мужа|всех|людей|других людей|остальных)|сравнива\\S* (себя )?с (другими|друзьями|людьми|коллегами|соседом)|чужие|compare\\S* (myself )?(to|with) (others|other people|friends|colleagues)|others|other people|my friends?|everyone else|my colleagues?');
const CMPW = P('больше|лучше|меньше|хуже|быстрее|отстаю|отстал\\S*|сравнива\\S*|ходят|бегают|успешнее|сильнее|more|better|worse|faster|behind|compare\\S*|stronger|beats? me');
const ANNOY = P('(приложение|ты|хирон|коуч)( меня)? (бесит|раздража\\S*|надоел\\S*|достал\\S*|задолбал\\S*|тупит|глючит|врет|не работает)|бесит\\S*( это)? приложение|надоел\\S* (приложение|уведомлени\\S*|напоминани\\S*)|достал\\S* (уведомлени\\S*|напоминани\\S*)|раздража\\S* (уведомлени\\S*|напоминани\\S*|приложение)|(app|you) (is |are )?(annoying|irritating|buggy|useless)|annoyed (by|with) (the )?(app|you|notifications|reminders)|sick of (the )?(app|notifications|reminders)|fed up with');
const DISLIKE = P('(ответ|совет|ты)( был\\S*)? (не помог\\S*|не подошел|не подошла|не то|бесполезн\\S*|мимо|не по делу|ерунда|чепуха)|не то( я)? (спрашива\\S*|просил\\S*|хотел\\S*)|(это|ответ|ты) не то|не помогает|не помогло|бесполезный (ответ|совет)|ты не (ответил\\S*|то сказал)|that (didn\'t|did not) help|not helpful|useless (answer|advice)|wrong answer|not what i asked|that\'s not what i (meant|asked)|you missed the point|doesn\'t help');
const GUILT = P('(виню|ругаю|кор[юя]|казню|презираю) (себя|меня)|злюсь на себя|мне совестно|я (виноват\\S*|подвел\\S*|подвела)|чувствую себя виноват\\S*|подвел\\S* себя|i (blame|hate|am angry at) myself|angry at myself|i feel guilty|ashamed of myself|let myself down');
const SKIP = P('пропустил\\S*|пропуск|не сходил\\S*|не пошел|не пошла|забил\\S*|сорвал\\S*|missed|skipped|blew off');

const steppy = (e) => !!(e && e.env && e.env.nlu && STEPS.test(e.env.nlu.norm));

export const RESULTS_SC = [
  SC({ ...g, id: 'res_guilt',
    match: (n) => GUILT.test(n.norm) && !SKIP.test(n.norm) && !n.past,
    positives: ['Я злюсь на себя', 'ругаю себя за всё подряд', 'виню себя что не стараюсь', 'I am angry at myself', 'я подвёл себя'],
    negatives: ['я пропустил занятие и злюсь на себя', 'вчера ругал себя', 'кто виноват', 'сколько шагов сегодня'],
    variants: [
      V('res_guilt_1', ['Понимаю. Давай без наказания: вина не добавляет сил, а план можно просто продолжить.', 'Один день или одно решение не определяют, какой ты в целом.'], ['I understand. Let us skip the punishment: guilt does not add energy, and the plan can simply continue.', 'One day or one decision does not define who you are.'], { humorOk: false }),
      V('res_guilt_2', ['Идеальности от тебя никто не требует.', 'Вернись к ближайшему шагу из плана, без отработок и штрафов.'], ['Nobody asks you to be perfect.', 'Go back to the nearest step of the plan, with no making up and no penalties.'], { humorOk: false }),
      V('res_guilt_3', ['Строгость к себе понятна, но привычке она редко помогает. Помогает следующий небольшой шаг.', 'Какой шаг был бы сейчас самым лёгким?'], ['Being strict with yourself is understandable, but it rarely helps a habit. A small next step does.', 'What would be the easiest step right now?'], { humorOk: false }),
      V('res_guilt_4', 'Не наказываем себя. Просто следующий шаг по плану.', 'No punishing ourselves. Just the next step of the plan.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'res_dislike_answer',
    match: (n) => (DISLIKE.test(n.norm) || n.norm === 'не то') && n.tokens.length <= 12 && !n.past && !n.cont,
    positives: ['Ответ не помог', 'это не то, что я спрашивал', 'бесполезный совет', 'that did not help', 'ты не то сказал'],
    negatives: ['не то чтобы я устал', 'не понял', 'ты это уже говорил', 'почему ты так советуешь'],
    variants: [
      V('res_dislike_1', 'Принято, ответ не попал. Скажи одним предложением, что нужно, и я отвечу по этому.', 'Got it, that answer missed. Say in one sentence what you need and I will answer that.', { humorOk: false }),
      V('res_dislike_2', 'Без оправданий: не помогло, значит, надо иначе. Чего не хватило: конкретики, краткости или другой темы?', 'No excuses: it did not help, so it has to be different. What was missing: specifics, brevity or another topic?', { humorOk: false }),
      BV('res_dislike_3', { reaction: ['Понял.', 'Understood.'], main: ['Давай зайдём с другой стороны.', 'Let us come at it from another side.'], clarify: ['О чём именно ты спрашивал?', 'What exactly were you asking about?'] }, { humorOk: false }),
      V('res_dislike_4', 'Я работаю по сценариям и могу не распознать нестандартную формулировку. Напиши проще и с одной темой, например «сколько шагов» или «как сон».', 'I work with scenarios and may miss an unusual phrasing. Write it simpler and with one topic, for example "how many steps" or "how is my sleep".', { humorOk: false }),
      V('res_dislike_5', 'Не то, понял. Какая тема нужна?', 'Not that one, understood. Which topic do you need?', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'res_annoyed_app',
    match: (n) => ANNOY.test(n.norm) && !n.past,
    positives: ['Приложение меня бесит', 'надоели уведомления', 'ты меня раздражаешь', 'the app is annoying', 'достали напоминания'],
    negatives: ['приложение для бега', 'мне нравится приложение', 'ты тупой', 'не работает кофемашина'],
    variants: [
      V('res_annoyed_1', ['Понял, раздражает. Скажи, что именно: цифры, напоминания или мои ответы?'], ['Got it, it is annoying. Tell me what exactly: the numbers, the reminders or my answers?'], { humorOk: false }),
      V('res_annoyed_2', ['Справедливо. Если дело в напоминаниях, их можно настроить в Профиле.', 'Если в моих ответах, скажи, что не так, и я попробую иначе.'], ['Fair enough. If it is the reminders, they can be adjusted in Profile.', 'If it is my answers, tell me what is wrong and I will try differently.'], { humorOk: false }),
      V('res_annoyed_3', ['Принято. Оправдываться не буду: если ответы не помогают, это нужно исправлять.', 'Назови одну вещь, которая раздражает сильнее всего.'], ['Noted. I will not make excuses: if the answers do not help, that has to be fixed.', 'Name the one thing that annoys you most.'], { humorOk: false }),
      V('res_annoyed_4', 'Понял. Что именно: напоминания, цифры или мои ответы?', 'Understood. What exactly: reminders, numbers or my answers?', { humorOk: false }),
      BV('res_annoyed_5', { reaction: ['Слышу тебя.', 'I hear you.'], main: ['Давай уберём лишнее.', 'Let us cut the extras.'], clarify: ['Что мешает больше всего?', 'What bothers you most?'] }, { humorOk: false }),
    ] }),

  SC({ ...g, id: 'res_compare_others',
    match: (n) => (COMPSELF.test(n.norm) || (OTHERS.test(n.norm) && CMPW.test(n.norm) && (NUMW.test(n.norm) || ACTW.test(n.norm) || /сон|спит|ходит|ходят|sleep|walk/.test(n.norm)))) && !REFUSE.test(n.norm) && !n.past && !/приложени|app|watch|часы|часах/.test(n.norm),
    positives: ['У друзей шагов больше, чем у меня', 'я отстаю от других', 'сравниваю себя с коллегами', 'my friends run faster than me', 'все ходят больше меня'],
    negatives: ['сравни с прошлой неделей', 'у друзей день рождения', 'у друзей шагов больше чем в другом приложении', 'вчера сравнивал себя с другими'],
    variants: [
      V('res_others_1', 'Сравнивать себя стоит с собой: у каждого свой возраст, работа, режим и источник данных. Мои оценки считаются по твоим личным нормам.', 'It is worth comparing yourself with yourself: everyone has their own age, job, routine and data source. My scores use your personal norms.', { humorOk: false }),
      V('res_others_2', 'Чужие цифры редко сопоставимы: другие часы, другой способ подсчёта, другая жизнь. HRV, например, нельзя сравнивать с чужим.', 'Other people\'s numbers are rarely comparable: different watches, different counting, a different life. HRV, for example, should never be compared with someone else\'s.', { humorOk: false }),
      BV('res_others_3', { main: ['Понимаю, это цепляет.', 'I understand, it stings.'], action: ['Хороший ориентир — твоя динамика за 7 и 30 дней, а не чужая цифра.', 'A good marker is your own trend over 7 and 30 days, not someone else\'s number.'] }, { humorOk: false }),
      V('res_others_4', 'Сравнивай себя с собой прежним: твоя неделя против твоего месяца.', 'Compare yourself with your earlier self: your week against your month.', { humorOk: false }),
      V('res_others_5', 'Чужой результат ничего не говорит о твоём. Если нужен ориентир по шагам, возьми общий ориентир приложения — {stepGoal|full} в день, он не зависит от соседей.', 'Someone else\'s result says nothing about yours. If you need a step marker, take the app\'s general target of {stepGoal|full} a day; it does not depend on the neighbours.', { humorOk: false, when: steppy }),
    ] }),

  SC({ ...g, id: 'res_disappointed',
    match: (n) => DISAPP.test(n.norm) && NUMW.test(n.norm) && !n.past && !ILLNESS.test(n.norm),
    positives: ['Разочарован числом шагов', 'обидно за такой результат', 'ожидал больше от оценки', 'I am disappointed with my score', 'обидно, что цифра такая'],
    negatives: ['разочарован в друзьях', 'вчера расстроил результат', 'какая у меня оценка', 'число шагов'],
    variants: [
      V('res_disapp_1', ['Понимаю, когда число не радует. Одно значение — это один день, а не оценка тебя.', 'Смотри на средние за 7 и 30 дней: так виднее направление.'], ['I understand when a number does not please. One value is a single day, not a verdict on you.', 'Look at the 7- and 30-day averages: the direction is clearer there.'], { humorOk: false }),
      BV('res_disapp_2', { main: ['Разочарование понятно.', 'The disappointment is understandable.'], action: ['Давай посмотрим на период, а не на один день.', 'Let us look at a period rather than a single day.'] }, { humorOk: false }),
      V('res_disapp_3', ['Число — не вердикт. Оно показывает, что записано, и ничего не говорит о твоих усилиях.', 'Если хочешь, разберём, из-за чего оно такое, или просто оставим как есть.'], ['A number is not a verdict. It shows what was recorded and says nothing about your effort.', 'If you like, we can look at why it is what it is, or just leave it.'], { humorOk: false }),
      V('res_disapp_4', 'Понимаю. Одно число — не итог. Смотрим на неделю, а не на день.', 'I understand. One number is not the outcome. We look at the week, not the day.', { humorOk: false }),
      V('res_disapp_5', 'Иногда число отстаёт от реального дня: источник мог не передать данные. Если подозреваешь это, проверь синхронизацию.', 'Sometimes a number lags behind the real day: the source may not have passed on the data. If you suspect that, check the sync.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'res_success', humor: ['achievement'],
    match: (n) => SUCCESS.test(n.norm) && !NEGSUCC.test(n.norm) && !n.past && !n.isQuestion && !REFUSE.test(n.norm) && (ACTW.test(n.norm) || NUMW.test(n.norm) || /цел|план|недел|goal|plan|week|рекорд|record/.test(n.norm)) && !ILLNESS.test(n.norm),
    positives: ['Получилось! Сегодня наконец сделал 10 тысяч шагов', 'я достиг своей цели', 'побил свой рекорд', 'I reached my goal', 'мы справились с планом'],
    negatives: ['не получилось выполнить план', 'получится ли выполнить план?', 'вчера побил рекорд', 'сделал план и сильно болит колено'],
    variants: [
      V('res_success_1', ['Хороший результат. Дай телу восстановиться: следующее занятие сделай полегче.', 'Нагрузку повышай не больше чем на 10% в неделю.'], ['A good result. Let your body recover: make the next session easier.', 'Raise the load by no more than 10% a week.']),
      BV('res_success_2', { main: ['Получилось — это стоит отметить.', 'You pulled it off, which is worth noting.'], action: ['Следующее занятие лучше сделать полегче, а нагрузку повышать не больше чем на 10% в неделю.', 'Make the next session easier and raise the load by no more than 10% a week.'] }),
      V('res_success_3', 'Результат настоящий, его не нужно обесценивать. Дальше важнее восстановление, чем следующий рекорд.', 'The result is real, there is no need to downplay it. Recovery matters more now than the next record.', { short: { ru: 'Результат настоящий. Теперь восстановление.', en: 'The result is real. Recovery next.' } }),
      V('res_success_4', 'Записываю в хорошие дни. После такого нагрузку лучше повышать плавно: не больше чем на 10% в неделю.', 'Filing it under good days. After this, raise the load gradually: no more than 10% a week.'),
      V('res_success_5', 'Это достойный результат. Дай телу восстановиться и не спеши с рекордом на следующий день.', 'That is a solid result. Let your body recover and do not rush a record into the next day.', { humorOk: false }),
    ] }),
];

