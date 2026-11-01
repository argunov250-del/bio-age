// Группа 3 (расширение training.js): решение о тренировке. Тренироваться ли; выполнить план; облегчить; альтернатива;
// важные условия неизвестны; «мне нельзя?». «Почему такая рекомендация» обслуживает команда «почему» (control) по
// последней рекомендации, а блоки explain ниже нужны для «подробнее».
// Рекомендация везде одна и та же: {baseTrain} — прежняя логика analyze() (готовность, восстановление, нагрузка).
// Готовность не выводится из шагов; нет данных — честное «оценить не могу», а не «норма».
import { P } from '../nlu';
import { BV } from './kit';
import { RS, hasAny, isTired, isUnknown, isOk, isTrainish, CANCELLED } from './lexA';

const TWORD = '(?:тренироваться|потренироваться|тренируюсь|тренируемся|тренировка|тренировку|тренить|заниматься|позаниматься|идти в зал|пойти в зал|идти на тренировку|пойти на тренировку)';
const TQ = P('(?:стоит|надо|нужно|можно|имеет смысл) ли (?:мне )?(?:сегодня )?' + TWORD + '|' + TWORD + ' (?:мне )?сегодня|сегодня (?:мне )?' + TWORD + '|идти ли (?:мне )?(?:на тренировку|в зал|заниматься)|should i (?:train|work out|exercise)(?: today)?|train today|workout today|(?:do i|should i) (?:train|work out|exercise)|can i (?:train|work out|exercise)(?: today)?|is it (?:ok|a good day|fine) to (?:train|work out)|train or (?:not|rest)');
const TBARE = P('тренироваться(?: или нет| или отдыхать| или отдых)?|потренироваться|тренируемся|тренировка|train|workout');
const TWANT = P(TWORD + '|train|work out|exercise|workout');
const FORB = P('(?:мне )?нельзя(?: ли)?(?: мне)?(?: сегодня)? (?:тренироваться|потренироваться|заниматься|бегать|в зал|ходить в зал|тренить)|(?:мне )?запрещено(?: ли)?(?: мне)? (?:тренироваться|заниматься)|am i (?:not )?(?:allowed|supposed) to (?:train|work out|exercise)|is (?:training|exercise|working out) (?:off limits|forbidden|not allowed)|can\'t i (?:train|work out)|not allowed to (?:train|work out)');
const FOLLOW = P('(?:выполнять|выполнить|держаться|придерживаться|следовать) (?:мне )?(?:сегодня )?(?:план\\S*|запланированн\\S*|программ\\S*)|идти (?:мне )?(?:сегодня )?по плану|делать (?:мне )?(?:сегодня )?запланированн\\S*|запланированн\\S* (?:тренировк\\S*|занят\\S*)|по плану(?: ли)?(?: мне)? (?:тренироваться|заниматься|идти)|(?:надо|нужно|стоит|можно) ли (?:мне )?(?:по плану|выполнять план|делать запланированн\\S*|идти по плану)|(?:follow|stick to|keep to) (?:the |my )?(?:plan|schedule|program)|as planned|planned (?:workout|session)|go by the plan');
const LIGHTW = P('облегч\\S*|полегче|легче|легкую|легкая|легкий|лайтов\\S*|поменьше|не такую тяжелую|lighter|easier|light|easy|gentler|go easy|take it easy');
const SIMPLERW = P('проще|simpler');
const ASKFORM = P('хочу|хочется|давай|сделай\\S*|облегчи\\S*|можно|нужно|надо|предложи\\S*|дай|посоветуй|подбери|want|make|give|can|let\'s|suggest|please|lighten');
const FEEL = P('мне (?:стало )?легче|стало легче|легче стало|feel(?:s)? (?:lighter|better)|got easier|gets easier');
const ALT = P('чем (?:можно )?заменить (?:тренировк\\S*|занят\\S*|бег\\S*|зал)|что (?:можно )?вместо (?:тренировк\\S*|занят\\S*|бега|зала|силовой)|альтернатив\\S* (?:тренировк\\S*|занят\\S*|бег\\S*)|другую тренировку|другая тренировка|другой вид (?:тренировк\\S*|нагрузк\\S*|занят\\S*)|заменить (?:тренировку|занятие)|замена (?:тренировк\\S*|занят\\S*)|what (?:can|could) i do instead of|alternative (?:to|for) (?:a |the |my )?(?:workout|training|run|gym)|swap (?:the |my )?(?:workout|session)|different (?:workout|exercise)|replace (?:the |my )?(?:workout|run|session)|something instead of (?:a |the )?(?:workout|training|run)');

