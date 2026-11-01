// Группа 6: сон. Значения только из результата приложения (прошлая ночь, личная норма, среднее за 7 дней, оценка сна).
// Оценка сна считается в lib/scores.js из длительности, глубокого сна, REM, пробуждений и регулярности; готовность — из
// восстановления (сон, HRV, ночной пульс) и нагрузки. Причинность «плохой сон → такой план» не выдумываем.
import { P } from '../nlu';
import { V, BV, SC } from './kit';
import { SLEEPW, REFUSE, only, stateOf, num } from './bkit';

const g = { group: 'sleep', topic: 'sleep' };
const NEED = P('нужно|надо|должен|должна|стоит|рекоменду\\S*|норма сна|сколько спать|need|should|recommended|how much sleep');
const SCORE = P('оценк\\S*|балл\\S*|score|рейтинг');
const CHANGED = P('измени\\S*|упал\\S*|упала|вырос\\S*|выросла|стала|стал|поменял\\S*|скакну\\S*|прыгает|скачет|почему|отчего|changed|dropped|fell|rose|went (up|down)|why|jumps?');
const HOWMUCH = P('сколько часов (я |у меня )?(спал\\S*|поспал\\S*|сплю)|сколько( я| у меня| мне)?( сегодня| прошлой ночью| этой ночью| ночью| вчера)? (спал\\S*|поспал\\S*|сплю)|сколько (часов )?(длился|продолжался) (мой )?сон|как (я )?(спал\\S*|поспал\\S*)( сегодня| ночью| прошлой ночью)?|сколько (у меня )?(было )?сна|how (long|much) did i sleep|how did i sleep|hours of sleep (did i get|last night)|how many hours did i sleep');
const SHOW = P('что (показыва\\S*|говорят|за данные|там|видно|у меня)( данные| цифры)?( по| о| про)? (сну|сне|сна|сон)|что (показыва\\S*|говорят) (данные|цифры|приложение)|данные (по|о) (сну|сне|сна)|покажи\\S* (мой |мои |данные )?(сон|сна|сну)|расскажи\\S* (про|о|по) (мой )?(сон|сна|сну)|my sleep (data|numbers|summary)|sleep (data|summary|numbers)|what (does|do|is) .*(show|say) .*sleep|show me (my )?sleep');
const MISSING = P('нет (записи |данных |информации )?(о |по |про )?(сне|сна|сон)|нет сна|не (показыва\\S*|отобража\\S*|записал\\S*|записыва\\S*|вижу|видно|появил\\S*|появля\\S*|пришел|пришли|отображается)|пропал\\S*|пусто|пустой|где|missing|not (showing|recorded|there|tracked|syncing)|no sleep|where is|disappeared');
const FEEL = P('не выспал\\S*|разбит\\S*|не отдохнул\\S*|сонн\\S*|вял\\S*|хотя (по данным|приложение|часы|спал|спала|сон)|не совпада\\S*|(does not|doesn\'t|not) match|а (чувствую|ощущения|по ощущениям)|не соответствует|but i feel|do not feel rested|don\'t feel rested|not rested|doesn\'t match how i feel|tired despite|still tired|slept (enough|well) but');
const LINK = P('влия\\S*|связ\\S*|зависит\\S*|из[ -]за (сна|того что (плохо )?спал\\S*)|учитыва\\S*|поэтому|affect\\S*|because of (my )?sleep|linked|depend\\S*|connected');
const PLANW = P('план\\S*|тренировк\\S*|нагрузк\\S*|день|сегодня|рекомендаци\\S*|plan\\S*|workout\\S*|training|today|recommendation\\S*');

const OVER = P('как (?:у меня |мой |моя |там )?(?:мой )?(?:со?н|со сном|сна)|как (?:у меня )?дела со сном|что (?:там )?(?:по|со|с) (?:сну|сном|сне)|а что (?:по|со|с) (?:сну|сном)|как (?:там )?(?:сон|со сном)|вернемся (?:ко|к) (?:сну|сон\\S*)|давай (?:про|о|по|к) (?:сон|сну|сне)|(?:а )?теперь (?:про|о) (?:сон|сне)|про сон|о сне|насчет сна|как (?:мой )?сон|how(?:\'s| is| was) (?:my )?sleep|what about (?:my )?sleep|back to sleep|how did i sleep|(?:my )?sleep\\?');
const IMPROVE = P('улучш\\S*|лучше спать|как спать|советы?|совет по сну|better|improve|tips?|advice|нормализ\\S*|наладить|исправить');
const has = (e) => num(e.s && e.s.sleepH);
const short = (e) => has(e) && num(e.s.sleepNorm) && e.s.sleepH < e.s.sleepNorm;
const full = (e) => has(e) && num(e.s.sleepNorm) && e.s.sleepH >= e.s.sleepNorm;
const sleepy = (n) => SLEEPW.test(n.norm) && only(n, 'sleep', 'stress') && !REFUSE.test(n.norm);

