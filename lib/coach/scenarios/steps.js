// Группа 5: шаги. В данных коуча есть только среднее за 7 и 30 дней и ориентир приложения (lib/goals.js):
// отдельной цифры «за сегодня» нет, и мы об этом честно говорим. Нет данных — вариант без числа, не ноль.
import { P } from '../nlu';
import { detect } from '../../humor/context';
import { V, BV, SC } from './kit';
import { STEPS, REFUSE, WHY, only, mentioned, num } from './bkit';

const g = { group: 'steps', topic: 'move' };
const base = (n) => STEPS.test(n.norm) && only(n, 'steps') && !REFUSE.test(n.norm) && !detect(n.raw).roundChase;

// «в другом приложении», «не совпадают с часами» (Д5)
const CMP_APP = P('(чем|than) (на|в|у|on|in) (моих |своих |других |my |the )?(часах|часов|часами|браслете|телефоне|смартфоне|трекере|watch|phone|tracker)|(в|на|чем в|чем на|чем у|у) (другом|втором|другом|друг\\S+|своих?|моих) (приложени\\S*|часах|браслете|телефоне|трекере)|(в|на|чем в|чем на) (google fit|гугл фит|samsung health|самсунг хелс|apple health|mi fit|zepp|garmin|гармин|fitbit|фитбит|huawei health|xiaomi|amazfit)|(не )?совпада\\S*|расход\\S*|отличают\\S*|разные цифры|по разному|than (in|on) (the |my )?(other|another|second) (app|watch|phone|tracker)|(doesn\'t|does not|do not|don\'t) match|differ\\S*|mismatch|different (number|count)s?');
const APP = P('google fit|гугл фит|samsung health|самсунг хелс|apple health|mi fit|zepp|garmin|гармин|fitbit|фитбит|huawei|хуавей|xiaomi|сяоми|amazfit|strava|страва|часах|часы|часов|часами|браслет\\S*|телефон\\S*|смартфон\\S*|шагомер\\S*|watch|band|phone|tracker|pedometer');
const DAY = P('сегодня|вчера|позавчера|за (день|сутки|неделю|месяц|\\d+ дн\\S*)|в (понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)|на (этой|прошлой) неделе|today|yesterday|last (night|week)|this week|on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)|for the (day|week|month)');

const ROUND = P('кругл\\S*( числ\\S*| цифр\\S*)?|до кругл\\S*|round (number|figure|count)|nice round|rounded');
const ADD = P('добив\\S*|добит\\S*|добить|дотянут\\S*|догнат\\S*|докрут\\S*|round (it )?up|round up|top up');
const NORM_Q = P('нужно|надо|должен|должна|норма|нормы|ориентир\\S*|рекоменду\\S*|цел[ьиюе]\\S*|в день|в сутки|should|need|goal|target|per day|a day|daily|recommended');
const COUNT_Q = P('(сколько|скока|скок|сколко|скоко)( у меня| я| мне)?( сегодня)?( шагов| шаги| прошел| прошла| нашагал\\S*| ходил\\S*| набрал\\S*)( сегодня| вчера| за день| уже| сейчас)?|(сколько|скока|скок|сколко|скоко) (там )?шагов|мои шаги( сегодня)?|шаги за (сегодня|день|вчера)|шаги сегодня|how many steps( have i| did i)?( taken| walked| done| got)?( today| yesterday| so far)?|my steps( today)?|steps (so far|today)|step count( today)?');
const ENOUGH = P('мало|много|достаточно|хватит|хватает|нормально|норма ли|нормальн\\S*|слабо|enough|too (few|many|little|low)|is (it|that|this) (low|ok|okay|enough|normal|fine|good)|a lot');
const FROZEN = P('не раст\\S*|застр\\S*|стоят|стоит на месте|не идут|не идет|не считает\\S*|не считаются|перестал\\S* (считать|расти|работать|идти)|ноль шагов|0 шагов|нулевые шаги|zero steps|stuck|not counting|not increasing|not moving|stopped counting|isn\'t counting|doesn\'t count');
const CMP_PERIOD = P('чем (раньше|вчера|на прошлой неделе|в прошлом месяце|месяц назад|неделю назад|до этого|в прошлый раз)|по сравнению|сравни\\S*|стал\\S* (ходить|проходить|шагать) (больше|меньше)|(больше|меньше) чем (раньше|вчера|на прошлой|в прошлом|месяц|неделю)|прошл\\S* (недел\\S*|месяц\\S*|период\\S*)|динамик\\S*|compared (to|with)|than (before|last (week|month)|yesterday)|more than (before|last)|less than (before|last)|vs last|trend');
const WHAT_COUNTS = P('что (считается|засчитывается|входит|идет|учитыва\\S*)|как (ты |вы |приложение )?(считаются|считает\\S*|считаешь|считаете|считать|подсчитыва\\S*|определя\\S*)|учитыва\\S* ли|считает ли|засчитыва\\S*|what counts|how (do you|are|is|does) .*(counted|count|measured|calculated)|are .* counted|does .* count');

