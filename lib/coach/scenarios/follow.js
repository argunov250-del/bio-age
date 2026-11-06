// Защитная пауза после тревожного симптома/боли, короткие продолжения диалога («а если ненадолго?», «а если очень хочется?»,
// «почему их нет?») и честный ответ «другого варианта нет». Контекст берётся из памяти диалога (env.mem): последняя тема,
// последний сценарий, защитная пауза. Тексты — только из уже существующих рекомендаций приложения (безопасность, 103/112,
// прогулка/растяжка, разминка и главный блок); новых медицинских утверждений здесь нет.
import { P } from '../nlu';
import { V, BV, SC } from './kit';
import { isTired, isUnknown, isOk } from './lexA';

const holdKind = (e) => (e && e.env && e.env.mem && e.env.mem.hold && e.env.mem.hold.kind) || 'red';
const nluOf = (e) => (e && e.env && e.env.nlu) || { norm: '', topics: [] };
const lastSc = (e) => String((e && e.env && e.env.mem && e.env.mem.lastScenario) || '');
const TRAINTOPIC = /^(train|today|weather|procrastination|simplify|plan_review|plan_change|plan_ok)$/;
const lastTopic = (e) => String((e && e.env && e.env.mem && e.env.mem.lastTopic) || '');

const PASSES = P('пройдет|пройти|отпустит|скоро ли|надолго|долго ли|will it pass|go away|how long|will this pass');
const NORMAL = P('нормально|опасно|страшно|серьезно|это плохо|это ничего|ничего страшного|is it normal|dangerous|serious|ok\\?|is that bad');
const ALLOW = P('(?:а )?если (?:чуть[ -]чуть|немного|ненадолго|совсем|слегка|осторожно)|чуть[ -]чуть|ненадолго|можно ли|a bit|just a little|briefly|carefully');
const SELF = P('(?:я )?(?:правда |реально |просто |такой )?(?:ленивый|ленивая|лентяй|слабак|безвольный|безвольная)|i(?:\'m| am) (?:just |really )?lazy');
const WHAT = P('что (?:мне )?делать|что дальше|как быть|что теперь|что мне теперь|what (?:should|do) i do|what now|what next');

// Вид уточняющего вопроса после тревожного ответа.
export function holdSub(e) {
  const n = nluOf(e);
  const norm = n.norm || '';
  if (e && e.env && e.env.forceHold) return 'train';
  if (n.cont === 'why' || n.whyShort || /^почему|^why/.test(norm)) return 'why';
  if (PASSES.test(norm)) return 'passes';
  if (NORMAL.test(norm)) return 'normal';
  if (ALLOW.test(norm) || n.shortTime) return 'allow';
  if (WHAT.test(norm)) return 'what';
  if ((n.topics || []).includes('train') || n.activity || n.want || n.avoid) return 'train';
  return 'other';
}

const KEY = {
  red: ['Не нагружайся и не оставайся один; если одышка, боль или давление в груди не уходят, звони 103 или 112. К тренировкам вернёмся после осмотра врача.',
    'Do not exert yourself and do not stay alone; if shortness of breath, chest pain or pressure does not go away, call emergency services (112). We go back to training after a doctor has checked you.'],
  pain: ['Не нагружай больное место и дай ему покой; если боль острая, сильная или не проходит за пару дней, обратись к врачу.',
    'Do not load the sore area and let it rest; if the pain is sharp, strong or does not go away within a couple of days, see a doctor.'],
  dizzy: ['Остановись и дай телу покой; если головокружение повторяется или появятся обморок, боль в груди или одышка, звони 103 или 112, а дальше обратись к врачу.',
    'Stop and let your body rest; if the dizziness repeats or fainting, chest pain or shortness of breath appear, call emergency services (112), then see a doctor.'],
};
const LEAD = {
  what: ['Сейчас главное — безопасность, а не план на день.', 'Right now safety matters most, not the plan for the day.'],
  passes: ['Пройдёт ли это, я предсказать не могу и гадать не буду.', 'Whether it will pass, I cannot predict, and I will not guess.'],
  normal: ['Назвать это нормальным я не могу: такое лучше не оценивать самому.', 'I cannot call this normal: it is better not to judge it yourself.'],
  why: ['Потому что нагрузка в такой ситуации может навредить, а причину без врача не определить. Это правило безопасности, а не диагноз.', 'Because effort in this situation can do harm, and the cause cannot be found without a doctor. This is a safety rule, not a diagnosis.'],
  allow: ['Даже понемногу сейчас не стоит.', 'Even a little is not a good idea right now.'],
  train: ['О тренировках и нагрузке сейчас говорить рано.', 'It is too early to talk about training or effort right now.'],
  other: ['Сейчас главное — безопасность.', 'Right now safety matters most.'],
};