const calm = (n) => !n.past && !n.aboutPrev && !n.cont && !n.gibberish && !hasAny(n.norm, [CANCELLED]);
const onlyTrain = (n) => n.topics.every((t) => t === 'train');
const isForb = (n) => calm(n) && onlyTrain(n) && hasAny(n.norm, [FORB]);
const isLight = (n) => calm(n) && !n.nothingHard && !n.avoid && !hasAny(n.norm, [FEEL]) && onlyTrain(n)
  && ((hasAny(n.norm, [LIGHTW]) && (isTrainish(n) || /нагрузк|workout|session|training|load/.test(n.norm) || n.tokens.length <= 4) && (hasAny(n.norm, [ASKFORM]) || n.tokens.length <= 3))
    || (hasAny(n.norm, [SIMPLERW]) && isTrainish(n) && n.tokens.length > 1 && !isPlanWord(n)));
const isPlanWord = (n) => /(?:^| )план/.test(n.norm);
const isAlt = (n) => calm(n) && !n.avoid && n.want !== 'neg' && onlyTrain(n) && hasAny(n.norm, [ALT]);
const isFollow = (n) => calm(n) && n.want !== 'neg' && onlyTrain(n) && hasAny(n.norm, [FOLLOW]);
const isTrainQ = (n) => calm(n) && !n.avoid && n.want !== 'neg' && onlyTrain(n) && !isForb(n) && !isLight(n) && !isAlt(n) && !isFollow(n) && !n.nothingHard
  && (hasAny(n.norm, [TQ])
    || (n.tokens.length <= 3 && hasAny(n.norm, [TBARE]))
    || (n.want === 'pos' && hasAny(n.norm, [TWANT]) && n.tokens.length <= 6));

const g = { group: 'training', topic: 'train', recommends: 'train' };
const EXPLAIN = ['Опираюсь на готовность {readiness} из расчётов приложения, а не на шаги и не на настроение дня.', 'I rely on readiness {readiness} from the app\'s calculations, not on steps or the mood of the day.', ['readiness']];
const BT = ['{baseTrain}', '{baseTrain}'];
const ASK_PLACE = ['Где планируешь заниматься: дома, в зале или на улице?', 'Where do you plan to train: at home, at the gym or outdoors?'];
const ASK_ACT = ['Что хотел: бег, силовую или что-то спокойное?', 'What did you have in mind: running, strength or something easy?'];

