// Группа 7: восстановление и нагрузка. Рекомендации — только из существующей логики coachBrain (state: tired / normal / fresh /
// unknown; прогулка или растяжка вместо тяжёлого; повышать нагрузку не больше чем на 10% в неделю). Новых порогов нет:
// «усталость» без данных не диагностируем, а слова человека о самочувствии принимаем как есть.
import { P } from '../nlu';
import { V, BV, SC } from './kit';
import { WHY, SLEEPW, REFUSE, ILLNESS, ACTW, only, stateOf } from './bkit';

const g = { group: 'recovery', topic: 'recovery' };
const TIRED = P('устал\\S*|вымотал\\S*|выдохся|выдохлась|замучил\\S*|усталост\\S*|вымотан\\S*|нет сил|без сил|сил нет|выжат\\S*|измотан\\S*|утомил\\S*|разбит\\S*|вялый|вялая|вялость|tired|exhausted|worn out|drained|no energy|burnt out|fatigue\\S*|wiped out|sluggish');
const MORE = P('(хочу|хочется|можно|а можно|давай|готов|готова) (ли )?(еще|ещё|побольше|больше|добавить|прибавить|усилить|повысить|увеличить|тяжелее|сильнее|сложнее|интенсивнее)|(добавить|прибавить|увеличить|усилить|повысить) (нагрузк\\S*|объем|объём|интенсивност\\S*|план|тренировк\\S*)|плана (мало|недостаточно)|план слишком (легк\\S*|простой)|(мало|маловато) нагрузки|еще одну тренировк\\S*|want (more|a harder|to add|to do more)|add (more|to the plan)|more (than|in) (the|my) plan|plan (is )?too (easy|light)|push (harder|more)|want to push|increase (the )?(load|volume|intensity)');
const REST = P('(хочу|хочется|можно|а можно|нужен|нужно|надо) (ли )?(мне )?(отдохнуть|отдых|выходной|передышк\\S*|паузу|пауза|день отдыха|расслабиться|не тренироваться)|взять (выходной|паузу|отдых|день)|устроить (выходной|отдых)|день отдыха|take (a |the )?(rest|day off|break)|rest day|day off|need (a )?(rest|break)|want to rest|can i rest|skip (it|today|the workout|training) today|можно пропустить (сегодня|тренировку|занятие)');
const LIGHT = P('облегч\\S*|легче|легк\\S*|мягч\\S*|попроще|только прогулк\\S*|лишь прогулк\\S*|отдых\\S*|без (тяжел\\S*|нагрузк\\S*)|снизил\\S*|урезал\\S*|смягчил\\S*|only (a )?walk|just (a )?walk|lighter|easier|easy|rest|take it easy|reduced|cut back|toned down');
const PLANW = P('план\\S*|трен\\S*|нагрузк\\S*|сегодня|совет\\S*|рекомендац\\S*|plan\\S*|workout\\S*|training|today|advice|recommendation\\S*');
const LITTLE = P('мало данных|недостаточно данных|не хватает данных|данных (мало|недостаточно|не хватает)|почему (ты )?не (оцениваешь|считаешь|показываешь|можешь оценить)|нет (оценки )?(готовности|восстановления)|готовность не (показывается|считается|определена)|not enough data|too little data|no readiness|why (no|can\'t you (assess|rate)) (readiness|recovery)');

const st = (...names) => (e) => names.includes(stateOf(e));
const okOnly = (n) => !REFUSE.test(n.norm) && !ILLNESS.test(n.norm) && !n.gibberish;

