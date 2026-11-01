// Группа 8: привычки. Привычка — не экзамен: без вины и отработок. Рекомендации — из существующей логики приложения
// (вернуться к плану со следующего занятия, вполовину от прежнего объёма, не больше +10% в неделю, 10 минут ходьбы).
// Пропуск, которым человек расстроен, — без юмора.
import { P } from '../nlu';
import { V, BV, SC } from './kit';
import { ACTW, REFUSE, ILLNESS, only, num } from './bkit';

const g = { group: 'habits', topic: 'habit' };
const MISS = P('пропустил\\S*|пропуск|не сходил\\S*|не пошел|не пошла|не ходил\\S*|забил\\S*|забыл\\S* (про )?(трен\\S*|занят\\S*|зарядк\\S*)|не позанимал\\S*|сорвал\\S*|не вышло (сходить|позаниматься|потренироваться)|не получилось (сходить|позаниматься|потренироваться)|(i )?(missed|skipped|blew off)|did(n\'t| not) (go|work out|train|make it|exercise)');
const UPSET = P('зл(юсь|ой|ая|ит)|расстро\\S*|огорч\\S*|обидно|досадно|кор[юя]\\S*|ругаю\\S*|виню|вина|виноват\\S*|бесит|раздража\\S*|переживаю|angry|mad at|upset|annoyed|frustrated|beat(ing)? myself|blame|feel bad|guilty|ashamed');
const FEAR = P('боюсь|страшно|бросить|брошу|afraid|scared|quit again|give up');
const RETURN = P('вернул\\S* (к|в|на)|возвращаюсь|вернуться (к|в|на)|снова начал\\S*|начинаю заново|начать заново|возобнови\\S*|после (перерыва|паузы|отпуска|простоя)|back (to|at|in)|getting back|restart\\S*|resum\\S*|after (a |my )?(break|pause|holiday|vacation|time off)');
const STREAK = P('сери[яюиеей]|серией|стрик\\S*|streak\\S*');
const CHAIN = P('цепочк\\S*|подряд|chain|in a row');
const HARD = P('(цель|план|привычк\\S*|задач\\S*|норма) (слишком|очень|чересчур) (сложн\\S*|тяжел\\S*|трудн\\S*|амбициозн\\S*|большая|высок\\S*|жестк\\S*)|слишком (сложн\\S*|амбициозн\\S*|жестк\\S*) (цель|план|привычк\\S*|задач\\S*)|не (тяну|вытягиваю|справляюсь|получается выдерживать|получается выполнять) (с |со )?(свою |эту |мою |своей |этой |моей )?(цель|план\\S*|привычк\\S*|норм\\S*)|(goal|plan|habit|target) (is |was )?too (hard|big|ambitious|difficult|much)|too hard to keep|can\'t keep up with (my |the )?(goal|plan|habit)');
const HABW = P('привыч\\S*|рутин\\S*|habit\\S*|routine\\S*');
const SIMPLE = P('прост\\S*|проще|попроще|полегче|легче|минимальн\\S*|упрост\\S*|легч\\S*|минимум\\S*|мини|облегч\\S*|меньше|меньш\\S*|коротк\\S*|simpl\\S*|easier|minimum|smaller|tiny|lighter|shorter');
const CONTENT = P('мне (хватает|достаточно)|доволен\\S*|довольна|устраивает|не нужны (мне )?(рекорд\\S*|больше)|не хочу (больше|рекорд\\S*)|нравится как есть|и так (хорошо|нормально|достаточно)|happy with|content with|enough for me|good enough|satisfied with|fine with');

const up = (e) => !!(e && e.env && e.env.nlu && UPSET.test(e.env.nlu.norm));