export const SLEEP_SC = [
  SC({ ...g, id: 'sleep_score_why',
    match: (n) => sleepy(n) && SCORE.test(n.norm) && CHANGED.test(n.norm) && !n.past,
    positives: ['Почему оценка сна изменилась?', 'оценка сна упала', 'почему балл сна стал ниже', 'why did my sleep score change', 'оценка сна скачет'],
    negatives: ['Как улучшить сон?', 'почему я плохо сплю', 'оценка тренировки изменилась', 'сколько я спал'],
    variants: [
      V('sleep_score_1', ['Оценка сна пересчитывается каждую ночь заново: в неё входят длительность, глубокий сон, REM, пробуждения и регулярность.', 'Прежней оценки в моих данных нет, поэтому главный фактор изменения назвать не могу.'], ['The sleep score is recalculated every night: it includes duration, deep sleep, REM, awakenings and regularity.', 'My data has no earlier score, so I cannot name the main factor behind the change.']),
      V('sleep_score_2', 'Из-за чего именно изменилась оценка, по одному числу не определить. Больше всего весит длительность сна, затем регулярность, глубокий и REM-сон и пробуждения.', 'One number cannot show exactly why the score changed. Duration weighs most, then regularity, deep and REM sleep, and awakenings.'),
      V('sleep_score_3', 'Оценка сейчас {sleepScore}, ночь — {sleepH}. Длительность — самая весомая часть оценки, но не единственная.', 'The score is {sleepScore} now and the night was {sleepH}. Duration is the heaviest part of the score, but not the only one.'),
      V('sleep_score_4', 'Если часть данных (фазы сна или регулярность) не пришла, оценка считается по тому, что есть, и может отличаться от прошлых ночей. Это следствие неполных данных, а не твоих «плохих» ночей.', 'If part of the data (sleep stages or regularity) did not arrive, the score is computed from what exists and may differ from earlier nights. That follows from incomplete data, not from your "bad" nights.', { humorOk: false }),
      V('sleep_score_5', 'Оценки сна сейчас нет: данных о ночи не хватает. Нет оценки — значит, не из чего считать, а не «плохо».', 'There is no sleep score now: not enough data about the night. No score means nothing to calculate from, not "bad".', { humorOk: false, when: (e) => !num(e.s && e.s.sleepScore) }),
    ] }),

  SC({ ...g, id: 'sleep_feel_mismatch',
    match: (n) => (SLEEPW.test(n.norm) || /выспа|отдохн|rested|tired/.test(n.norm)) && FEEL.test(n.norm) && only(n, 'sleep', 'stress') && !REFUSE.test(n.norm) && !n.want,
    positives: ['Приложение показывает 8 часов, а я не выспался', 'данные сна не совпадают с ощущениями', 'сплю нормально, а чувствую себя разбитым', 'sleep data does not match how I feel', 'I slept enough but still tired'],
    negatives: ['Как улучшить сон?', 'сколько я спал', 'не хочу спать', 'я устал после работы'],
    variants: [
      V('sleep_feel_1', ['Цифры и самочувствие не обязаны совпадать: приложение видит длительность и данные источника, а отдых зависит от многого.', 'Для решения о нагрузке сегодня ориентируйся на самочувствие.'], ['Numbers and how you feel do not have to match: the app sees duration and source data, while rest depends on a lot.', 'For today\'s load, go by how you feel.'], { humorOk: false }),
      BV('sleep_feel_2', { main: ['Приложение показывает {sleepH}, а ощущения другие — такое бывает.', 'The app shows {sleepH}, but you feel differently, which happens.'], explain: ['Сон определяется источником (часы или телефон) по косвенным признакам, так что неточность возможна.', 'Sleep is detected by the source (watch or phone) from indirect signs, so inaccuracy is possible.'], action: ['Если сегодня вяло, выбери нагрузку полегче.', 'If you feel sluggish today, choose a lighter load.'] }, { humorOk: false }),
      V('sleep_feel_3', 'Данных о ночи нет, поэтому сравнивать мне не с чем. Ощущения важны и сами по себе: если вяло, день можно сделать полегче.', 'There is no data about the night, so I have nothing to compare with. How you feel matters on its own: if you are sluggish, the day can be lighter.', { humorOk: false, when: (e) => !has(e) }),
      V('sleep_feel_4', 'Самочувствие — тоже данные. Если тяжело, облегчи день, а цифры оставим как справку.', 'How you feel is data too. If it is hard, make the day lighter and keep the numbers as a reference.', { humorOk: false }),
      V('sleep_feel_5', 'Прошлой ночью {sleepH} при твоей норме {sleepNorm}. Если по ощущениям иначе, это нормально: норма — статистика, а не гарантия бодрости.', 'Last night was {sleepH} against your norm of {sleepNorm}. If it feels different, that is fine: a norm is a statistic, not a guarantee of energy.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'sleep_plan_link',
    match: (n) => SLEEPW.test(n.norm) && only(n, 'sleep', 'stress', 'train') && !REFUSE.test(n.norm) && LINK.test(n.norm) && PLANW.test(n.norm) && !SCORE.test(n.norm) && !n.past && !/улучш|improve|better/.test(n.norm),
    positives: ['Как сон влияет на мой план?', 'из-за сна план сегодня легче?', 'зависит ли план от сна', 'does my plan depend on sleep', 'связан ли сон с тренировкой сегодня'],
    negatives: ['Как улучшить сон?', 'сколько я спал', 'как сон влияет на вес', 'план на сегодня'],
    variants: [
      V('sleep_plan_1', 'Сон входит в оценку восстановления вместе с HRV и ночным пульсом, а готовность учитывает ещё нагрузку последних дней. План опирается на всю готовность, а не на сон одной ночи.', 'Sleep is part of the recovery score together with HRV and night heart rate, and readiness also considers recent load. The plan rests on overall readiness, not on one night of sleep.'),
      BV('sleep_plan_2', { main: ['Готовность сегодня — {readiness}.', 'Readiness today is {readiness}.'], explain: ['Она складывается из восстановления (сон, HRV, ночной пульс) и нагрузки последних дней.', 'It combines recovery (sleep, HRV, night heart rate) and recent load.'], action: ['Поэтому причину плана по одному сну называть нельзя.', 'So the reason for the plan cannot be named from sleep alone.'] }, { alwaysExplain: true }),
      V('sleep_plan_3', 'Короткая ночь сама по себе план не отменяет, и длинная его не усиливает: смотрим на общую картину и на самочувствие. Прямую причинную связь между сном и планом я не выдумываю.', 'A short night does not cancel the plan by itself, and a long one does not strengthen it: we look at the overall picture and how you feel. I do not invent a direct cause between sleep and the plan.', { humorOk: false }),
      V('sleep_plan_4', 'Сегодня план облегчён: восстановление не лучшее. Сон — одна из частей этой оценки, но не обязательно главная. Что именно сыграло роль, по общей оценке не определить.', 'Today\'s plan is lighter because recovery is not at its best. Sleep is one part of that score, though not necessarily the main one. Which part mattered cannot be told from the overall score.', { when: (e) => stateOf(e) === 'tired' }),
      V('sleep_plan_5', 'По общей оценке сегодня сон не заставляет менять план. Это вывод по данным, а не по самочувствию: если тяжело, облегчи.', 'By the overall score, sleep does not force a change of plan today. That is a conclusion from data, not from how you feel: if it is hard, go lighter.', { humorOk: false, when: (e) => ['fresh', 'normal'].includes(stateOf(e)) }),
      V('sleep_plan_6', 'Данных для оценки готовности мало, поэтому прямой связи сна с планом я не вижу и придумывать её не буду. Ориентируйся на самочувствие.', 'There is too little data to estimate readiness, so I see no direct link between sleep and the plan and will not invent one. Go by how you feel.', { humorOk: false, when: (e) => stateOf(e) === 'unknown' }),
    ] }),

  SC({ ...g, id: 'sleep_missing',
    match: (n) => sleepy(n) && MISSING.test(n.norm) && !SCORE.test(n.norm) && !FEEL.test(n.norm) && !HOWMUCH.test(n.norm) && !NEED.test(n.norm) && !n.past && !n.dataLimit,
    positives: ['Почему не показывает сон?', 'сон не записался', 'где мой сон', 'my sleep is missing', 'часы не записали сон'],
    negatives: ['Как улучшить сон?', 'нет сил после сна', 'сколько я спал', 'нет данных'],
    variants: [
      V('sleep_missing_1', 'Сна за последнюю ночь в данных нет. Чаще всего дело в источнике: часы не записали ночь или не синхронизировались; точнее не скажу. Время сна можно добавить вручную.', 'There is no sleep for last night in the data. Usually it is the source: the watch did not record the night or did not sync; I cannot say more precisely. Sleep time can be added manually.', { humorOk: false, when: (e) => !has(e) }),
      V('sleep_missing_2', 'Записи о сне нет, поэтому оценку не считаю и не выдумываю. Проверь разрешения Health Connect и синхронизацию часов.', 'There is no sleep record, so I neither calculate nor invent a score. Check Health Connect permissions and watch sync.', { humorOk: false, when: (e) => !has(e) }),
      V('sleep_missing_3', 'Прошлую ночь я вижу: {sleepH}. Если ты ждёшь другую ночь или другую цифру, уточни, какую именно.', 'I do see last night: {sleepH}. If you expect a different night or number, tell me which one.', { humorOk: false }),
      V('sleep_missing_4', 'Данные о сне есть: {sleepH}. Если у тебя другое значение, возможно, не обновился другой источник; причину назвать не могу.', 'There is sleep data: {sleepH}. If you see another value, a different source may not have updated; I cannot name the cause.', { humorOk: false }),
    ] }),

  SC({ ...g, id: 'sleep_data_show',
    match: (n) => sleepy(n) && SHOW.test(n.norm) && !SCORE.test(n.norm) && !HOWMUCH.test(n.norm) && !n.past,
    positives: ['Что показывают данные по сну?', 'покажи мой сон', 'расскажи про мой сон', 'show me my sleep data', 'что говорят данные сна'],
    negatives: ['Как улучшить сон?', 'почему оценка сна упала', 'не хочу видеть данные сна', 'сколько спать нужно'],
    variants: [
      BV('sleep_data_1', { main: ['Последняя ночь — {sleepH}, обычная норма — {sleepNorm}.', 'Last night was {sleepH}; your usual norm is {sleepNorm}.'], extra: ['Среднее за 7 дней — {sleep7}.', 'The 7-day average is {sleep7}.', ['sleep7']] }),
      BV('sleep_data_2', { main: ['Оценка сна за последнюю ночь — {sleepScore}.', 'Last night\'s sleep score is {sleepScore}.'], extra: ['Спал ты {sleepH}.', 'You slept {sleepH}.', ['sleepH']], explain: ['Оценка собирается из длительности, глубокого сна, REM, пробуждений и регулярности; если части данных нет, считается по остальным.', 'The score combines duration, deep sleep, REM, awakenings and regularity; if some data is missing, it is computed from the rest.'] }),
      V('sleep_data_3', ['Из данных у меня: последняя ночь {sleepH}, среднее за 7 дней {sleep7}.', 'Разбор по фазам я не пересказываю, только общие цифры.'], ['From the data I have: last night {sleepH}, 7-day average {sleep7}.', 'I do not retell the stages, only the overall numbers.']),
      V('sleep_data_4', 'Показать нечего: за последнюю ночь данных о сне нет. Это не значит, что ты не спал, просто записи нет. Проверь синхронизацию или добавь время сна вручную.', 'Nothing to show: there is no sleep data for last night. That does not mean you did not sleep, there is just no record. Check sync or add sleep time manually.', { humorOk: false, when: (e) => !has(e) }),
      V('sleep_data_5', 'Ночь: {sleepH}. Норма: {sleepNorm}.', 'Night: {sleepH}. Norm: {sleepNorm}.'),
    ] }),

  // Короткий вопрос о сне («что по сну?», «вернёмся ко сну», «как мой сон?») — обзор: цифры ночи и один-два совета; формулировки чередуются.
  SC({ ...g, id: 'sleep_overview', recommends: 'sleep',
    match: (n) => !n.past && !n.cont && !n.userData.sleep && SLEEPW.test(n.norm) && only(n, 'sleep') && !REFUSE.test(n.norm) && !IMPROVE.test(n.norm) && !NEED.test(n.norm)
      && n.tokens.length <= 6 && (OVER.test(n.norm) || (n.tokens.length <= 2 && !/спал/.test(n.norm))),
    positives: ['Что по сну?', 'Как мой сон?', 'вернёмся ко сну', 'а что по сну', 'сон', 'how is my sleep', 'what about my sleep'],
    negatives: ['Как улучшить сон?', 'сколько нужно спать', 'не хочу знать про сон', 'почему оценка сна упала', 'вчера плохо спал'],
    continuations: { why: 'объяснение по ночи', simpler: 'один шаг', other: 'другой акцент' },
    variants: [
      BV('sleep_over_1', { main: ['Прошлой ночью — {sleepH}, твоя обычная норма — {sleepNorm}.', 'Last night — {sleepH}, your usual norm is {sleepNorm}.'], action: ['{sleepTips}', '{sleepTips}'] }, { when: (e) => has(e) && num(e.s.sleepNorm) }),
      BV('sleep_over_2', { main: ['Сон за последнюю ночь: {sleepH}.', 'Sleep last night: {sleepH}.'], action: ['Среднее за 7 дней — {sleep7}.', 'The 7-day average is {sleep7}.', ['sleep7']], extra: ['{sleepTips}', '{sleepTips}'] }, { when: has }),
      BV('sleep_over_3', { main: ['Оценка сна {sleepScore}, ночь — {sleepH}.', 'Sleep score {sleepScore}, the night was {sleepH}.'], action: ['{sleepTips}', '{sleepTips}'] }, { needs: ['sleepScore'], when: has }),
      BV('sleep_over_4', { main: ['Ночь короче обычного: {sleepH} при норме {sleepNorm}.', 'The night was shorter than usual: {sleepH} against a norm of {sleepNorm}.'], action: ['Сегодня можно лечь на 30–45 минут раньше.', 'Tonight you can go to bed 30–45 minutes earlier.'], extra: ['{sleepTips}', '{sleepTips}'] }, { when: short }),
      BV('sleep_over_5', { main: ['Ночь в пределах нормы: {sleepH} при норме {sleepNorm}.', 'The night was within your norm: {sleepH} against {sleepNorm}.'], action: ['{sleepTips}', '{sleepTips}'] }, { when: full }),
      BV('sleep_over_6', { main: ['Ночь — {sleepH}.', 'The night was {sleepH}.'], action: ['Если выбирать, на что обратить внимание, то вот что. {sleepTips}', 'If you pick what to look at, here it is. {sleepTips}'] }, { when: has }),
      BV('sleep_over_7', { main: ['Данных о сне пока нет — запиши время сна вручную, и я смогу подсказывать точнее.', 'There is no sleep data yet. Log your sleep manually and I can be more specific.'], action: ['{sleepTips}', '{sleepTips}'] }, { when: (e) => !has(e) }),
      BV('sleep_over_8', { main: ['Записи о ночи нет, поэтому оценку не делаю и не придумываю.', 'There is no record of the night, so I neither estimate nor invent.'], action: ['Сон можно внести вручную. А пока: {sleepTips}', 'Sleep can be entered manually. Meanwhile: {sleepTips}'] }, { when: (e) => !has(e) }),
    ] }),

  // «Как улучшить сон?»: советы чередуются (те же факты, разные акценты)
  SC({ ...g, id: 'sleep_improve', recommends: 'sleep',
    match: (n) => !n.past && !n.cont && !n.userData.sleep && SLEEPW.test(n.norm) && only(n, 'sleep') && !REFUSE.test(n.norm) && IMPROVE.test(n.norm) && !NEED.test(n.norm) && n.want !== 'neg' && n.tokens.length <= 7,
    positives: ['Как улучшить сон?', 'советы по сну', 'how to improve my sleep'],
    negatives: ['Как мой сон?', 'сколько нужно спать', 'не хочу улучшать сон', 'вчера улучшил сон'],
    continuations: { why: 'объяснение по ночи', simpler: 'один шаг', other: 'другой акцент' },
    variants: [
      BV('sleep_improve_1', { main: ['Для начала цифры: ночь — {sleepH}, норма — {sleepNorm}.', 'First the numbers: the night was {sleepH}, the norm is {sleepNorm}.'], action: ['{sleepTips}', '{sleepTips}'] }, { when: (e) => has(e) && num(e.s.sleepNorm) }),
      BV('sleep_improve_2', { main: ['Сон улучшают по одному рычагу за раз.', 'Sleep improves one lever at a time.'], action: ['{sleepTips}', '{sleepTips}'] }),
      BV('sleep_improve_3', { main: ['{sleepTips}', '{sleepTips}'], extra: ['Начни с одного пункта, остальное потом.', 'Start with one item and leave the rest for later.'] }),
      BV('sleep_improve_4', { main: ['Режим сна строится вокруг подъёма и света.', 'Sleep routine is built around waking time and light.'], action: ['{sleepTips}', '{sleepTips}'] }),
      BV('sleep_improve_5', { main: ['Ночь — {sleepH}.', 'The night was {sleepH}.'], action: ['Чтобы стало лучше: {sleepTips}', 'To make it better: {sleepTips}'] }, { when: has }),
      BV('sleep_improve_6', { main: ['Данных о ночи нет, но общие советы работают и без них.', 'There is no data about the night, but general tips work without it.'], action: ['{sleepTips}', '{sleepTips}'] }, { when: (e) => !has(e) }),
    ] }),

  SC({ ...g, id: 'sleep_last_night',
    match: (n) => HOWMUCH.test(n.norm) && only(n, 'sleep') && !NEED.test(n.norm) && !REFUSE.test(n.norm) && !n.userData.sleep && !n.aboutPrev,
    positives: ['Сколько я спал?', 'сколько спал сегодня ночью', 'как я спал', 'how long did I sleep', 'сколько часов я поспал'],
    negatives: ['Сколько нужно спать?', 'не хочу знать сколько я спал', 'я спал 5 часов', 'сколько шагов сегодня', 'как улучшить сон'],
    variants: [
      BV('sleep_last_1', { main: ['Прошлой ночью — {sleepH}.', 'Last night: {sleepH}.'], extra: ['Твоя обычная норма — {sleepNorm}.', 'Your usual norm is {sleepNorm}.', ['sleepNorm']], explain: ['Норма личная: это медиана твоих ночей за последние 30 дней, а не общая цифра.', 'The norm is personal: the median of your nights over the last 30 days, not a general figure.'] }),
      V('sleep_last_2', 'По данным за последнюю ночь ты спал {sleepH}. Это длительность сна, а не отдыха: как ты себя чувствуешь, цифра не знает.', 'By last night\'s data you slept {sleepH}. That is the length of sleep, not of rest: the number does not know how you feel.'),
      V('sleep_last_3', 'Последняя ночь — {sleepH}, а среднее за 7 дней — {sleep7}. Периоды разные, и одну ночь не стоит принимать за картину недели.', 'Last night was {sleepH} and the 7-day average is {sleep7}. The periods differ, and one night should not be taken for the picture of the week.'),
      V('sleep_last_4', 'Прошлой ночью {sleepH} при твоей норме {sleepNorm}. Это меньше обычного. Сегодня можно лечь на 30–45 минут раньше.', 'Last night was {sleepH} against your norm of {sleepNorm}. That is less than usual. Tonight you can go to bed 30–45 minutes earlier.', { when: short }),
      V('sleep_last_5', 'Прошлой ночью {sleepH}, твоя норма — {sleepNorm}. Не меньше обычного.', 'Last night was {sleepH}; your norm is {sleepNorm}. Not less than usual.', { when: full, short: { ru: '{sleepH}, не меньше нормы.', en: '{sleepH}, not below your norm.' } }),
      V('sleep_last_6', 'Данных о сне за последнюю ночь нет: либо не выданы разрешения, либо часы не записали сон. Это не значит, что ты не спал, — просто записи нет. Время сна можно внести вручную.', 'There is no sleep data for last night: either permissions are not granted or the watch did not record sleep. That does not mean you did not sleep, there is just no record. Sleep time can be entered manually.', { humorOk: false, when: (e) => !has(e) }),
    ] }),
];