export const DECISION = [
  // «Мне нельзя тренироваться?»: запретов не выдаём и не диагностируем, называем рекомендацию на сегодня.
  RS({ ...g, id: 'train_forbidden_q', humor: [],
    phrase: isForb, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Мне нельзя тренироваться?', 'нельзя ли мне сегодня тренироваться', 'мне запрещено заниматься?', 'am I allowed to train', 'is training off limits'],
    negatives: ['хочу тренироваться', 'не хочу тренироваться', 'вчера мне было нельзя тренироваться', 'почему ты советуешь тренироваться'],
    continuations: { why: 'объяснение по готовности', other: 'другой вариант ответа' },
    variants: [
      BV('train_forbidden_q_1', { main: ['Запретов я не выдаю и не диагностирую: противопоказания определяет врач.', 'I do not hand out bans or diagnose: contraindications are for a doctor.'], action: ['По данным восстановления на сегодня: {baseTrain}', 'By recovery data for today: {baseTrain}'] }, { humorOk: false }),
      BV('train_forbidden_q_2', { main: ['В моих правилах запрета нет. Есть рекомендация на сегодня.', 'There is no ban in my rules. There is a recommendation for today.'], action: BT }, { humorOk: false }),
      BV('train_forbidden_q_3', { main: ['Если «нельзя» про здоровье (травма, болезнь, назначение врача), слово за врачом.', 'If "not allowed" is about health (an injury, an illness, a doctor\'s order), the doctor has the final word.'], action: ['Если про сегодняшний день: {baseTrain}', 'If it is about today: {baseTrain}'] }, { humorOk: false }),
      BV('train_forbidden_q_4', { main: ['«Нельзя» я не говорю, но готовность сегодня {readiness}.', 'I do not say "not allowed", but readiness today is {readiness}.'], action: ['И вот что из этого следует: {baseTrain}', 'And here is what follows: {baseTrain}'], explain: EXPLAIN }, { when: (e) => !isTired(e), humorOk: false }),
      BV('train_forbidden_q_5', { main: ['Не запрещаю и не диагностирую.', 'I do not forbid and I do not diagnose.'], action: ['Сегодня: {baseTrain}', 'Today: {baseTrain}'] }, { humorOk: false }),
    ] }),

  // «Облегчить тренировку».
  RS({ ...g, id: 'train_lighten', humor: [],
    phrase: isLight, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Облегчи тренировку', 'хочу полегче сегодня на тренировке', 'сделай тренировку проще', 'лёгкую тренировку давай', 'make the workout lighter', 'go easy today'],
    negatives: ['проще', 'а попроще?', 'мне легче после тренировки', 'вчера было полегче', 'ничего сложного'],
    continuations: { why: 'объяснение по готовности', simpler: 'plan_one_step', other: 'другой способ облегчить' },
    variants: [
      BV('train_lighten_1', { main: ['Облегчаем: готовность сегодня {readiness}.', 'Lightening it: readiness today is {readiness}.'], action: ['Вместо тренировки: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'Instead of a workout: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'], explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('train_lighten_2', { main: ['Легче — это тот же блок в разговорном темпе.', 'Lighter means the same block at a talking pace.'], action: ['Спокойное кардио или техника и мобильность вместо интенсивной работы.', 'Easy cardio or technique and mobility instead of hard work.'] }, { when: (e) => isOk(e) }),
      BV('train_lighten_3', { main: ['Оставь только основное: разминка и главный блок, остальное по самочувствию.', 'Keep only the essentials: warm-up and the main block, the rest by feel.'] }),
      BV('train_lighten_4', { main: ['Сделай то же самое, но короче и без прибавок.', 'Do the same thing, but shorter and with no increases.'], action: ['Нагрузку повышай не больше чем на 10% в неделю, а сегодня и вовсе без повышения.', 'Raise load by no more than 10% a week, and today not at all.'] }, { humorOk: false }),
      BV('train_lighten_6', { main: ['Без данных о восстановлении самый надёжный способ облегчить — идти по самочувствию.', 'Without recovery data the most reliable way to lighten is to go by how you feel.'], action: ['Спокойный темп, когда можно разговаривать.', 'An easy pace where you can still talk.'] }, { when: (e) => isUnknown(e), humorOk: false }),
      BV('train_lighten_5', { main: ['Облегчить можно разные вещи.', 'There are different things to lighten.'], clarify: ['Что облегчить: саму тренировку или остальной день?', 'What should be lighter: the workout itself or the rest of the day?'] }, { pending: { key: 'simplify_what' }, humorOk: false }),
    ] }),

  // «Чем заменить тренировку?»
  RS({ ...g, id: 'train_alternative', humor: [],
    phrase: isAlt, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Чем заменить тренировку?', 'что можно вместо бега', 'есть альтернатива тренировке', 'другая тренировка есть', 'what can I do instead of a workout', 'alternative to the gym'],
    negatives: ['Не хочу бегать, предложи что-то дома', 'без бега, что можно в зале?', 'вчера заменил тренировку', 'хочу тренироваться'],
    continuations: { why: 'объяснение по готовности', other: 'другая замена' },
    variants: [
      BV('train_alternative_1', { main: ['Из спокойного: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'From the easy options: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'], action: ['Тяжёлое сегодня лучше пропустить.', 'The hard stuff is better skipped today.'] }, { when: (e) => isTired(e), humorOk: false }),
      BV('train_alternative_2', { main: ['Замена на сегодня: быстрая ходьба или лёгкий велосипед 20–30 минут, либо растяжка и йога.', 'A swap for today: brisk walking or an easy bike ride for 20–30 minutes, or stretching and yoga.'] }, { when: (e) => !isTired(e) }),
      BV('train_alternative_3', { main: ['Замена зависит от места.', 'The swap depends on the place.'], clarify: ['Где удобнее: дома, в зале или на улице?', 'Where is better: at home, at the gym or outdoors?'] }, { needs: ['askPlace'], pending: { key: 'place' }, humorOk: false }),
      BV('train_alternative_4', { main: ['Дома: растяжка или йога 20–30 минут, либо лёгкая тренировка в темпе, когда можно разговаривать.', 'At home: stretching or yoga for 20–30 minutes, or an easy workout at talking pace.'] }, { when: (e) => e.place === 'home' }),
      BV('train_alternative_5', { main: ['В зале: спокойное кардио 30–45 минут в разговорном темпе.', 'At the gym: easy cardio for 30–45 minutes at talking pace.'] }, { when: (e) => e.place === 'gym' }),
      BV('train_alternative_6', { main: ['На улице: прогулка или лёгкий велосипед 20–30 минут.', 'Outdoors: a walk or an easy bike ride for 20–30 minutes.'] }, { when: (e) => e.place === 'outdoor' }),
      BV('train_alternative_7', { main: ['Замена не обязана быть спортивной.', 'The swap does not have to be sporty.'], action: ['10–15 минут ходьбы после еды тоже считаются.', '10–15 minutes of walking after a meal count too.'] }),
      BV('train_alternative_8', { main: ['Движение без формы и инвентаря: лестница вместо лифта и прогулка по пути.', 'Movement without gear: stairs instead of the lift and a walk on the way.'] }),
    ] }),

  // «Выполнить план?»
  RS({ ...g, id: 'train_follow_plan', humor: [],
    phrase: isFollow, applies: () => true, blocked: (e) => !!e.sens,
    positives: ['Выполнять план сегодня?', 'надо ли идти по плану', 'делать запланированную тренировку?', 'придерживаться плана?', 'should I follow the plan', 'stick to the plan today?'],
    negatives: ['что по плану', 'не хочу выполнять план', 'составил план на неделю', 'вчера выполнил план'],
    continuations: { why: 'объяснение по готовности', simpler: 'train_lighten', other: 'другой вариант ответа' },
    variants: [
      BV('train_follow_plan_1', { main: ['План — ориентир, а не обязательство.', 'A plan is a guide, not an obligation.'], action: BT }),
      BV('train_follow_plan_2', { main: ['Сверяй план с готовностью: сегодня {readiness}.', 'Check the plan against readiness: {readiness} today.'], action: BT, explain: EXPLAIN }, { when: (e) => !isTired(e), humorOk: false }),
      BV('train_follow_plan_3', { main: BT, clarify: ['Что стоит в плане сегодня?', 'What is in the plan today?'] }, { needs: ['askActivity'], pending: { key: 'activity' } }),
      BV('train_follow_plan_4', { main: ['В плане: {knownActivity}.', 'In the plan: {knownActivity}.'], action: ['Сверим с состоянием: {baseTrain}', 'Let us check it against your state: {baseTrain}'] }),
      BV('train_follow_plan_5', { main: ['План сегодня лучше облегчить: готовность {readiness}.', 'Better to lighten today\'s plan: readiness {readiness}.'], action: ['Вместо тренировки: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'Instead of a workout: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'], explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('train_follow_plan_6', { main: ['По данным восстановление позволяет идти по плану, без лишних прибавок.', 'By the data recovery lets you follow the plan, with no extra increases.'], action: ['Если по ходу станет тяжело, сократи: оставь разминку и главный блок.', 'If it gets hard along the way, cut it down: keep the warm-up and the main block.'] }, { when: (e) => isOk(e) }),
      BV('train_follow_plan_7', { main: ['Без данных о восстановлении план остаётся ориентиром, а решает самочувствие.', 'Without recovery data the plan is only a guide and how you feel decides.'], action: ['Бодр — делай по плану умеренно, вял — замени прогулкой.', 'Energetic: do the plan at a moderate level. Sluggish: swap in a walk.'] }, { when: (e) => isUnknown(e), humorOk: false }),
      BV('train_follow_plan_8', { main: ['Держаться плана или нет — решает состояние, а не календарь.', 'Whether to stick to the plan is decided by how you are, not by the calendar.'], action: BT }),
    ] }),

  // Важные условия неизвестны: восстановление оценить нечем.
  RS({ ...g, id: 'train_unknown', humor: [],
    phrase: isTrainQ, applies: (e) => isUnknown(e), blocked: (e) => !!e.sens,
    positives: [], // зависит от состояния дня (нет данных о восстановлении): проверяется в coachCatalogA.test.js
    phrasings: ['Тренироваться сегодня?', 'стоит ли тренироваться', 'хочу тренироваться', 'should I train today'],
    notFor: ['не хочу тренироваться', 'вчера хотел тренироваться', 'мне нельзя тренироваться?', 'почему ты советуешь тренироваться?'],
    continuations: { why: 'объяснение: данных мало', other: 'другой вариант ответа' },
    variants: [
      BV('train_unknown_1', { main: BT, clarify: ['Что собираешься делать: бег, силовую или что-то спокойное?', 'What are you going to do: running, strength or something easy?'] }, { needs: ['askActivity'], pending: { key: 'activity' } }),
      BV('train_unknown_2', { main: ['Данных для точного ответа нет, и придумывать оценку я не буду.', 'There is no data for a precise answer, and I will not make up an estimate.'], action: ['Запиши сон и шаги в «Записать вручную» — и советы станут точнее.', 'Log sleep and steps in Log manually and the tips will get sharper.'] }, { humorOk: false }),
      BV('train_unknown_3', { main: ['Без данных о восстановлении безопасная середина такая: начни с разминки и смотри, как идёт.', 'Without recovery data the safe middle is this: start with a warm-up and see how it goes.'], action: ['Идёт легко — продолжай умеренно; тяжело — переходи на прогулку.', 'If it goes easily, continue at a moderate level; if it is hard, switch to a walk.'] }),
      BV('train_unknown_4', { main: BT, clarify: ['Где будешь заниматься: дома, в зале или на улице?', 'Where will you train: at home, at the gym or outdoors?'] }, { needs: ['askPlace'], pending: { key: 'place' } }),
      BV('train_unknown_5', { main: ['В плане {knownActivity}. Данных о восстановлении нет, так что начинай спокойно и ориентируйся на самочувствие.', 'You have {knownActivity} in mind. There is no recovery data, so start easy and go by how you feel.'] }, { humorOk: false }),
      BV('train_unknown_6', { main: ['Уверенного «да» или «нет» без данных у меня нет.', 'Without data I have no confident yes or no.'], action: ['Ориентир один — самочувствие: бодр — умеренная тренировка, вял — прогулка.', 'The one guide is how you feel: energetic, a moderate workout; sluggish, a walk.'] }, { humorOk: false }),
    ] }),

  // Тренироваться ли сегодня (данные о восстановлении есть).
  RS({ ...g, id: 'train_today', humor: [],
    phrase: isTrainQ, applies: (e) => !isUnknown(e), blocked: (e) => !!e.sens,
    positives: ['Тренироваться сегодня?', 'стоит ли сегодня тренироваться', 'можно ли потренироваться', 'идти ли в зал', 'хочу тренироваться', 'Тренироваться?', 'тренероваться сегодня', 'should I train today', 'can I work out', 'train or rest'],
    negatives: ['не хочу тренироваться', 'вчера хотел тренироваться', 'мне нельзя тренироваться?', 'почему ты советуешь тренироваться?', 'я люблю тренироваться по утрам и читать', 'передумал тренироваться', 'не хочу бегать, предложи что-то дома'],
    continuations: { why: 'объяснение по готовности', simpler: 'train_lighten', other: 'другой вариант ответа' },
    variants: [
      BV('train_today_1', { main: ['Готовность сегодня {readiness}.', 'Readiness today is {readiness}.'], action: BT, explain: EXPLAIN }, { when: (e) => !isTired(e) }),
      BV('train_today_7', { main: ['Смотрю на восстановление, а не на настроение дня.', 'I am looking at recovery, not at the mood of the day.'], action: BT, explain: EXPLAIN }, { when: (e) => isTired(e), humorOk: false }),
      BV('train_today_2', { main: BT, action: ['Завтра посмотрим снова.', 'We will check again tomorrow.'] }),
      BV('train_today_3', { main: ['За неделю у тебя {workouts7|full}.', 'This week you have {workouts7|full}.'], action: BT }),
      BV('train_today_4', { main: BT, clarify: ASK_PLACE }, { needs: ['askPlace'], pending: { key: 'place' } }),
      BV('train_today_5', { main: ['Хорошо, {knownPlace}.', 'Okay, {knownPlace}.'], action: BT }),
      BV('train_today_6', { main: BT, clarify: ASK_ACT }, { needs: ['askActivity'], pending: { key: 'activity' }, humorOk: false }),
    ] }),
];