export const HABITS_SC = [
  SC({ ...g, id: 'hab_hard_goal',
    match: (n) => HARD.test(n.norm) && !REFUSE.test(n.norm) && !n.past && !ILLNESS.test(n.norm),
    positives: ['Цель слишком сложная', 'не справляюсь с планом', 'моя цель слишком амбициозная', 'my goal is too hard', 'не вытягиваю привычку'],
    negatives: ['вчера цель была слишком сложной', 'не справляюсь с работой', 'болею и не тяну план', 'какая у меня цель'],
    variants: [
      V('hab_hard_1', ['Если цель не вытягивается, чаще дело в её размере, а не в тебе. Сократи её вдвое и держи так пару недель.', 'Прибавим, когда новая планка станет привычной.'], ['If a goal does not hold, it is usually about its size, not about you. Cut it in half and keep it that way for a couple of weeks.', 'We add again once the new bar feels ordinary.']),
      V('hab_hard_2', 'Цель, которую не вытянуть, перестаёт быть целью и превращается в упрёк. Давай её уменьшим: лучше маленькая и выполненная.', 'A goal you cannot hold stops being a goal and turns into a reproach. Let us shrink it: small and done beats big and missed.', { humorOk: false }),
      BV('hab_hard_3', { main: ['Оставим минимум: одно занятие или 10 минут ходьбы в день.', 'Let us keep a minimum: one session or 10 minutes of walking a day.'], action: ['Когда минимум станет привычным, прибавим понемногу.', 'Once the minimum feels ordinary, we add a little.'] }),
      V('hab_hard_4', 'Какая часть цели тяжелее всего: время, силы или сама нагрузка? Уберём именно её.', 'Which part of the goal is hardest: time, energy or the load itself? We will remove exactly that.', { humorOk: false }),
      V('hab_hard_5', 'Это нормальный повод пересмотреть план. Цель можно менять: привычки держатся на выполнимых шагах.', 'This is a fair reason to revisit the plan. A goal can change: habits rest on doable steps.', { humorOk: false, short: { ru: 'Пересмотрим цель: поменьше, но выполнимо.', en: 'Let us revisit the goal: smaller but doable.' } }),
    ] }),

  SC({ ...g, id: 'hab_simplify',
    match: (n) => HABW.test(n.norm) && SIMPLE.test(n.norm) && !REFUSE.test(n.norm) && !n.past && !MISS.test(n.norm) && !HARD.test(n.norm) && !RETURN.test(n.norm),
    positives: ['Упрости мою привычку', 'сделай привычку проще', 'хочу минимальную версию привычки', 'make my habit simpler', 'хочу сделать свою привычку проще'],
    negatives: ['проще', 'какая у меня привычка', 'вчера упростил привычку', 'привычка вернуться к тренировкам после перерыва'],
    variants: [
      V('hab_simple_1', 'Сделаем привычку такой маленькой, чтобы её нельзя было не выполнить: одно действие, 10 минут, в одно и то же время.', 'Let us make the habit so small that it cannot be skipped: one action, 10 minutes, at the same time.'),
      BV('hab_simple_2', { main: ['Оставь одно действие вместо набора.', 'Keep one action instead of a set.'], action: ['Привяжи его к тому, что ты и так делаешь каждый день.', 'Tie it to something you already do every day.'] }),
      V('hab_simple_3', ['Минимальная версия на плохие дни: 10 минут ходьбы или одна растяжка.', 'Обычная версия — на остальные. Так привычка не рвётся из-за одного тяжёлого дня.'], ['A minimum version for bad days: 10 minutes of walking or one stretch.', 'The usual version for other days. That way the habit does not break over one hard day.']),
      V('hab_simple_4', 'Урежь вдвое, а потом ещё раз, если надо. Главное — повторяемость.', 'Cut it in half, then once more if needed. Repetition matters most.', { short: { ru: 'Урежь вдвое. Главное — повторяемость.', en: 'Cut it in half. Repetition matters most.' } }),
      V('hab_simple_5', 'Привычка не экзамен: достаточно маленького шага, который получится при любом настроении.', 'A habit is not an exam: a small step that works in any mood is enough.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'hab_streak',
    match: (n) => (STREAK.test(n.norm) || (CHAIN.test(n.norm) && (ACTW.test(n.norm) || /дн|день|шаг|day|step/.test(n.norm)))) && !REFUSE.test(n.norm) && !n.past && !ILLNESS.test(n.norm),
    positives: ['Моя серия прервалась', 'как держать серию занятий', 'пропустил день и серия сбилась', 'my streak broke', 'не хочу терять серию'],
    negatives: ['вчера прервалась серия', 'сериал про тренировки', 'подряд три тренировки болят ноги', 'какая сегодня погода'],
    variants: [
      V('hab_streak_1', ['Серия — удобный счётчик, но не цель сама по себе. Прервалась — начинаем новую без драмы.', 'Новая серия начинается с ближайшего занятия.'], ['A streak is a handy counter, but not a goal in itself. If it broke, we start a new one without drama.', 'A new streak starts with the nearest session.']),
      V('hab_streak_2', 'Дни подряд — хороший ориентир, но картина складывается за недели, а не за одну цепочку. Один пропуск её не обнуляет.', 'Days in a row are a good marker, but the picture builds over weeks, not one chain. A single miss does not reset it.'),
      V('hab_streak_3', 'Если ради серии приходится заниматься через силу, серия начинает работать против тебя. Лёгкий день тоже полезен.', 'If the streak makes you push through, it starts working against you. An easy day is useful too.', { humorOk: false }),
      V('hab_streak_4', 'Прервалась — не страшно. Новая серия начнётся с ближайшего занятия.', 'It broke, no big deal. A new streak starts with the nearest session.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'hab_return', humor: ['return_habit'],
    match: (n) => RETURN.test(n.norm) && (ACTW.test(n.norm) || /зал|спорт|занят|трен|gym|sport/.test(n.norm)) && !FEAR.test(n.norm) && !ILLNESS.test(n.norm) && !REFUSE.test(n.norm) && !n.past,
    positives: ['Хочу вернуться к тренировкам после перерыва', 'вернулся в зал', 'снова начал бегать', 'I am getting back to training', 'возвращаюсь к занятиям'],
    negatives: ['вернулся с работы', 'боюсь снова бросить тренировки', 'после болезни вернусь к тренировкам', 'вчера вернулся в зал'],
    variants: [
      V('hab_return_1', ['Возвращайся мягко: первые 1–2 недели вполовину от прежнего объёма, потом прибавляй понемногу.', 'Нагрузку повышай не больше чем на 10% в неделю.'], ['Return gently: for the first 1–2 weeks do half of your old volume, then add a little at a time.', 'Raise the load by no more than 10% a week.']),
      BV('hab_return_2', { main: ['Начни с половины прежнего объёма на 1–2 недели.', 'Start with half of your old volume for 1–2 weeks.'], action: ['Потом прибавляй понемногу, не больше чем на 10% в неделю.', 'Then add a little at a time, by no more than 10% a week.'] }),
      V('hab_return_3', 'Возвращаться можно с самого простого: короткая прогулка или лёгкое занятие, чтобы тело и график вспомнили друг друга. Объём — вполовину от прежнего.', 'You can return with the simplest thing: a short walk or an easy session, so the body and the schedule get reacquainted. Volume: half of the old one.'),
      V('hab_return_4', 'С возвращением. Первые 1–2 недели — вполовину от прежнего объёма, без попытки сразу догнать прошлую форму.', 'Welcome back. For the first 1–2 weeks, half of the old volume, without trying to catch up with your old shape right away.'),
      V('hab_return_5', 'Не пытайся наверстать пропущенное одним махом. Половина прежнего объёма на 1–2 недели, потом прибавляй понемногу.', 'Do not try to make up for the gap in one go. Half of the old volume for 1–2 weeks, then add a little at a time.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'hab_content',
    match: (n) => CONTENT.test(n.norm) && (ACTW.test(n.norm) || /шаг|прогул|темп|объем|объём|как есть|step|walk|pace/.test(n.norm)) && !REFUSE.test(n.norm) && !n.past && !n.modalQuestion && only(n, 'train', 'steps', 'stress'),
    positives: ['Мне хватает двух тренировок в неделю', 'я доволен своими шагами', 'меня устраивает мой темп тренировок', 'I am happy with my current routine', 'мне достаточно прогулок'],
    negatives: ['доволен погодой', 'вчера был доволен тренировкой', 'не хватает времени на тренировки', 'мне хватает сна'],
    variants: [
      V('hab_content_1', ['Если тебя устраивает, это уже ответ. Расти не обязательно: поддерживать то, что работает, тоже цель.'], ['If it suits you, that is already the answer. Growing is not required: maintaining what works is a goal too.']),
      V('hab_content_2', 'Малое, которое повторяется, лучше большого, которое не выдерживается. Оставляй как есть.', 'Small and repeated beats big and unsustained. Keep it as it is.'),
      V('hab_content_3', 'Хорошо, ничего добавлять не буду. Если захочется перемен, скажи.', 'Fine, I will not add anything. If you want a change, say so.', { humorOk: false, short: { ru: 'Хорошо, оставляем как есть.', en: 'Fine, we keep it as it is.' } }),
      BV('hab_content_4', { main: ['Тогда держим текущий уровень.', 'Then we keep the current level.'], extra: ['Шаги за 7 дней — {steps7|full} в день.', 'Steps over 7 days: {steps7|full} a day.', ['steps7']] }),
      V('hab_content_5', 'Рекорды не обязательны. Привычка, которая нравится и повторяется, уже делает свою работу.', 'Records are not required. A habit that you like and repeat is already doing its job.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'hab_missed',
    match: (n) => MISS.test(n.norm) && (ACTW.test(n.norm) || /день|дня|неделю|week|day/.test(n.norm)) && !n.want && !n.modalQuestion && !REFUSE.test(n.norm),
    positives: ['Я пропустил занятие и теперь злюсь на себя', 'пропустил тренировку', 'не сходил сегодня в зал', 'I missed my workout', 'сорвалась с тренировок на неделю'],
    negatives: ['хочу пропустить тренировку', 'можно пропустить занятие?', 'не хочу пропускать тренировки', 'пропустил обед'],
    variants: [
      V('hab_missed_up_1', ['Понимаю, это неприятно.', 'Давай не превращать один пропуск в наказание. Можно вернуться к следующему запланированному занятию.'], ['I understand, that is unpleasant.', 'Let us not turn one miss into a punishment. You can go back to the next planned session.'], { humorOk: false, when: (e) => up(e) }),
      V('hab_missed_up_2', ['Понятно, что неприятно. Но злость не добавляет занятий.', 'Сделай следующий шаг маленьким: ближайшее занятие в обычном объёме, без отработки.'], ['It is understandable that this feels bad. But anger does not add sessions.', 'Make the next step small: the nearest session at the usual volume, with no making up.'], { humorOk: false, when: (e) => up(e) }),
      V('hab_missed_up_3', ['Не будем делать из пропуска экзамен. Привычка — длинная дорога, а не отметки в журнале.', 'Что мешает вернуться: время, силы или настроение? Подберём вариант полегче.'], ['We will not turn a miss into an exam. A habit is a long road, not marks in a gradebook.', 'What stands in the way of returning: time, energy or mood? We will find a lighter option.'], { humorOk: false, when: (e) => up(e) }),
      V('hab_missed_up_4', 'Спокойно. Один пропуск не отменяет сделанного раньше. Следующее занятие — по плану, без добавок.', 'Easy. One miss does not cancel what you did before. The next session goes by the plan, with no extras.', { humorOk: false, when: (e) => up(e), short: { ru: 'Спокойно. Следующее занятие — по плану.', en: 'Easy. The next session goes by the plan.' } }),
      V('hab_missed_1', ['Один пропуск не ломает неделю. Вернись к следующему запланированному занятию без добавок и «отработок».'], ['One miss does not break the week. Go back to the next planned session with no extras and no "making up".'], { when: (e) => !up(e) }),
      BV('hab_missed_2', { main: ['Пропуск — это информация, а не приговор.', 'A miss is information, not a verdict.'], action: ['Следующее занятие делай в обычном объёме, без отработки пропущенного.', 'Do the next session at the usual volume, without making up the missed one.'] }, { when: (e) => !up(e) }),
      V('hab_missed_3', ['За 7 дней у тебя {workouts7|full}. Одно пропущенное занятие эту картину не обнуляет.'], ['Over 7 days you have {workouts7|full}. One missed session does not wipe that out.'], { when: (e) => !up(e) && num(e.s && e.s.workouts7) && e.s.workouts7 > 0 }),
      V('hab_missed_4', 'Пропустил — вернись к плану на следующем занятии.', 'Missed one? Get back to the plan at the next session.', { when: (e) => !up(e) }),
    ] }),
];