// Для «шагов» и «ориентира»: что есть в данных.
const hasSteps = (e) => num(e.s && e.s.steps7);
const below = (e) => hasSteps(e) && num(e.s.stepGoal) && e.s.steps7 < e.s.stepGoal;
const atGoal = (e) => hasSteps(e) && num(e.s.stepGoal) && e.s.steps7 >= e.s.stepGoal;
const both = (e) => hasSteps(e) && num(e.s.steps30);

export const STEPS_SC = [
  // ───────── Д5: почему шагов меньше, чем в другом приложении ─────────
  SC({ ...g, id: 'steps_mismatch',
    match: (n, env) => (STEPS.test(n.norm) && CMP_APP.test(n.norm) && only(n, 'steps') && !REFUSE.test(n.norm))
      || (!!(env && env.mem && env.mem.pending) && env.mem.pending.key === 'steps_cmp' && /^steps_mismatch_ask/.test(env.mem.lastVariant || '') && (APP.test(n.norm) || DAY.test(n.norm)) && n.tokens.length <= 12),
    positives: ['Почему шагов меньше, чем в другом приложении?', 'шаги не совпадают с часами', 'почему в Google Fit шагов больше', 'why do my steps differ from my watch'],
    negatives: ['Сколько шагов сегодня?', 'шаги не обновились', 'у меня много шагов', 'не хочу сравнивать шаги'],
    variants: [
      V('steps_mismatch_ask_1', ['Сначала сравним одинаковые периоды.', 'В каком приложении другое число и за какой день?'], ['First let us compare the same periods.', 'Which app shows a different number, and for which day?'], { pending: { key: 'steps_cmp' }, humorOk: false, when: (e) => !mentioned(e, APP) && !mentioned(e, DAY) }),
      V('steps_mismatch_ask_2', ['Причину сразу называть не буду: сначала сверим условия.', 'Назови второе приложение и день, за который цифры расходятся.'], ['I will not name a cause right away: let us check the conditions first.', 'Tell me the other app and the day where the numbers differ.'], { pending: { key: 'steps_cmp' }, humorOk: false, when: (e) => !mentioned(e, APP) && !mentioned(e, DAY) }),
      V('steps_mismatch_ask_3', 'Приложения могут считать за разные окна и брать данные из разных источников, поэтому цифры сверяют по одному периоду. Какое приложение и какой день сравниваем?', 'Apps can count over different windows and read different sources, so numbers are compared for one period. Which app and which day are we comparing?', { pending: { key: 'steps_cmp' }, humorOk: false, when: (e) => !mentioned(e, APP) && !mentioned(e, DAY) }),
      V('steps_mismatch_ask_day', ['Другое приложение понятно. За какой день или период там это число?', 'Моя цифра — среднее за 7 дней, а не один день, поэтому день нужно назвать точно.'], ['The other app is clear. For which day or period is that number?', 'My figure is a 7-day average, not a single day, so the day has to be named exactly.'], { pending: { key: 'steps_cmp' }, humorOk: false, when: (e) => mentioned(e, APP) && !mentioned(e, DAY) }),
      V('steps_mismatch_ask_app', ['Период понятен. В каком приложении или на каких часах другое число?', 'Причину по одной цифре я не угадываю.'], ['The period is clear. In which app or on which watch is the other number?', 'I do not guess a cause from one number.'], { pending: { key: 'steps_cmp' }, humorOk: false, when: (e) => !mentioned(e, APP) && mentioned(e, DAY) }),
      V('steps_mismatch_known_1', ['Приложение и период названы, значит, угадывать причину не буду.', 'Сверь, что в обоих местах один и тот же день, граница суток и источник данных. Мои шаги — среднее за 7 дней: {steps7|full} в день, с цифрой за один день их сравнивать нельзя.'], ['The app and the period are named, so I will not guess the cause.', 'Check that both show the same day, the same day boundary and the same data source. My steps are a 7-day average of {steps7|full} a day, so they cannot be compared with a single-day figure.'], { humorOk: false, when: (e) => mentioned(e, APP) && mentioned(e, DAY) }),
      V('steps_mismatch_known_2', 'Периоды и приложение названы. Причину по двум цифрам назвать нельзя: проверь границы суток, источник данных и свежую синхронизацию в каждом приложении.', 'The app and period are named. Two numbers do not reveal a cause: check the day boundary, the data source and fresh sync in each app.', { humorOk: false, when: (e) => mentioned(e, APP) && mentioned(e, DAY) }),
      V('steps_mismatch_known_3', 'Одинаковый период, разные приложения: причину не выдумываю. Сверь источники и синхронизацию.', 'Same period, different apps: I do not make up a cause. Compare sources and sync.', { humorOk: false, when: (e) => mentioned(e, APP) && mentioned(e, DAY) }),
    ] }),

  // ───────── Д2: добивать ли до круглого числа ─────────
  SC({ ...g, id: 'steps_round', humor: ['round_chase'],
    match: (n) => !detect(n.raw).roundChase && !n.past && !REFUSE.test(n.norm) && only(n, 'steps') && ((ROUND.test(n.norm) && (STEPS.test(n.norm) || ADD.test(n.norm))) || (ADD.test(n.norm) && STEPS.test(n.norm))),
    positives: ['Обязательно добивать шаги до круглого числа?', 'надо ли добивать до круглого числа', 'нужно докрутить шаги до круглой цифры?', 'do I have to round up my steps?', 'добивать шаги до 10000 надо?'],
    negatives: ['У меня 9980 шагов. Обязательно добить до 10000?', 'вчера добивал шаги до круглого числа', 'Сколько шагов сегодня?', 'не хочу добивать тренировку'],
    variants: [
      V('steps_round_1', ['Счётчик любит красивые числа. Мы не обязаны.', 'Если дело только в округлении, можно не превращать это в отдельную задачу.'], ['The counter loves pretty numbers. We are not obliged to.', 'If it is only about rounding, there is no need to turn it into a separate task.'], { humorOk: false, short: { ru: 'Счётчик любит красивые числа. Мы не обязаны.', en: 'The counter loves pretty numbers. We are not obliged to.' } }),
      BV('steps_round_2', { main: ['Нет, круглое число — не обязательный финал дня.', 'No, a round number is not a mandatory end to the day.'], action: ['Если есть желание пройтись, можно, а нет — ничего не потеряно.', 'If you feel like a walk, fine; if not, nothing is lost.'] }),
      V('steps_round_3', 'Сегодня восстановление не лучшее, так что оставляй как есть: круглое число не стоит усталости.', 'Recovery is not great today, so leave it as it is: a round number is not worth the fatigue.', { when: (e) => e.s && e.s.state === 'tired' }),
      V('steps_round_4', ['Разница между 9 870 и 10 000 живёт в основном на экране.', 'Полезнее смотреть на среднее за неделю, чем на отдельный день.'], ['The difference between 9,870 and 10,000 lives mostly on the screen.', 'The weekly average is more useful than a single day.']),
      V('steps_round_5', 'Важнее среднее: за 7 дней {steps7|full} в день. Один недобор до круглого числа его почти не меняет.', 'The average matters more: {steps7|full} a day over 7 days. One shortfall from a round number barely moves it.'),
      V('steps_round_6', 'Нет, не обязательно. Круглое число — удобный ориентир, а не условие. Если самочувствие хорошее и хочется пройтись, это твой выбор, а не долг.', 'No, not necessarily. A round number is a handy marker, not a requirement. If you feel fine and want a walk, that is your choice, not a duty.', { humorOk: false }),
    ] }),

  // ───────── не растут / не считаются ─────────
  SC({ ...g, id: 'steps_frozen',
    match: (n) => base(n) && FROZEN.test(n.norm) && !n.past,
    positives: ['шаги не растут', 'счётчик шагов застрял', 'почему не считаются шаги', 'steps are stuck', 'шаги стоят на месте'],
    negatives: ['шаги не обновились', 'у меня много шагов', 'сколько шагов сегодня', 'застрял на работе'],
    variants: [
      V('steps_frozen_1', ['Если шаги не растут, причина чаще на стороне источника: часы или телефон не передали новые данные. Конкретную причину угадывать не буду.', 'Открой приложение источника, дай ему синхронизироваться и обнови экран.'], ['If steps are not growing, the cause is usually on the source side: the watch or phone has not passed on new data. I will not guess the exact cause.', 'Open the source app, let it sync and refresh the screen.'], { humorOk: false }),
      BV('steps_frozen_2', { main: ['Шаги в моих данных не обновились — это не значит, что ты не ходил.', 'Steps in my data have not updated, which does not mean you did not walk.'], action: ['Проверь синхронизацию часов и разрешения Health Connect.', 'Check the watch sync and Health Connect permissions.'] }, { humorOk: false }),
      V('steps_frozen_3', 'Последнее, что у меня есть, — среднее за 7 дней: {steps7|full} в день. Новое число появится после синхронизации.', 'The last thing I have is the 7-day average: {steps7|full} a day. A new number appears after a sync.', { humorOk: false }),
      V('steps_frozen_4', 'Пока источник молчит, число за сегодня не определить. Если за день ещё нет данных, шаги можно записать вручную в «Записать вручную».', 'While the source is silent, today\'s count cannot be known. If the day has no data yet, steps can be entered in Log manually.', { humorOk: false }),
    ] }),

  // ───────── сравнение с прошлым периодом (только если данные есть) ─────────
  SC({ ...g, id: 'steps_compare_period',
    match: (n) => (base(n) || (P('стал\\S* (ходить|проходить|шагать)|(walking|walk) (more|less)').test(n.norm) && only(n, 'steps'))) && CMP_PERIOD.test(n.norm) && !CMP_APP.test(n.norm),
    positives: ['Я стал ходить больше, чем раньше?', 'сравни шаги с прошлой неделей', 'шагов меньше чем вчера', 'am I walking more than before'],
    negatives: ['Почему шагов меньше, чем в другом приложении?', 'сравни тренировки с прошлой неделей', 'сколько шагов сегодня'],
    variants: [
      V('steps_cmp_up', ['За 7 дней — {steps7|full} в день, за 30 дней — {steps30|full}. Последняя неделя выше среднего за месяц.', 'Это два окна, а не «до и после»: в 30 дней входят и эти 7.'], ['Over 7 days: {steps7|full} a day; over 30 days: {steps30|full}. The last week is above the monthly average.', 'These are two windows, not a before and after: the 30 days include these 7.'], { when: (e) => both(e) && e.s.steps7 > e.s.steps30 }),
      V('steps_cmp_down', ['За 7 дней — {steps7|full} в день, за 30 дней — {steps30|full}. Последняя неделя ниже среднего за месяц.', 'Это два окна, а не «до и после»: в 30 дней входят и эти 7.'], ['Over 7 days: {steps7|full} a day; over 30 days: {steps30|full}. The last week is below the monthly average.', 'These are two windows, not a before and after: the 30 days include these 7.'], { when: (e) => both(e) && e.s.steps7 < e.s.steps30 }),
      V('steps_cmp_same', 'За 7 дней — {steps7|full} в день, за 30 дней — {steps30|full}. Практически одинаково.', 'Over 7 days: {steps7|full} a day; over 30 days: {steps30|full}. Practically the same.', { when: (e) => both(e) && e.s.steps7 === e.s.steps30 }),
      V('steps_cmp_nodata', 'Для сравнения нужны два периода, а сейчас у меня есть только один или ни одного. Динамику по пустому месту рисовать не буду.', 'A comparison needs two periods, and I have only one or none. I will not draw a trend from nothing.', { humorOk: false, when: (e) => !both(e) }),
      V('steps_cmp_explain', 'С конкретной прошлой неделей по отдельности сравнить не могу: у меня среднее за 7 и за 30 дней, недель по отдельности нет.', 'I cannot compare with one specific past week: I have 7-day and 30-day averages, not separate weeks.', { humorOk: false }),
    ] }),

  // ───────── личная цель / сколько нужно ─────────
  SC({ ...g, id: 'steps_goal',
    match: (n) => base(n) && NORM_Q.test(n.norm) && !ROUND.test(n.norm) && !WHY.test(n.norm) && !n.past,
    positives: ['Сколько шагов мне нужно в день?', 'какая у меня цель по шагам', 'хочу свою цель по шагам', 'what is my step goal', 'ориентир по шагам какой'],
    negatives: ['Сколько шагов сегодня?', 'нужно ли добивать шаги до круглого', 'не надо шагов', 'вчера цель по шагам была другая'],
    variants: [
      BV('steps_goal_1', { main: ['Ориентир приложения — {stepGoal|full} в день. Он общий, а не обещание результата.', 'The app\'s target is {stepGoal|full} a day. It is a general marker, not a promise of results.'], action: ['Свою цель можно держать выше или ниже, приложение пока считает по этому ориентиру.', 'You can keep a higher or lower goal of your own; for now the app counts against this target.'] }),
      V('steps_goal_2', ['Личная цель — это нормально. Ориентир приложения сейчас {stepGoal|full} в день, твоё среднее за 7 дней — {steps7|full}.', 'Если своя цель выше, считай прогресс по ней, а ориентир оставь как справку.'], ['A personal goal is fine. The app target is {stepGoal|full} a day and your 7-day average is {steps7|full}.', 'If your own goal is higher, track progress against it and keep the target as a reference.']),
      V('steps_goal_3', 'Ориентир приложения — {stepGoal|full} в день, он зависит от возраста. Своя цель — твоё право, главное, чтобы она была выполнимой.', 'The app target is {stepGoal|full} a day and depends on age. A goal of your own is your call; the key is that it is doable.'),
      V('steps_goal_4', 'Цель по шагам должна быть выполнимой, а не впечатляющей. Начни с ориентира в {stepGoal|full} или с текущего среднего и прибавляй понемногу.', 'A step goal should be doable rather than impressive. Start from the target of {stepGoal|full} or from your current average and add a little at a time.', { humorOk: false }),
      V('steps_goal_5', 'Сначала сделаем цель выполнимой, потом впечатляющей. Ориентир приложения — {stepGoal|full} в день, отсюда и можно двигаться.', 'First we make the goal doable, then impressive. The app target is {stepGoal|full} a day, and you can move on from there.', { humorOk: false }),
      V('steps_goal_6', ['Сейчас у тебя {steps7|full} в день за 7 дней против ориентира {stepGoal|full}, он ниже.', 'Если хочешь выше, прибавляй по чуть-чуть, например 10 минут ходьбы после еды.'], ['You average {steps7|full} a day over 7 days against a target of {stepGoal|full}; you are below it.', 'If you want to go higher, add a little: for example 10 minutes of walking after meals.'], { when: below }),
    ] }),

  // ───────── что считается шагом / как считаются ─────────
  SC({ ...g, id: 'steps_what_counts',
    match: (n) => STEPS.test(n.norm) && only(n, 'steps', 'train') && !REFUSE.test(n.norm) && WHAT_COUNTS.test(n.norm) && !CMP_APP.test(n.norm) && !n.past,
    positives: ['Как считаются шаги?', 'что считается шагом', 'как ты считаешь шаги', 'how are steps counted', 'учитываются ли шаги в зале'],
    negatives: ['Сколько шагов сегодня?', 'что учитывает приложение', 'шаги не совпадают', 'сколько шагов нужно'],
    variants: [
      V('steps_counts_1', ['Шаги считаю не я и не приложение, а источник: часы или телефон. Приложение читает суточные суммы из Health Connect.', 'Что именно источник засчитывает шагом, решает он сам.'], ['Steps are counted not by me or the app but by the source: a watch or phone. The app reads daily totals from Health Connect.', 'What exactly the source counts as a step is up to it.']),
      V('steps_counts_2', 'В среднее за 7 и 30 дней входят дни, по которым есть шаги. Дни без записанных шагов в среднее не включаются.', 'The 7- and 30-day averages include days that have steps. Days without recorded steps are not part of the average.'),
      V('steps_counts_3', 'Если за день нет данных из источника, шаги можно записать вручную: они займут этот день. Если данные из источника есть, ручная запись их не заменяет.', 'If the source has no data for a day, steps can be entered manually and they fill that day. If the source has data, a manual entry does not replace it.', { humorOk: false }),
      BV('steps_counts_4', { main: ['Приложение показывает то, что отдал источник, и усредняет по периодам.', 'The app shows what the source gave and averages over periods.'], extra: ['Сейчас: {steps7|full} в день за 7 дней.', 'Now: {steps7|full} a day over 7 days.', ['steps7']] }),
    ] }),

  // ───────── почему такое число ─────────
  SC({ ...g, id: 'steps_why_number',
    match: (n) => base(n) && (WHY.test(n.norm) || /(^| )откуда( |$)/.test(n.norm)) && !/\d{3,}/.test(n.norm) && !P('мало|много|маловато|странн\\S*|низк\\S*|высок\\S*|few|low|high|many|weird|strange|odd').test(n.norm) && !CMP_APP.test(n.norm) && !CMP_PERIOD.test(n.norm) && !n.aboutPrev && !n.cont,
    positives: ['Почему такое число шагов?', 'почему шагов столько', 'why this step count', 'откуда такое количество шагов'],
    negatives: ['Почему шагов меньше, чем в другом приложении?', 'почему ты так советуешь', 'почему', 'почему я плохо сплю', 'почему так мало шагов', 'почему 1749 шагов'],
    variants: [
      BV('steps_why_1', { main: ['Это среднее за 7 дней: приложение берёт суточные суммы из подключённых источников и усредняет по дням, где данные есть.', 'It is a 7-day average: the app takes daily totals from the connected sources and averages the days that have data.'], extra: ['Сейчас — {steps7|full} в день.', 'Right now: {steps7|full} a day.', ['steps7']] }),
      V('steps_why_2', ['Одно число не объясняет себя: день с прогулкой и день за столом дают разный итог, а на среднее влияют все дни периода. Причину по нему я не угадываю.', 'Если скажешь, с чем сравниваешь, со вчера или с другим приложением, сверим.'], ['One number does not explain itself: a walking day and a desk day give different totals, and every day of the period affects the average. I do not guess the cause from it.', 'If you tell me what you compare it with, yesterday or another app, we will check.']),
      V('steps_why_3', 'За 7 дней — {steps7|full} в день, за 30 дней — {steps30|full}. Если число кажется странным, сначала посмотрим, из какого периода оно.', 'Over 7 days: {steps7|full} a day; over 30 days: {steps30|full}. If the number looks odd, first check which period it comes from.'),
      V('steps_why_4', ['Число ниже ориентира в {stepGoal|full}, но причину по нему не определить: оно не знает, как прошёл день.', 'Если хочется прибавить, можно 10 минут ходьбы после еды.'], ['The number is below the target of {stepGoal|full}, but it cannot reveal a cause: it does not know how the day went.', 'If you want to add some, 10 minutes of walking after a meal will do.'], { when: below }),
      V('steps_why_5', 'Числа нет не потому, что шагов ноль, а потому, что нет данных. Проверь доступ к Health Connect и синхронизацию.', 'There is no number not because steps are zero but because there is no data. Check Health Connect access and sync.', { humorOk: false, when: (e) => !hasSteps(e) }),
      V('steps_why_6', 'Число не ниже ориентира в {stepGoal|full}. Почему оно именно такое, зависит от дней недели, и одного числа для объяснения мало.', 'The number is not below the target of {stepGoal|full}. Why it is exactly this depends on the days of the week, and one number is not enough to explain.', { when: atGoal }),
    ] }),

  // ───────── мало ли шагов ─────────
  SC({ ...g, id: 'steps_low',
    match: (n) => base(n) && ENOUGH.test(n.norm) && !/\d{3,}/.test(n.norm) && !WHY.test(n.norm) && !NORM_Q.test(n.norm) && !CMP_APP.test(n.norm) && !CMP_PERIOD.test(n.norm) && !n.past && !ROUND.test(n.norm) && !n.userData.steps,
    positives: ['Это мало шагов?', 'достаточно ли шагов', 'шагов хватит?', 'is my step count enough', 'у меня мало шагов?'],
    negatives: ['Сплю мало, шагов мало, вес растёт и стресс на работе. С чего начать?', 'мало времени на тренировку', 'сколько шагов сегодня', 'вчера было мало шагов'],
    variants: [
      V('steps_low_1', ['Среднее за 7 дней — {steps7|full} в день, ориентир приложения — {stepGoal|full}. Это ниже ориентира, но не приговор: ориентир общий.', 'Если хочется добавить, самый лёгкий способ — 10 минут ходьбы после еды.'], ['The 7-day average is {steps7|full} a day against the app target of {stepGoal|full}. That is below the target, but not a verdict: the target is general.', 'If you want to add some, the easiest way is 10 minutes of walking after meals.'], { when: below }),
      V('steps_low_2', 'Среднее за 7 дней — {steps7|full} в день, это не ниже ориентира в {stepGoal|full}. По ориентиру приложения достаточно, добавлять ради числа не нужно.', 'The 7-day average is {steps7|full} a day, which is not below the target of {stepGoal|full}. By the app target it is enough; there is no need to add steps for the number.', { when: atGoal }),
      BV('steps_low_3', { main: ['Мало или много — зависит от ориентира и от твоего обычного уровня.', 'Low or high depends on the target and your usual level.'], extra: ['Сравни: {steps7|full} в день за 7 дней и {steps30|full} за 30.', 'Compare: {steps7|full} a day over 7 days and {steps30|full} over 30.', ['steps7', 'steps30']], action: ['Ориентир приложения — {stepGoal|full} в день.', 'The app target is {stepGoal|full} a day.', ['stepGoal']] }),
      V('steps_low_4', 'Мало это или много, сказать не могу: данных о шагах нет. Это не ноль, а пустое место. Нужна синхронизация или ручная запись.', 'I cannot say whether it is low or high: there is no step data. That is not zero but a blank. A sync or a manual entry is needed.', { humorOk: false, when: (e) => !hasSteps(e) }),
      V('steps_low_5', 'Одно число — не оценка. Смотрю на среднее за период и на ориентир в {stepGoal|full}; сейчас {steps7|full} в день.', 'One number is not a verdict. I look at the period average and the target of {stepGoal|full}; right now it is {steps7|full} a day.', { humorOk: false }),
      V('steps_low_6', 'Что для тебя «мало»: меньше ориентира или меньше, чем обычно? Ориентир приложения — {stepGoal|full}, твоё среднее за 7 дней — {steps7|full}.', 'What does "low" mean to you: below the target or below your usual? The app target is {stepGoal|full} and your 7-day average is {steps7|full}.'),
    ] }),

  // ───────── сколько шагов сегодня ─────────
  SC({ ...g, id: 'steps_today',
    match: (n) => (base(n) || (P('прошел|прошла|нашагал\\S*|walked').test(n.norm) && only(n, 'steps') && !REFUSE.test(n.norm))) && COUNT_Q.test(n.norm) && !NORM_Q.test(n.norm) && !WHY.test(n.norm) && !CMP_APP.test(n.norm) && !n.userData.steps,
    positives: ['Сколько шагов сегодня?', 'скок у меня шагов', 'сколько я прошёл', 'мои шаги', 'how many steps today', 'сколько шагов я нашагал вчера'],
    negatives: ['Сколько шагов нужно в день?', 'не хочу знать, сколько шагов', 'я прошёл 7000 шагов', 'сколько я спал', 'почему шагов мало'],
    variants: [
      BV('steps_today_1', { main: ['Отдельной цифры за сегодня у меня нет: я вижу среднее за 7 дней — {steps7|full} в день.', 'I do not have a separate number for today: I see the 7-day average of {steps7|full} a day.'], action: ['Точное число за сегодня есть в приложении-источнике, например на часах.', 'The exact count for today is in the source app, for example on your watch.'] }),
      V('steps_today_2', 'За неделю в среднем {steps7|full} в день. Сегодняшний день отдельно не выделяю, чтобы не выдавать среднее за один день.', 'Over the week you average {steps7|full} a day. I do not single out today, so as not to pass an average off as one day.', { short: { ru: 'В среднем за 7 дней — {steps7|full} в день.', en: 'The 7-day average is {steps7|full} a day.' } }),
      V('steps_today_3', ['Среднее за 7 дней — {steps7|full} в день, это ниже ориентира в {stepGoal|full}.', 'Проще всего добрать: 10 минут ходьбы после еды. Число за сегодня смотри в источнике.'], ['The 7-day average is {steps7|full} a day, which is below the target of {stepGoal|full}.', 'The easiest way to add: 10 minutes of walking after meals. Check today\'s number in the source.'], { when: below }),
      V('steps_today_4', 'За 7 дней в среднем {steps7|full} в день, ориентир в {stepGoal|full} достигнут. Сегодняшнюю цифру отдельно не вижу.', 'Over 7 days you average {steps7|full} a day, so the target of {stepGoal|full} is met. I do not see today\'s figure separately.', { when: atGoal }),
      V('steps_today_5', ['За 7 дней — {steps7|full} в день, за 30 дней — {steps30|full} в день.', 'Периоды разные, поэтому я не выдаю их за «сегодня».'], ['Over 7 days: {steps7|full} a day; over 30 days: {steps30|full} a day.', 'The periods differ, so I do not pass them off as "today".']),
      V('steps_today_6', ['Если нужно точное число за сегодня, смотри на часах или в приложении-источнике.', 'У меня недельное среднее: {steps7|full} в день.'], ['If you need the exact number for today, look at the watch or the source app.', 'I have the weekly average: {steps7|full} a day.']),
      V('steps_today_7', 'Шаги — {steps7|full} в день в среднем за 7 дней, активного времени за это время — {active7|full}.', 'Steps: {steps7|full} a day on average over 7 days, with {active7|full} of active time over the same period.'),
      V('steps_today_8', 'Данных о шагах у меня нет: либо не выданы разрешения Health Connect, либо источник ещё не передал значения. Это не ноль шагов, а отсутствие данных.', 'I have no step data: either Health Connect permissions are not granted or the source has not passed values yet. That is not zero steps but missing data.', { humorOk: false, when: (e) => !hasSteps(e) }),
      V('steps_today_9', 'Шагов не вижу. Проверь доступ в Health Connect и синхронизацию часов или запиши шаги вручную в «Записать вручную».', 'I see no steps. Check Health Connect access and watch sync, or enter steps in Log manually.', { humorOk: false, when: (e) => !hasSteps(e) }),
    ] }),
];