const holdVariants = [];
['red', 'pain', 'dizzy'].forEach((kind) => Object.keys(LEAD).forEach((sub) => {
  holdVariants.push(V(`hold_${sub}_${kind}`, [LEAD[sub][0], KEY[kind][0]], [LEAD[sub][1], KEY[kind][1]], { humorOk: false, when: (e) => holdKind(e) === kind && holdSub(e) === sub }));
}));

holdVariants.push(V('hold_crisis', ['Я здесь, и мне важно, как ты. Если мысли навредить себе не отпускают, позвони 112 или 103 или позови человека рядом: не оставайся один.', 'О тренировках и планах сейчас не говорим. Расскажи, что происходит?'],
  ['I am here, and how you are matters to me. If thoughts of harming yourself do not let go, call 112 or your local emergency number, or get someone close to you: do not stay alone.', 'We are not talking about workouts or plans right now. Tell me what is going on?'], { humorOk: false, when: (e) => holdKind(e) === 'crisis' }));

export const FOLLOW = [
  // Мягкая пауза после тяжёлых переживаний: без давления с нагрузкой и без шуток; истекает через 3 хода.
  SC({ group: 'hold', topic: 'sensitive', id: 'sens_soft_train', sensitive: true, match: () => false,
    variants: [
      V('sens_soft_train_1', ['Сегодня без давления: достаточно прогулки или просто отдыха.', 'Тренировка подождёт, когда станет легче.'], ['No pressure today: a walk or simply rest is enough.', 'The workout can wait until it feels lighter.'], { humorOk: false }),
      V('sens_soft_train_2', 'Сейчас важнее ты сам, чем план. Если хочется, пройдись спокойно 10–15 минут; если нет, это тоже нормально.', 'You matter more than the plan right now. If you like, take an easy 10–15 minute walk; if not, that is fine too.', { humorOk: false }),
    ] }),
  SC({ group: 'hold', topic: 'sensitive', id: 'sens_soft_release', sensitive: true, match: () => false,
    variants: [V('sens_soft_release_1', 'Рад, что полегче. Без спешки, я рядом.', 'Glad it is lighter. No rush, I am here.', { humorOk: false })] }),
  // Защитная пауза: уточнения после красного флага/боли получают осторожный ответ, а не меню и не рекомендацию нагрузки.
  SC({ group: 'hold', topic: 'sensitive', id: 'sens_hold_followup', sensitive: true, danger: true, match: () => false,
    variants: holdVariants }),
  SC({ group: 'hold', topic: 'sensitive', id: 'sens_hold_release', sensitive: true, match: () => false,
    variants: [
      V('sens_hold_release_1', ['Хорошо, что отпустило.', 'Если вернётся — не терпи: останови нагрузку и обратись к врачу. Сегодня лучше без тяжёлого, а дальше по самочувствию.'],
        ['Good that it passed.', 'If it returns, do not push through: stop the effort and see a doctor. Better to skip anything heavy today and go by how you feel after that.'], { humorOk: false }),
      V('sens_hold_release_2', ['Рад, что стало лучше.', 'Если симптомы повторятся, прекрати нагрузку и обратись к врачу. А пока возвращайся к привычному режиму постепенно.'],
        ['Glad you feel better.', 'If the symptoms come back, stop the effort and see a doctor. Until then return to your usual routine gradually.'], { humorOk: false }),
    ] }),

  // «А если ненадолго?», «А если совсем чуть-чуть?» — ограничение по времени к последнему плану.
  SC({ group: 'follow', id: 'follow_short_time',
    match: (n, e) => n.shortTime && !n.cont && TRAINTOPIC.test(lastTopic({ env: e })) && !n.gibberish,
    positives: [], phrasings: ['А если ненадолго?', 'А если совсем чуть-чуть?'], negatives: ['ненадолго уеду', 'сколько спать'],
    variants: [
      BV('follow_short_danger', { main: ['Даже ненадолго на улице сейчас небезопасно: {dangerWhy}.', 'Even briefly it is not safe outside right now: {dangerWhy}.'], action: ['Короткое занятие лучше сделать дома или в зале: 10–15 минут в спокойном темпе.', 'Better to do a short session at home or at the gym: 10–15 minutes at an easy pace.'] }, { needs: ['dangerWhy'], humorOk: false, when: (e) => e.level === 'danger' }),
      BV('follow_short_mot', { main: ['Тогда совсем малое: 10 минут ходьбы.', 'Then something really small: 10 minutes of walking.'], action: ['Не пойдёт — вернёшься, и это тоже засчитывается.', 'If it does not work, come back; that still counts.'] }, { when: (e) => e.level !== 'danger' && /^mot_|^proc/.test(lastSc(e)) && !isTired(e) }),
      BV('follow_short_tired', { main: ['Ненадолго можно, но без тяжёлого.', 'A short one is fine, but nothing heavy.'], action: ['Прогулка или растяжка 10–20 минут, дальше по самочувствию.', 'A walk or stretching for 10–20 minutes, then go by how you feel.'] }, { humorOk: false, when: (e) => e.level !== 'danger' && isTired(e) }),
      BV('follow_short_ok', { main: ['Если времени или сил немного, оставь разминку и главный блок.', 'If time or energy is short, keep the warm-up and the main block.'], action: ['Остальное по самочувствию; даже 20 минут лучше, чем ничего.', 'The rest by feel; even 20 minutes beat nothing.'] }, { when: (e) => e.level !== 'danger' && isOk(e) && !/^mot_|^proc/.test(lastSc(e)) }),
      BV('follow_short_unknown', { main: ['Ненадолго подойдут 10–15 минут ходьбы.', 'For a short one, 10–15 minutes of walking fits.'], action: ['Данных о восстановлении нет, так что дальше по самочувствию.', 'There is no recovery data, so go by how you feel after that.'] }, { humorOk: false, when: (e) => e.level !== 'danger' && isUnknown(e) }),
    ] }),

  // «А если очень хочется?», «Но так хочется на улицу» — желание не отменяет данных, но и не запрещает мягкий вариант.
  SC({ group: 'follow', id: 'follow_want_anyway', topic: 'train',
    match: (n, e) => n.wantMore && !n.cont && TRAINTOPIC.test(lastTopic({ env: e })) && !n.gibberish && !n.past,
    positives: [], phrasings: ['А если очень хочется?', 'Но так хочется на улицу'], negatives: ['хочу тренироваться', 'не хочу'],
    variants: [
      BV('follow_want_tired_out', { main: ['На улице можно спокойно: прогулка или лёгкий велосипед 20–30 минут, без тяжёлой тренировки.', 'Outdoors is fine at an easy pace: a walk or an easy bike ride for 20–30 minutes, no hard workout.'], action: ['Восстановление сегодня не лучшее, поэтому темп разговорный.', 'Recovery is not at its best today, so keep a talking pace.'] }, { humorOk: false, when: (e) => isTired(e) && e.place === 'outdoor' }),
      BV('follow_want_tired', { main: ['Раз хочется, выбери мягкий вариант: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'Since you want to, pick a gentle option: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'], action: ['Тяжёлое сегодня лучше пропустить: восстановление не лучшее.', 'The hard stuff is better skipped today: recovery is not at its best.'] }, { humorOk: false, when: (e) => isTired(e) && e.place !== 'outdoor' }),
      BV('follow_want_ok', { main: ['Желание — хороший знак, и данные не против.', 'The wish is a good sign, and the data does not object.'], action: ['{baseTrain}', '{baseTrain}'] }, { when: (e) => isOk(e) }),
      BV('follow_want_unknown', { main: ['Желание тоже сигнал, а данных о восстановлении нет.', 'The wish is a signal too, and there is no recovery data.'], action: ['Начни с разминки и смотри, как идёт: легко — продолжай умеренно, тяжело — переходи на прогулку.', 'Start with a warm-up and see how it goes: if easy, continue at a moderate level; if hard, switch to a walk.'] }, { humorOk: false, when: (e) => isUnknown(e) }),
    ] }),

  // «Почему их нет?» после ответа об отсутствии данных.
  SC({ group: 'follow', id: 'follow_why_data', topic: 'data',
    match: (n, e) => n.whyShort && /^data_|^sleep_missing|^sleep_last_1$/.test(lastSc({ env: e })) && !n.gibberish,
    positives: [], phrasings: ['Почему их нет?'], negatives: ['почему шагов меньше, чем в другом приложении'],
    variants: [
      V('follow_why_data_1', ['Точную причину по одному признаку не определить.', 'Чаще всего дело в разрешениях Health Connect, синхронизации часов или в том, что источник не записал данные. Проверь их, а пока сон и шаги можно внести вручную.'],
        ['The exact cause cannot be told from one sign.', 'Most often it is Health Connect permissions, watch sync, or the source not recording the data. Check them, and meanwhile sleep and steps can be entered manually.'], { humorOk: false }),
      V('follow_why_data_2', 'Причину отсюда не вижу и гадать не буду. Проверь доступ приложения к Health Connect и синхронизацию часов; сон и шаги можно записать вручную.',
        'I cannot see the cause from here and will not guess. Check the app\'s access to Health Connect and your watch sync; sleep and steps can be entered manually.', { humorOk: false }),
    ] }),

  // «Я правда ленивый» после слов о вине/стыде: мягко, без заданий и без юмора.
  SC({ group: 'follow', id: 'follow_self_label', topic: 'sensitive', sensitive: true,
    match: (n, e) => lastSc({ env: e }) === 'support' && SELF.test(n.norm) && n.tokens.length <= 8 && !n.cont && !n.gibberish,
    positives: [], phrasings: ['Но я правда ленивый'], negatives: ['мне лень идти бегать'],
    variants: [
      V('follow_self_label_1', ['Лень — не характер и не приговор: перерыв выбивает из режима почти всех.', 'Начни с малого и без наказания: 10 минут ходьбы — уже возвращение.'],
        ['Laziness is not a character flaw or a verdict: a break knocks almost everyone out of routine.', 'Start small and without punishment: 10 minutes of walking is already a return.'], { humorOk: false }),
      V('follow_self_label_2', 'Ярлык «ленивый» ничего не объясняет, а только добавляет вины. Сделаем план проще, а не строже.',
        'The label "lazy" explains nothing and only adds guilt. We make the plan simpler, not stricter.', { humorOk: false }),
    ] }),

  // Шутливое «умер после тренировки» → ответ без юмора, и следующая реплика-перекидка тоже без подколов.
  SC({ group: 'follow', id: 'follow_banter', topic: 'sensitive', sensitive: true,
    match: (n, e) => lastSc({ env: e }) === 'sens_death_joke' && n.tokens.length <= 6 && !n.topics.length && !n.cont && !n.gibberish && !n.isQuestion,
    positives: [], phrasings: ['Ага, завтра повторим'], negatives: ['как сон'],
    variants: [
      V('follow_banter_1', 'Договорились: завтра решим по самочувствию и готовности, без геройства.', 'Deal: tomorrow we decide by how you feel and by readiness, no heroics.', { humorOk: false }),
      V('follow_banter_2', 'Хорошо. Завтра посмотрим на восстановление и выберем нагрузку по нему.', 'Okay. Tomorrow we will look at recovery and pick the load by it.', { humorOk: false }),
    ] }),

  // «Тренироваться завтра?»: готовность считается по сегодняшним данным, на завтра заранее не отвечаем.
  SC({ group: 'follow', id: 'train_tomorrow', topic: 'train',
    match: (n) => n.tomorrow && !n.past && !n.cont && n.topics.length > 0 && n.topics.every((x) => x === 'train') && n.tokens.length <= 5 && n.want !== 'neg',
    positives: ['Тренироваться завтра?', 'завтра тренироваться?'], negatives: ['вчера тренировался', 'тренироваться сегодня', 'какая погода завтра'],
    variants: [
      V('train_tomorrow_1', ['На завтра заранее не отвечу: готовность считается по сну, пульсу и нагрузке, а завтрашних данных ещё нет.', 'Спроси утром — решим по свежим данным.'],
        ['I cannot answer for tomorrow in advance: readiness is built from sleep, heart rate and load, and tomorrow\'s data is not there yet.', 'Ask in the morning and we will decide from fresh data.'], { humorOk: false }),
      V('train_tomorrow_2', 'Завтра зависит от того, как ты восстановишься за ночь. Утром у меня будут новые данные, и решим по ним.',
        'Tomorrow depends on how you recover overnight. I will have new data in the morning and we will decide from it.', { humorOk: false }),
    ] }),
];