export const RECOVERY_SC = [
  SC({ ...g, id: 'rec_little_data',
    match: (n) => okOnly(n) && LITTLE.test(n.norm) && /готовн|восстановл|readiness|recovery/.test(n.norm) && only(n, 'sleep', 'train', 'heart', 'stress'),
    positives: ['Почему нет оценки готовности?', 'мало данных для восстановления', 'почему ты не оцениваешь готовность', 'not enough data for readiness', 'готовность не считается'],
    negatives: ['Как улучшить сон?', 'нет данных', 'мало времени на тренировку', 'какая у меня готовность сегодня'],
    variants: [
      V('rec_little_1', ['Для оценки готовности нужны минимум два показателя из трёх: сон, HRV и ночной пульс. Сейчас их не хватает.', 'Пока ориентируйся на самочувствие; недостающее можно добавить с часов или вручную (сон, пульс покоя).'], ['Readiness needs at least two of three signals: sleep, HRV and night heart rate. Right now there are too few.', 'For now go by how you feel; the missing data can come from a watch or be entered manually (sleep, resting heart rate).'], { humorOk: false, when: st('unknown') }),
      V('rec_little_2', ['Сейчас готовность считается: {readiness}. Данных хватило.', 'Если часть показателей не придёт, оценка считается по тем, что есть.'], ['Readiness is calculated now: {readiness}. There was enough data.', 'If some signals do not arrive, the score is computed from the ones that do.'], { humorOk: false }),
      V('rec_little_3', 'Отсутствие данных не означает, что всё в порядке: просто нечего оценивать. Придумывать готовность я не буду.', 'Missing data does not mean that all is well: there is simply nothing to assess. I will not make readiness up.', { humorOk: false }),
      V('rec_little_4', 'Пока готовность не считается, совет по нагрузке осторожный: если бодр — умеренная тренировка, если вялый — прогулка.', 'While readiness cannot be calculated, load advice stays cautious: if you feel fresh, a moderate session; if sluggish, a walk.', { humorOk: false, when: st('unknown') }),
    ] }),

  SC({ ...g, id: 'rec_why_lighter',
    match: (n) => okOnly(n) && WHY.test(n.norm) && LIGHT.test(n.norm) && PLANW.test(n.norm) && !SLEEPW.test(n.norm) && !n.aboutPrev && !n.cont && !n.past,
    positives: ['Почему сегодня план такой лёгкий?', 'почему сегодня только прогулка', 'почему без тяжёлой тренировки', 'why only a walk today'],
    negatives: ['почему', 'почему ты так советуешь', 'почему оценка сна упала', 'почему шагов мало'],
    variants: [
      V('rec_lighter_1', ['Потому что восстановление сегодня не лучшее: готовность {readiness}.', 'Готовность складывается из сна, HRV, ночного пульса и нагрузки последних дней.'], ['Because recovery is not at its best today: readiness is {readiness}.', 'Readiness combines sleep, HRV, night heart rate and the load of recent days.'], { when: st('tired') }),
      V('rec_lighter_2', ['По общей оценке восстановление сегодня не лучшее, поэтому тяжёлую тренировку я не советую.', 'Какая именно часть повлияла, по общей оценке не определить.'], ['By the overall score recovery is not at its best today, so I do not suggest a hard session.', 'Which part had the effect cannot be told from the overall score.'], { humorOk: false, when: st('tired') }),
      V('rec_lighter_3', ['Причины облегчать по данным я не вижу: готовность {readiness}.', 'Если день получился легче по твоему решению или по самочувствию, это нормально.'], ['I see no reason in the data to go lighter: readiness is {readiness}.', 'If the day turned out lighter by your choice or how you feel, that is fine.'], { humorOk: false, when: st('fresh', 'normal') }),
      V('rec_lighter_4', 'Данных о восстановлении мало, поэтому совет осторожный: ориентируйся на самочувствие.', 'There is little recovery data, so the advice is cautious: go by how you feel.', { humorOk: false, when: st('unknown') }),
      V('rec_lighter_5', ['Совет строится на готовности: она учитывает сон, HRV, ночной пульс и нагрузку последних дней.', 'Это общая логика приложения, а не диагноз.'], ['The advice rests on readiness, which considers sleep, HRV, night heart rate and the load of recent days.', 'It is the app\'s general logic, not a diagnosis.'], { humorOk: false }),
    ] }),

  SC({ ...g, id: 'rec_want_rest',
    match: (n) => okOnly(n) && REST.test(n.norm) && !n.past && !WHY.test(n.norm) && only(n, 'train', 'stress', 'sleep'),
    positives: ['Хочу отдохнуть сегодня', 'можно взять выходной?', 'мне нужен день отдыха', 'can I take a rest day', 'хочу взять день отдыха'],
    negatives: ['вчера хотел отдохнуть', 'не хочу тренироваться', 'болею, хочу отдохнуть', 'отдых после сна'],
    variants: [
      V('rec_rest_1', ['Отдых — часть плана, а не пропуск плана.', 'Если хочется, сделай сегодня выходной; завтра посмотрим снова.'], ['Rest is part of the plan, not a skipped plan.', 'If you want, take today off; we will look again tomorrow.']),
      V('rec_rest_2', ['Сегодня восстановление не лучшее, так что отдых уместен.', 'Прогулка или растяжка — максимум, что стоит добавлять.'], ['Recovery is not at its best today, so rest fits.', 'A walk or stretching is the most worth adding.'], { humorOk: false, when: st('tired') }),
      V('rec_rest_3', 'Это твоё решение: данные не требуют отдыха, но и не запрещают его.', 'It is your call: the data does not require rest, but does not forbid it either.', { humorOk: false, when: st('fresh', 'normal') }),
      V('rec_rest_4', 'Данных мало, поэтому решай по самочувствию: вялость — довод в пользу отдыха или спокойной прогулки.', 'There is little data, so decide by how you feel: sluggishness is a reason for rest or an easy walk.', { humorOk: false, when: st('unknown') }),
      V('rec_rest_5', 'Можно. Отдохни и вернись к плану завтра, без «отработки».', 'You can. Rest and return to the plan tomorrow, with no "making up" for it.', { short: { ru: 'Можно. Вернёмся к плану завтра.', en: 'You can. Back to the plan tomorrow.' } }),
    ] }),

  SC({ ...g, id: 'rec_more_than_plan',
    match: (n) => okOnly(n) && MORE.test(n.norm) && (ACTW.test(n.norm) || /план|plan|нагрузк|load|volume|объем|push/.test(n.norm)) && !n.past && !n.nothingHard && only(n, 'train', 'stress'),
    positives: ['Хочу побольше нагрузки', 'можно добавить к плану ещё одну тренировку', 'план слишком лёгкий, хочу усилить', 'can I do more than the plan', 'I want to push harder'],
    negatives: ['Не хочу сегодня ничего сложного', 'вчера хотел добавить нагрузку', 'болею, но хочу больше нагрузки', 'сколько шагов добавить'],
    variants: [
      V('rec_more_tired_1', ['Сегодня восстановление не лучшее, поэтому добавлять не стоит.', 'Оставь план как есть или сделай его легче, а прибавим в день, когда силы вернутся.'], ['Recovery is not at its best today, so adding is not wise.', 'Keep the plan as it is or make it lighter, and we will add on a day when strength returns.'], { humorOk: false, when: st('tired') }),
      V('rec_more_tired_2', 'Не сегодня: восстановление не лучшее. Лучше спокойная прогулка или растяжка, чем прибавка к плану.', 'Not today: recovery is not at its best. A calm walk or stretching beats adding to the plan.', { humorOk: false, when: st('tired'), short: { ru: 'Не сегодня: восстановление не лучшее.', en: 'Not today: recovery is not at its best.' } }),
      V('rec_more_high', ['Нагрузка последних дней выше обычной, поэтому резко увеличивать объём не стоит.', 'Если хочется, прибавь немного к привычному, но не больше.'], ['The load of recent days is above usual, so a sharp rise in volume is not wise.', 'If you want, add a little to your usual, but no more.'], { humorOk: false, when: (e) => stateOf(e) !== 'tired' && e.s && e.s.load === 'high' }),
      V('rec_more_ok_1', ['Можно, если самочувствие хорошее. Прибавляй плавно: нагрузку повышай не больше чем на 10% в неделю.', 'Лучше добавить немного к объёму, чем всё и сразу.'], ['You can, if you feel good. Add gradually: raise the load by no more than 10% a week.', 'Better to add a little volume than everything at once.'], { when: (e) => ['fresh', 'normal'].includes(stateOf(e)) && !(e.s && e.s.load === 'high') }),
      BV('rec_more_ok_2', { main: ['Хочется большего — это нормально.', 'Wanting more is normal.'], action: ['Прибавь немного к привычному объёму и посмотри на самочувствие завтра, повышая нагрузку не больше чем на 10% в неделю.', 'Add a little to your usual volume and see how you feel tomorrow, raising the load by no more than 10% a week.'] }, { humorOk: false, when: (e) => ['fresh', 'normal'].includes(stateOf(e)) && !(e.s && e.s.load === 'high') }),
      V('rec_more_unknown', ['Данных о восстановлении мало, поэтому прибавляй осторожно.', 'Немного к привычному объёму, и ориентируйся на самочувствие.'], ['There is little recovery data, so add carefully.', 'A little to your usual volume, and go by how you feel.'], { humorOk: false, when: st('unknown') }),
    ] }),

  SC({ ...g, id: 'rec_tired',
    match: (n) => okOnly(n) && TIRED.test(n.norm) && !n.past && !WHY.test(n.norm) && !n.modalQuestion && n.want !== 'neg' && only(n, 'stress', 'train', 'sleep') && !SLEEPW.test(n.norm),
    positives: ['Я устал', 'сегодня нет сил', 'чувствую усталость', 'I am tired today', 'совсем вымотался'],
    negatives: ['Мне лень идти бегать', 'вчера очень устал', 'устал, болит спина', 'не выспался, хотя спал 8 часов'],
    variants: [
      V('rec_tired_1', ['Раз устал, и данные это подтверждают, сегодня без тяжёлой тренировки.', 'Подойдёт прогулка на 20–40 минут или растяжка, а лечь можно на 30–45 минут раньше.'], ['Since you are tired and the data agrees, skip the hard session today.', 'A 20–40 minute walk or stretching fits, and you can go to bed 30–45 minutes earlier.'], { humorOk: false, when: st('tired') }),
      BV('rec_tired_2', { reaction: ['Понимаю.', 'I get it.'], main: ['Готовность сегодня {readiness}: восстановление не лучшее.', 'Readiness is {readiness} today: recovery is not at its best.'], action: ['Вместо тяжёлого — прогулка, лёгкий велосипед, йога или растяжка на 20–30 минут.', 'Instead of something hard: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.'] }, { humorOk: false, when: st('tired') }),
      V('rec_tired_3', 'Тогда день бережный: прогулка или растяжка, без тяжёлого.', 'Then a gentle day: a walk or stretching, nothing hard.', { humorOk: false, when: st('tired') }),
      V('rec_tired_4', ['Усталость — это ощущение, и оно важно, даже если по данным всё в порядке (готовность {readiness}).', 'Выбери нагрузку по самочувствию: достаточно прогулки, а тяжёлое можно перенести.'], ['Tiredness is a sensation and it matters even if the data looks fine (readiness {readiness}).', 'Pick the load by how you feel: a walk is enough, and the hard session can wait.'], { humorOk: false, when: st('fresh', 'normal') }),
      V('rec_tired_5', ['Данные не показывают сильной просадки, но самочувствие тоже данные.', 'Облегчи день: прогулка или растяжка вместо тяжёлого.'], ['The data does not show a big drop, but how you feel is data too.', 'Make the day lighter: a walk or stretching instead of something hard.'], { humorOk: false, when: st('fresh', 'normal') }),
      V('rec_tired_6', ['Данных о восстановлении мало, поэтому ориентируйся на самочувствие.', 'Раз вялый, лучше прогулка вместо тренировки.'], ['There is little recovery data, so go by how you feel.', 'Since you are sluggish, a walk is better than a workout.'], { humorOk: false, when: st('unknown') }),
      V('rec_tired_7', ['Оценить восстановление по данным пока не могу, так что верю твоим словам: усталость — повод сделать день легче.', 'Прогулка или растяжка подойдёт.'], ['I cannot judge recovery from data yet, so I take your word: tiredness is a reason to make the day lighter.', 'A walk or stretching will do.'], { humorOk: false, when: st('unknown') }),
      V('rec_tired_8', 'Усталость стоит принимать всерьёз, но без драмы: сегодня облегчаем.', 'Tiredness deserves to be taken seriously, but without drama: we go lighter today.', { humorOk: false, short: { ru: 'Сегодня облегчаем.', en: 'We go lighter today.' } }),
    ] }),
];
