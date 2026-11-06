// «Мозг» офлайн-коуча: работает целиком на телефоне. Читает уже посчитанные данные
// (оценки, средние за 7 и 30 дней, личные нормы), профиль и время суток, находит самое
// важное на сегодня и составляет ответ из встроенной базы знаний (lib/knowledge.js).
// Отвечает на вопросы: по кнопкам-темам или по словам в свободном вопросе.
// Формулировки меняются день ото дня, но в течение дня ответ один и тот же.
import { RU } from './i18n';
import { fmt } from './format';
import { hoursMin } from './time';
import { FACTS } from './knowledge';
import { cycleToday } from './cycle';
import { phaseName, dayLabel, range } from './cycleText';
import { detect } from './humor/context';
import { selectHumor, hash } from './humor/select';
import { normalizeMode } from './humor/config';
import { stepGoal } from './goals';
import { analyzeText, deathCheck } from './coach/nlu';
import { repairText } from './coach/match';
import { deserialize, advance } from './coach/memory';
import { respond, RECOMMEND_TOPICS } from './coach/engine';
import { sanitize } from './coach/assemble';

const SOFT_HOLD_TURNS = 3;
const t = (ru, en) => (RU ? ru : en);
const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;
const val = (m, k, w) => (m && m[k] && live(m[k][w]) ? m[k][w].value : null);

// Погода за окном (если включена в профиле) — для советов про прогулки и тренировки.
let WEATHER = null;
const WEATHER_TTL = 30 * 60000; // как в lib/weather.js
export const setCoachWeather = (w) => { WEATHER = w; };

function weatherLine() {
  const w = WEATHER;
  if (!w) return null;
  if (w.stale === true || (typeof w.at === 'number' && Date.now() - w.at > WEATHER_TTL)) return null; // устаревшую погоду не выдаём за текущую
  const deg = (w.temp > 0 ? '+' : '') + w.temp + '°';
  if (w.kind === 'rain' || w.kind === 'storm') return t('За окном дождь — прогулку можно заменить лестницей или тренировкой дома.', 'It is raining — swap the walk for stairs or a home workout.');
  if (w.kind === 'snow') return t('Идёт снег — одевайся слоями и осторожнее на скользком.', 'It is snowing — dress in layers and watch out for ice.');
  if (w.temp >= 28) return t(`Жарко (${deg}) — пей больше воды, тренировку лучше утром или вечером.`, `It is hot (${deg}) — drink more water and train in the morning or evening.`);
  if (w.temp <= -10) return t(`Мороз ${deg} — разминку сделай дома, на улице дыши носом.`, `Freezing ${deg} — warm up indoors and breathe through your nose outside.`);
  if (w.kind === 'clear' && w.day && w.temp >= 8 && w.temp <= 26) return t(`На улице ясно, ${deg} — отличный день для прогулки.`, `Clear and ${deg} outside — a great day for a walk.`);
  return null;
}

// Детерминированный выбор варианта: один и тот же в течение дня.
function daySeed(extra = 0) {
  const d = new Date();
  return d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate() + extra;
}
const pick = (list, salt = 0) => list[daySeed(salt) % list.length];

// Всё, что коуч знает о человеке сегодня.
export function analyze(result, profile) {
  const p = profile || {};
  const sc = (result && result.scores) || {};
  const m = (result && result.metrics) || null;
  const ok = (x) => x && x.status === 'ok';
  const s = {
    has: !!(result && (ok(sc.sleep) || ok(sc.activity) || ok(sc.readiness) || val(m, 'steps', 7) != null)),
    hour: new Date().getHours(),
    weekday: new Date().getDay(),
    goal: p.goal || null,
    exp: p.experience || null,
    stress: p.lifestyle ? p.lifestyle.stress : null,
    smoking: p.lifestyle ? p.lifestyle.smoking : null,
    age: result ? result.chrono : null,
    bio: result ? result.bio : null,
    pace: result ? result.pace : null,
    readiness: ok(sc.readiness) ? sc.readiness.score : null,
    recovery: ok(sc.recovery) ? sc.recovery.score : null,
    hrvDev: sc.recovery ? sc.recovery.hrvDev : null,
    nightHrDiff: sc.recovery ? sc.recovery.nightHrDiff : null,
    sleepH: ok(sc.sleep) ? sc.sleep.hours : null,
    sleepNorm: ok(sc.sleep) ? sc.sleep.norm : null,
    sleepScore: ok(sc.sleep) ? sc.sleep.score : null,
    sleep7: val(m, 'sleepDuration', 7),
    sri: m && m.sleepRegularity && m.sleepRegularity[14].status === 'ok' ? m.sleepRegularity[14].value : null,
    load: sc.load ? sc.load.level : null,
    steps7: val(m, 'steps', 7),
    steps30: val(m, 'steps', 30),
    active7: val(m, 'activeMinutes', 7),
    vigorous7: m && m.activeMinutes && live(m.activeMinutes[7]) ? m.activeMinutes[7].vigorous : null,
    workouts7: m && m.exercise && m.exercise[7].status === 'ok' ? m.exercise[7].value : null,
    workouts30: m && m.exercise && m.exercise[30].status === 'ok' ? m.exercise[30].value : null,
    rhr7: val(m, 'restingHr', 7),
    rhr30: val(m, 'restingHr', 30),
    hrv7: val(m, 'hrv', 7),
    hrvBase: m && m.hrvBaseline && m.hrvBaseline.value != null ? m.hrvBaseline.value : null,
    vo2: m && live(m.vo2max) ? m.vo2max.value : null,
  };
  // Цикл (только у женщин): день, фаза, прогноз.
  s.female = p.sex === 'f' && !!p.showCycle; // советы по циклу — только если он включён в профиле
  s.cycle = s.female && result && result.cycle ? cycleToday(result.cycle) : null;
  s.cycleBase = s.female && result ? result.cycle : null;
  s.phase = s.cycle ? s.cycle.phase : null;
  s.delta = s.bio != null && s.age != null ? s.bio - s.age : null;
  s.stepsTrend = s.steps7 != null && s.steps30 ? (s.steps7 - s.steps30) / s.steps30 : null;
  s.sleepDebt = s.sleep7 != null ? Math.max(0, 7 - s.sleep7) * 7 : null;
  s.stepGoal = stepGoal(s.age);
  // Главное состояние дня — от него зависит тон всех ответов.
  s.state = s.readiness == null ? 'unknown'
    : s.readiness < 40 || (s.hrvDev != null && s.hrvDev < -15) || (s.nightHrDiff != null && s.nightHrDiff > 5) ? 'tired'
      : s.readiness >= 70 && s.load !== 'high' ? 'fresh' : 'normal';
  // Во второй половине цикла пульс выше, а HRV ниже — это норма. Если «усталость» видна
  // только по ним (сон в порядке, нагрузка обычная), не считаем день тяжёлым.
  s.cycleSoftened = false;
  if (s.state === 'tired' && (s.phase === 'luteal' || s.phase === 'late') && s.readiness >= 40 && s.load !== 'high'
    && !(s.sleepH != null && s.sleepNorm != null && s.sleepH < s.sleepNorm - 0.5)) {
    s.state = 'normal';
    s.cycleSoftened = true;
  }
  return s;
}

const hmParts = (h) => { const m = Math.round(h * 60); return [Math.floor(m / 60), String(m % 60).padStart(2, '0')]; };
const hmRu = (h) => { const [a, b] = hmParts(h); return a + ' ч ' + b + ' мин'; };
const hmEn = (h) => { const [a, b] = hmParts(h); return a + ' h ' + b + ' min'; };

function greet(s) {
  return s.hour < 5 ? t('Доброй ночи.', 'Good night.') : s.hour < 12 ? t('Доброе утро!', 'Good morning!')
    : s.hour < 18 ? t('Добрый день!', 'Good afternoon!') : t('Добрый вечер!', 'Good evening!');
}

// Знакомство: одно короткое предложение (Хирон — мудрый кентавр, наставник героев и целитель).
export const intro = () => t('Я Хирон — наставник героев и целитель из мифов; Epimely от греч. epimeleia — «забота о себе».',
  "I'm Chiron, the mentor of heroes and healer of myth; Epimely comes from the Greek epimeleia, \"care of the self\".");

// Темы, по которым коуч умеет отвечать.
export const TOPICS = [
  { id: 'today', label: () => t('Что мне делать сегодня?', 'What should I do today?') },
  { id: 'train', label: () => t('Тренироваться сегодня?', 'Should I train today?') },
  { id: 'sleep', label: () => t('Как улучшить сон?', 'How do I sleep better?') },
  { id: 'heart', label: () => t('Что с пульсом и HRV?', 'What about heart rate and HRV?') },
  { id: 'move', label: () => t('Сколько мне двигаться?', 'How much should I move?') },
  { id: 'age', label: () => t('Как снизить возраст тела?', 'How do I lower my body age?') },
  { id: 'stress', label: () => t('Как снять стресс?', 'How do I reduce stress?') },
  { id: 'weight', label: () => t('Как снизить вес?', 'How do I lose weight?') },
  { id: 'cycle', label: () => t('Что с моим циклом?', "What's up with my cycle?"), female: true },
];
// Темы для человека: про цикл — только у женщин.
export const topicsFor = (profile) => TOPICS.filter((x) => !x.female || (profile && profile.sex === 'f' && profile.showCycle));
const label = (id) => (TOPICS.find((x) => x.id === id) || TOPICS[0]).label();

// Свободный вопрос → тема по ключевым словам (русские и английские корни).
const KEYWORDS = [
  ['sleep', ['сон', 'сна', 'сну', 'сне', 'спал', 'поспал', 'спат', 'сплю', 'засып', 'бессон', 'просып', 'ночь', 'sleep', 'insomn', 'nap', 'bed']],
  ['train', ['трен', 'зал', 'бег', 'бежат', 'качат', 'нагруз', 'интервал', 'спорт', 'train', 'workout', 'run', 'gym', 'exercise']],
  ['heart', ['пульс', 'серд', 'hrv', 'вариаб', 'давлен', 'heart', 'pulse', 'pressure']],
  ['move', ['шаг', 'ходь', 'гуля', 'движ', 'актив', 'сид', 'step', 'walk', 'move', 'activ', 'sit']],
  ['age', ['возраст', 'стар', 'молод', 'долг', 'age', 'old', 'young', 'longev']],
  ['stress', ['стресс', 'нерв', 'тревог', 'устал', 'выгор', 'дыхан', 'stress', 'anxi', 'tired', 'burn', 'breath']],
  ['weight', ['вес', 'худ', 'жир', 'похуд', 'калор', 'питан', 'еда', 'weight', 'fat', 'calor', 'diet', 'food']],
  ['cycle', ['цикл', 'месячн', 'менстру', 'овуляц', 'пмс', 'задерж', 'фертил', 'period', 'cycle', 'ovulat', 'pms', 'menstru', 'fertil']],
  ['today', ['сегодня', 'что делать', 'план', 'today', 'plan']],
];

export function matchTopic(text) {
  const q = String(text || '').toLowerCase().replace(/ё/g, 'е');
  let best = null;
  let bestN = 0;
  for (const [id, words] of KEYWORDS) {
    const n = words.filter((w) => q.includes(w)).length;
    if (n > bestN) { best = id; bestN = n; }
  }
  // «Как у меня дела?», «как я?» — общий вопрос о состоянии: ответ как про «сегодня»
  if (!best && /(^|[^а-я])(как (у меня )?дела|как я( себя)?( сегодня)?|как мои дела|how am i|how('s| is) it going for me)([^а-я]|$)/.test(q)) best = 'today';
  return best;
}

// Ответ: { text: [абзацы], fact: { text, source } | null, next: [темы] }.
const A = {};

A.today = (s) => {
  const out = [];
  if (s.state === 'tired') {
    out.push(pick([
      t('Сегодня организм просит бережного режима.', 'Your body is asking for an easy day.'),
      t('Сегодня лучше дать себе восстановиться.', 'Today is better spent recovering.'),
    ]) + ' ' + reasonTired(s));
    out.push(t('План: прогулка 20–40 минут или растяжка, без тяжёлых тренировок, и лечь на 30–45 минут раньше.', 'Plan: a 20–40 minute walk or stretching, no hard training, and bed 30–45 minutes earlier.'));
    return { text: out, fact: s.hrvDev != null && s.hrvDev < -15 ? FACTS.hrvBaseline : FACTS.sleepNeed, next: ['sleep', 'stress', 'heart'] };
  }
  if (s.state === 'fresh') {
    out.push(pick([
      t('Ты хорошо восстановился — отличный день, чтобы сделать что-то посложнее.', "You're well recovered — a great day for something harder."),
      t('Готовность высокая: можно смело нагружаться.', 'Readiness is high: go ahead and push.'),
    ], 1) + ' ' + t('Готовность ', 'Readiness ') + s.readiness + '/100.');
    out.push(trainPlan(s, true));
  } else if (s.state === 'normal') {
    out.push(t('Обычный рабочий день: готовность ', 'A regular day: readiness ') + s.readiness + t('/100. Подойдёт умеренная нагрузка.', '/100. Moderate effort fits.'));
    out.push(trainPlan(s, false));
  } else {
    // частичные данные: честно называем то, что есть (готовности по ним не выводим)
    const have = [];
    if (s.sleepH != null) have.push(t('сон прошлой ночью — ', 'last night\'s sleep — ') + t(hmRu(s.sleepH), hmEn(s.sleepH)));
    if (s.steps7 != null && !moveLine(s)) have.push(t('шагов в среднем за неделю — ', 'average steps this week — ') + fmt(s.steps7));
    if (have.length) out.push(t('Из данных у меня пока: ', 'From the data I have so far: ') + have.join('; ') + '.');
    out.push(t('Пока мало данных, чтобы оценить восстановление, поэтому начнём с простого: прогулка, а дальше по самочувствию.', "There's not enough data yet to judge recovery, so let's keep it simple: a walk, then go by how you feel."));
  }
  if (s.cycleSoftened) out.push(t('HRV и пульс сейчас хуже обычного, но во второй половине цикла это нормально — сон и нагрузка в порядке, так что можно двигаться по плану.', 'HRV and heart rate look worse than usual, but that is normal in the second half of the cycle — sleep and load are fine, so you can stick to the plan.'));
  const cyc = cycleLine(s, false);
  if (cyc) out.push(cyc);
  const move = moveLine(s);
  if (move) out.push(move);
  const wl = weatherLine();
  if (wl) out.push(wl);
  const sl = sleepLine(s);
  if (sl) out.push(sl);
  if (!s.has) out.push(t('Добавь сон и шаги в «Записать вручную» — и советы станут точнее.', 'Log sleep and steps in Log manually and the tips will get sharper.'));
  return { text: out, fact: s.cycle && (s.phase === 'luteal' || s.cycleSoftened) ? FACTS.cycleHeart : dailyFact(s), next: s.female ? ['cycle', 'train', 'sleep'] : ['train', 'sleep', 'move'] };
};

// Строка про цикл для ответов «сегодня» и «тренироваться?».
function cycleLine(s, forTraining) {
  const c = s.cycle;
  if (!c) return null;
  const head = phaseName(c.phase) + ', ' + t('день ', 'day ') + c.day + '. ';
  switch (c.phase) {
    case 'menstrual': return head + (forTraining
      ? t('Если самочувствие нормальное — тренируйся как обычно. При боли лучше спокойное движение: ходьба, йога, плавание.', 'If you feel fine, train as usual. With cramps, choose gentle movement: walking, yoga, swimming.')
      : t('Пей больше воды, при обильных месячных следи за питанием с железом (мясо, бобовые, зелень).', 'Drink more water; with heavy periods mind iron-rich food (meat, legumes, greens).'));
    case 'follicular': return head + t('Многие в эти дни чувствуют прилив сил — подходящее время для интенсивных и новых тренировок.', 'Many feel a boost now — a good time for intense or new workouts.');
    case 'fertile':
    case 'ovulation': return head + t('Энергии обычно достаточно. Фертильное окно по оценке: ', 'Energy is usually good. Estimated fertile window: ') + range(c.fertileFrom, c.fertileTo) + '.';
    case 'luteal': return head + (forTraining
      ? t('Пульс на тренировке может быть на несколько ударов выше, а жара переносится тяжелее — пей больше и не гонись за рекордами в последние дни перед месячными.', 'Your training heart rate may run a few beats higher and heat feels harder — drink more and skip record attempts in the last days before your period.')
      : t('Пульс покоя выше, HRV ниже — это норма для этой фазы. Месячные через ', 'Resting HR is higher and HRV lower — normal for this phase. Period in ') + c.daysToNext + t(' дн.', ' days.'));
    case 'late': return head + t('Месячные задерживаются на ', 'Your period is ') + c.late + t(' дн. — при задержке больше недели или возможной беременности сделай тест.', ' days late — if over a week late or pregnancy is possible, take a test.');
    case 'hormonal': return head + t('На гормональной контрацепции фазы сглажены — ориентируйся на самочувствие.', 'On hormonal contraception phases are flattened — go by how you feel.');
    default: return null;
  }
}

function reasonTired(s) {
  const r = [];
  if (s.sleepH != null && s.sleepNorm != null && s.sleepH < s.sleepNorm - 0.5) r.push(t('сон короче обычного (', 'shorter sleep than usual (') + hoursMin(s.sleepH) + ')');
  if (s.hrvDev != null && s.hrvDev < -10) r.push(t('HRV ниже твоей нормы на ', 'HRV ') + fmt(Math.abs(s.hrvDev)) + t('%', '% below your baseline'));
  if (s.nightHrDiff != null && s.nightHrDiff > 3) r.push(t('ночной пульс выше нормы на ', 'night HR ') + fmt(s.nightHrDiff) + t(' уд/мин', ' bpm above norm'));
  if (s.load === 'high') r.push(t('нагрузка последних дней выше обычной', 'recent load is above usual'));
  const note = s.phase === 'luteal' || s.phase === 'late' ? ' ' + t('Часть этого — обычный сдвиг второй половины цикла.', 'Part of this is the normal second-half-of-cycle shift.') : '';
  if (!r.length) return t('Готовность ', 'Readiness ') + (s.readiness != null ? s.readiness + '/100.' : t('низкая.', 'is low.')) + note;
  return t('Причины: ', 'Why: ') + r.join(', ') + '.' + note;
}

function trainPlan(s, fresh) {
  const g = s.goal;
  if (fresh) {
    if (g === 'strength') return t('Силовая с рабочими весами: 4–6 упражнений на крупные мышцы.', 'Strength session with working weights: 4–6 compound moves.');
    if (g === 'endurance') return t('Интервалы: например, 4–6 отрезков по 3 минуты в быстром темпе с отдыхом 2 минуты.', 'Intervals: e.g. 4–6 × 3 minutes hard with 2 minutes easy.');
    if (g === 'weight') return t('Длинная активная тренировка 45–60 минут: быстрая ходьба, вело или бег в комфортном темпе.', 'A long 45–60 minute session: brisk walk, bike or easy run.');
    return t('Подойдёт интервальная или силовая тренировка 30–45 минут.', 'An interval or strength session of 30–45 minutes fits.');
  }
  if (s.exp === 'new') return t('Лёгкая тренировка 20–30 минут в темпе, когда можно разговаривать.', 'An easy 20–30 minute session at a talking pace.');
  return t('Лучше спокойное кардио 30–45 минут (можно разговаривать) или техника и мобильность.', 'Best: easy cardio for 30–45 minutes (talking pace) or technique and mobility.');
}

function moveLine(s) {
  if (s.steps7 == null) return null;
  if (s.steps7 < s.stepGoal * 0.7) return t('Шагов в среднем ', 'You average ') + fmt(s.steps7) + t(' в день — добавь пару прогулок по 10–15 минут, например после еды.', ' steps a day — add a couple of 10–15 minute walks, e.g. after meals.');
  if (s.stepsTrend != null && s.stepsTrend < -0.2) return t('Шагов за неделю на ', 'Steps this week are ') + fmt(Math.abs(s.stepsTrend * 100)) + t('% меньше, чем обычно, — сегодня хорошо бы пройтись.', '% below usual — a walk today would help.');
  if (s.steps7 >= s.stepGoal) return t('С шагами всё отлично: ', 'Steps are great: ') + fmt(s.steps7) + t(' в день.', ' a day.');
  return null;
}

function sleepLine(s) {
  if (s.sleep7 != null && s.sleep7 < 7) return t('Сон за неделю — ', 'Sleep this week averages ') + hoursMin(s.sleep7) + t(' в среднем. Цель на вечер — лечь так, чтобы спать 7+ часов.', '. Tonight, aim for 7+ hours.');
  if (s.sri != null && s.sri < 70) return t('Время сна гуляет (регулярность ', 'Your sleep timing varies (regularity ') + fmt(s.sri) + t('/100) — постарайся ложиться и вставать в одно время.', '/100) — try to keep the same bed and wake times.');
  if (s.hour >= 20) return t('Вечер — время спокойных дел: приглуши свет и отложи телефон за час до сна.', 'Evening: dim the lights and put the phone away an hour before bed.');
  return null;
}

function dailyFact(s) {
  if (s.sleep7 != null && s.sleep7 < 7) return FACTS.sleepNeed;
  if (s.sri != null && s.sri < 70) return FACTS.sleepRegularity;
  if (s.steps7 != null && s.steps7 < s.stepGoal) return FACTS.steps;
  if (s.smoking === 'current') return FACTS.smoking;
  return pick([FACTS.vo2, FACTS.strength, FACTS.whoActivity, FACTS.morningLight, FACTS.habit, FACTS.walkAfterMeal, FACTS.easyHard], 7);
}

A.train = (s) => {
  const out = [];
  if (s.state === 'tired') {
    out.push(t('Сегодня — нет, лучше без тяжёлой тренировки. ', 'Not today — skip the hard session. ') + reasonTired(s));
    if (s.phase === 'menstrual') out.push(t('Идут месячные — бережный день вдвойне уместен.', 'Your period is on — an easy day makes double sense.'));
    out.push(t('Если хочется движения: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут. Завтра посмотрим снова.', 'If you want to move: a walk, easy bike, yoga or stretching for 20–30 minutes. We will check again tomorrow.'));
    return { text: out, fact: s.load === 'high' ? FACTS.loadSpike : FACTS.hrvBaseline, next: ['sleep', 'heart', 'stress'] };
  }
  if (s.state === 'unknown') {
    out.push(t('Восстановление пока не могу оценить — мало данных о сне, пульсе или HRV. Ориентируйся на самочувствие: если бодр — умеренная тренировка, если вялый — прогулка.', "I can't judge recovery yet — not enough sleep, heart rate or HRV data. Go by feel: energetic — moderate session; sluggish — a walk."));
    return { text: out, fact: FACTS.easyHard, next: ['move', 'sleep'] };
  }
  out.push((s.state === 'fresh' ? t('Да! ', 'Yes! ') : t('Да, но без рекордов. ', 'Yes, but no records. ')) + trainPlan(s, s.state === 'fresh'));
  const cyc = cycleLine(s, true);
  if (cyc) out.push(cyc);
  if (s.load === 'high') out.push(t('Нагрузка последних дней выше обычной — не увеличивай объём резко.', 'Recent load is above usual — avoid big jumps in volume.'));
  if (s.workouts7 === 0 && s.workouts30) out.push(t('На этой неделе ещё не было тренировок — даже 20 минут лучше, чем ничего.', 'No workouts yet this week — even 20 minutes beats nothing.'));
  if (s.vigorous7 != null && s.active7 && s.vigorous7 / s.active7 > 0.4) out.push(t('Много интенсивных минут — добавь больше лёгких тренировок, так форма растёт стабильнее.', 'Lots of hard minutes — add more easy sessions for steadier progress.'));
  const fact = s.cycle ? FACTS.cyclePerformance : s.goal === 'strength' ? FACTS.strength : s.goal === 'endurance' ? FACTS.easyHard : s.load === 'high' ? FACTS.loadSpike : FACTS.vo2;
  return { text: out, fact, next: ['move', 'heart', 'age'] };
};

A.sleep = (s) => {
  const out = [];
  if (s.sleepH != null) {
    out.push(t('Прошлой ночью — ', 'Last night — ') + hoursMin(s.sleepH) + (s.sleepNorm ? t(', твоя обычная норма — ', ', your usual is ') + hoursMin(s.sleepNorm) : '') + '.'
      + (s.sleepScore != null ? t(' Оценка сна ', ' Sleep score ') + s.sleepScore + '/100.' : ''));
  } else {
    out.push(t('Данных о сне пока нет — запиши время сна вручную, и я смогу подсказывать точнее.', 'No sleep data yet — log your sleep manually and I can be more specific.'));
  }
  const tips = sleepTipList(s);
  out.push(t('Что поможет: ', 'What helps: ') + tips.slice(0, 4).join('; ') + '.');
  const fact = s.phase === 'luteal' ? FACTS.lutealSleep : s.sri != null && s.sri < 75 ? FACTS.sleepRegularity : s.nightHrDiff != null && s.nightHrDiff > 3 ? FACTS.alcohol : pick([FACTS.caffeine, FACTS.morningLight, FACTS.sleepNeed], 3);
  return { text: out, fact, next: ['stress', 'today', 'heart'] };
};

// Советы по сну (порядок важности). Один источник для ответа «как улучшить сон» и для сценариев движка.
function sleepTipList(s) {
  const tips = [];
  if (s.sleep7 != null && s.sleep7 < 7) tips.push(t('ложись на 30–45 минут раньше — недобор за неделю около ', 'go to bed 30–45 minutes earlier — this week you are short about ') + hoursMin(s.sleepDebt));
  if (s.sri != null && s.sri < 75) tips.push(t('вставай в одно и то же время даже в выходные — это главный якорь режима', 'wake at the same time even on weekends — it anchors your rhythm'));
  tips.push(t('последний кофе — до 14:00', 'last coffee before 2 pm'));
  tips.push(t('утром 10–20 минут дневного света, вечером — приглушённый', '10–20 minutes of daylight in the morning, dim light in the evening'));
  if (s.nightHrDiff != null && s.nightHrDiff > 3) tips.push(t('ночной пульс повышен — поздний ужин и алкоголь вечером его поднимают', 'night HR is up — late dinners and evening alcohol raise it'));
  if (s.phase === 'luteal' || s.phase === 'late') tips.unshift(t('сейчас лютеиновая фаза: тело теплее, поэтому спальня попрохладнее и лёгкое одеяло помогут спать глубже', 'you are in the luteal phase: your body runs warmer, so a cooler bedroom and lighter blanket help'));
  tips.push(t('прохладная тёмная спальня и телефон вне кровати', 'a cool dark bedroom and the phone away from bed'));
  return tips;
}

A.heart = (s) => {
  const out = [];
  if (s.rhr7 != null) {
    const d = s.rhr30 != null ? s.rhr7 - s.rhr30 : null;
    out.push(t('Пульс покоя за неделю — ', 'Resting HR this week — ') + fmt(s.rhr7) + t(' уд/мин', ' bpm')
      + (d != null && Math.abs(d) >= 2 ? (d > 0 ? t(', это на ', ', ') + fmt(d) + t(' выше, чем за месяц.', ' above your monthly average.') : t(', это на ', ', ') + fmt(-d) + t(' ниже, чем за месяц — хороший знак.', ' below your monthly average — a good sign.')) : t(', стабильно.', ', steady.')));
  }
  if (s.hrv7 != null && s.hrvBase != null) {
    const d = ((s.hrv7 - s.hrvBase) / s.hrvBase) * 100;
    out.push('HRV — ' + fmt(s.hrv7) + t(' мс при твоей норме ', ' ms vs your baseline ') + fmt(s.hrvBase) + t(' мс', ' ms') + (d < -10 ? t(': ниже нормы, организм ещё восстанавливается.', ': below baseline, still recovering.') : d > 10 ? t(': выше нормы — хорошее восстановление.', ': above baseline — good recovery.') : t(': в пределах нормы.', ': within your norm.')));
  } else if (s.hrv7 != null) {
    out.push('HRV — ' + fmt(s.hrv7) + t(' мс. Своя норма появится после 2 недель измерений — сравнивать HRV с чужими цифрами нельзя.', ' ms. Your baseline appears after 2 weeks of readings — never compare HRV with other people.'));
  }
  if (s.nightHrDiff != null && s.nightHrDiff > 3) out.push(t('Ночной пульс выше нормы на ', 'Night HR is ') + fmt(s.nightHrDiff) + t(' уд/мин — так бывает после позднего ужина, алкоголя, стресса или в начале простуды.', ' bpm above norm — common after late meals, alcohol, stress or an oncoming cold.'));
  if (out.length && s.cycle && (s.phase === 'luteal' || s.phase === 'late')) out.push(t('Сейчас вторая половина цикла: пульс покоя обычно на несколько ударов выше, а HRV ниже — после начала месячных вернутся к норме.', 'You are in the second half of your cycle: resting HR usually runs a few beats higher and HRV lower — they return to normal after your period starts.'));
  if (out.length && s.cycle && s.phase === 'menstrual') out.push(t('В дни месячных пульс покоя обычно самый низкий, а HRV — самый высокий за цикл.', 'During your period resting HR is usually at its lowest and HRV at its highest.'));
  if (!out.length) out.push(t('Данных о пульсе и HRV пока нет. Их дают часы или браслет через Health Connect; пульс покоя можно записать вручную утром.', 'No heart rate or HRV data yet. A watch or band provides it via Health Connect; you can log morning resting HR manually.'));
  out.push(t('Это не диагноз: если пульс долго высокий или есть неприятные ощущения — обратись к врачу.', 'This is not a diagnosis: if your heart rate stays high or you feel unwell, see a doctor.'));
  return { text: out, fact: s.cycle ? FACTS.cycleHeart : s.hrv7 != null ? FACTS.hrvBaseline : FACTS.restingHr, next: ['train', 'sleep', 'stress'] };
};

A.move = (s) => {
  const out = [];
  out.push(t('Ориентир — около ', 'Aim for about ') + fmt(s.stepGoal) + t(' шагов в день и 150+ активных минут в неделю.', ' steps a day and 150+ active minutes a week.'));
  if (s.steps7 != null) out.push(t('Сейчас: ', 'Now: ') + fmt(s.steps7) + t(' шагов в день', ' steps a day') + (s.active7 != null ? t(', активных минут за неделю — ', ', active minutes this week — ') + fmt(s.active7) : '') + '.');
  if (s.steps7 != null && s.steps7 < s.stepGoal) out.push(t('Проще всего добрать: 10 минут ходьбы после каждого приёма пищи, лестница вместо лифта, звонки на ходу.', 'Easiest wins: 10 minutes of walking after each meal, stairs instead of the lift, calls on the move.'));
  if (s.workouts30 != null && s.workouts30 < 8) out.push(t('Добавь силовые 2 раза в неделю по 20–30 минут — их эффект не заменяют шаги.', 'Add strength twice a week for 20–30 minutes — steps do not replace it.'));
  return { text: out, fact: s.steps7 != null && s.steps7 < s.stepGoal ? FACTS.steps : pick([FACTS.whoActivity, FACTS.sitting, FACTS.walkAfterMeal], 5), next: ['train', 'age', 'weight'] };
};

A.age = (s) => {
  const out = [];
  if (s.delta != null) {
    out.push(t('Возраст тела — ', 'Body age — ') + fmt(s.bio, 1) + (s.delta <= 0 ? t(', на ', ', ') + fmt(-s.delta, 1) + t(' лет моложе паспортного.', ' years younger than your actual age.') : t(', на ', ', ') + fmt(s.delta, 1) + t(' лет старше паспортного.', ' years older than your actual age.')));
  }
  const levers = [];
  if (s.sleep7 != null && s.sleep7 < 7) levers.push(t('сон 7+ часов', '7+ hours of sleep'));
  if (s.sri != null && s.sri < 75) levers.push(t('ровный режим сна', 'regular sleep timing'));
  if (s.steps7 != null && s.steps7 < s.stepGoal) levers.push(t('больше шагов', 'more steps'));
  if (s.active7 != null && s.active7 < 150) levers.push(t('150+ активных минут в неделю', '150+ active minutes a week'));
  if (s.workouts30 != null && s.workouts30 < 8) levers.push(t('силовые 2 раза в неделю', 'strength twice a week'));
  if (s.vo2 != null) levers.push(t('рост VO2max через интервалы', 'higher VO2max via intervals'));
  if (s.smoking === 'current') levers.unshift(t('отказ от курения — самый сильный рычаг', 'quitting smoking — the strongest lever'));
  out.push(levers.length ? t('Больше всего сейчас дадут: ', 'Biggest levers for you now: ') + levers.slice(0, 4).join(', ') + '.' : t('Все основные показатели в норме — главное сейчас удерживать режим.', 'All main metrics look good — the key now is consistency.'));
  if (s.pace != null) out.push(t('Темп за 30 дней — ', '30-day pace — ') + fmt(s.pace, 2) + '×' + (s.pace < 1 ? t(': последние недели идут лучше среднего.', ': recent weeks are better than average.') : t(': последние недели хуже среднего за полгода.', ': recent weeks are worse than your 6-month average.')));
  out.push(t('Он меняется медленно — смотри на направление, а не на каждый день.', 'It changes slowly — watch the direction, not each day.'));
  return { text: out, fact: s.smoking === 'current' ? FACTS.smoking : pick([FACTS.vo2, FACTS.sleepRegularity, FACTS.strength, FACTS.habit], 9), next: ['move', 'sleep', 'train'] };
};

A.stress = (s) => {
  const out = [];
  out.push(s.state === 'tired' || (s.stress != null && s.stress >= 7)
    ? t('Похоже, нагрузка на нервную систему сейчас высокая.', 'Your nervous system seems to be under a lot of load right now.')
    : t('Пара простых приёмов, которые работают.', 'A few simple techniques that work.'));
  out.push(t('Прямо сейчас: 5 минут медленного дыхания — вдох на 4 счёта, выдох на 6.', 'Right now: 5 minutes of slow breathing — in for 4, out for 6.'));
  out.push(t('Днём: прогулка на улице 15–20 минут без телефона. Вечером: без новостей и работы за час до сна.', 'During the day: a 15–20 minute walk outside without the phone. Evening: no news or work an hour before bed.'));
  if (s.hrvDev != null && s.hrvDev < -10) out.push(t('HRV ниже нормы — тяжёлые тренировки сегодня только добавят стресса.', 'HRV is below baseline — hard training today would only add stress.'));
  out.push(t('Если тревога или усталость держатся неделями — стоит поговорить со специалистом.', 'If anxiety or fatigue lasts for weeks, talk to a professional.'));
  return { text: out, fact: FACTS.breathing, next: ['sleep', 'heart', 'today'] };
};

A.weight = (s) => {
  const out = [];
  out.push(t('Главное для снижения веса — питание: небольшой стабильный дефицит, больше белка и овощей, меньше сладких напитков и перекусов.', 'For weight loss, food matters most: a small steady deficit, more protein and vegetables, fewer sugary drinks and snacks.'));
  out.push(t('Движение помогает удержать результат: ', 'Movement helps keep the result: ') + fmt(s.stepGoal) + t('+ шагов в день и силовые 2 раза в неделю, чтобы сохранить мышцы.', '+ steps a day and strength twice a week to keep muscle.'));
  if (s.sleep7 != null && s.sleep7 < 7) out.push(t('Недосып усиливает аппетит — сон тоже часть плана.', 'Short sleep increases appetite — sleep is part of the plan.'));
  out.push(t('Темп в 0,5–1% веса в неделю — безопасный ориентир. Взвешивайся в одно время утром и записывай вес.', 'Losing 0.5–1% of body weight per week is a safe pace. Weigh yourself at the same time each morning and log it.'));
  return { text: out, fact: pick([FACTS.weightLoss, FACTS.walkAfterMeal], 11), next: ['move', 'sleep', 'train'] };
};

A.cycle = (s) => {
  if (!s.female) return { text: [t('Цикл можно включить в профиле — тогда я буду учитывать его в советах.', 'You can turn on cycle tracking in your profile — then I will factor it into my advice.')], fact: null, next: ['today', 'train', 'sleep'] };
  const b = s.cycleBase;
  const c = s.cycle;
  const out = [];
  if (!b) {
    out.push(t('Во время беременности прогноз цикла выключен. Если это изменилось — поменяй в профиле.', 'Cycle forecasts are off during pregnancy. If that has changed, update your profile.'));
    return { text: out, fact: null, next: ['sleep', 'stress', 'move'] };
  }
  if (!c) {
    out.push(t('Пока не знаю, когда были последние месячные. Отметь первый день на экране «Цикл» или в «Записать вручную» — дальше я посчитаю фазы и прогноз.', "I don't know your last period yet. Mark the first day on the Cycle screen or in Log manually and I will calculate phases and a forecast."));
    return { text: out, fact: FACTS.cycleLength, next: ['today', 'sleep', 'train'] };
  }
  out.push(cycleLine(s, false));
  if (!c.late) out.push(t('Следующие месячные ≈ ', 'Next period ≈ ') + dayLabel(c.nextKey) + (c.ovKey ? t(', овуляция ≈ ', ', ovulation ≈ ') + dayLabel(c.ovKey) : '') + '.');
  else out.push(t('Месячные ожидались ', 'Your period was expected on ') + dayLabel(c.nextKey) + t('. Когда начнутся — отметь, и прогноз пересчитается.', '. Mark it when it starts and the forecast will update.'));
  if (b.avgLen) {
    out.push(t('Средний цикл — ', 'Average cycle — ') + b.avgLen + t(' дн.', ' days') + (b.spread != null ? t(', разброс ', ', varies by ') + b.spread + t(' дн.', ' days') : '') + t('', '.')
      + (b.flags.length ? t(' Есть отклонения от нормы — подробности на экране «Цикл».', ' Some values are outside the norm — see the Cycle screen.') : t(' Это в пределах нормы.', ' That is within the norm.')));
  }
  else out.push(t('Прогноз пока по средним значениям: после 2–3 отмеченных циклов он станет личным.', 'The forecast uses averages for now: after 2–3 logged cycles it becomes personal.'));
  if (c.ovKey) out.push(t('Это оценка по календарю, а не метод контрацепции.', 'This is a calendar estimate, not contraception.'));
  const fact = b.flags.length ? FACTS.cycleNorm : c.phase === 'fertile' || c.phase === 'ovulation' ? FACTS.fertileWindow : pick([FACTS.cycleLength, FACTS.cycleHeart, FACTS.cyclePerformance], 13);
  return { text: out, fact, next: ['train', 'sleep', 'heart'] };
};

// Ответ на тему или свободный вопрос.
export function answer(topicOrText, result, profile) {
  const s = analyze(result, profile);
  const topic = A[topicOrText] ? topicOrText : matchTopic(topicOrText);
  if (!topic) {
    return {
      topic: null,
      text: [t('Я пока понимаю вопросы про сон, тренировки, пульс и HRV, шаги, стресс, вес, возраст тела' + (profile && profile.sex === 'f' && profile.showCycle ? ' и цикл' : '') + '. Выбери тему ниже или спроси по-другому.',
        'I understand questions about sleep, training, heart rate and HRV, steps, stress, weight and body age. Pick a topic below or rephrase.')],
      fact: null,
      next: ['today', 'train', 'sleep'],
    };
  }
  const r = A[topic](s);
  return { topic, ...r };
}

// Сообщение дня для карточки на «Обзоре»: приветствие + главное + одно действие.
export function dailyMessage(result, profile) {
  const s = analyze(result, profile);
  const r = A.today(s);
  // У женщин вторая строка — про цикл (если «усталость» объясняется фазой — именно это).
  const second = s.cycleSoftened ? r.text.find((x) => x.startsWith(t('HRV и пульс', 'HRV and heart'))) : s.cycle ? cycleLine(s, false) : r.text[1];
  return { text: greet(s) + ' ' + [r.text[0], second].filter(Boolean).join(' '), fact: r.fact, state: s.state };
}

export const topicLabel = label;

// ───────────────────────── Диалог с характером: reply() ─────────────────────────
// Этапы: смысл → содержание (факты и рекомендация) → уместность юмора → выбор → сборка.
// Юмор меняет только подачу; факты, расчёты и рекомендация берутся из builders ниже.

// Свежая погода из кэша weather.v1 (через setCoachWeather) или null.
function freshWeather() {
  const w = WEATHER;
  if (!w || typeof w.at !== 'number' || w.stale === true) return null;
  const age = Date.now() - w.at;
  if (age > WEATHER_TTL || age < -60000) return null;
  const tmp = typeof w.temp === 'number' ? w.temp : null;
  let cond = 'other';
  let level = null;
  if (w.kind === 'storm') { cond = 'storm'; level = 'danger'; }
  else if (tmp != null && tmp >= 33) { cond = 'heat'; level = 'danger'; }
  else if (tmp != null && tmp <= -20) { cond = 'frost'; level = 'danger'; }
  else if (w.kind === 'rain') { cond = 'rain'; level = 'inconvenient'; }
  else if (w.kind === 'snow') { cond = 'snow'; level = 'inconvenient'; }
  else if (tmp != null && tmp >= 28) { cond = 'warm'; level = 'inconvenient'; }
  else if (tmp != null && tmp <= -10) { cond = 'cold'; level = 'inconvenient'; }
  else if (w.kind === 'clear' && tmp != null && tmp >= 8 && tmp <= 26) { cond = 'good'; level = 'good'; }
  return { cond, level, temp: tmp, label: w.kind, fromCache: true };
}

const DANGER_WHY = {
  storm: () => t('гроза — это молнии и скользкая дорога', 'a thunderstorm means lightning and slippery roads'),
  ice: () => t('гололёд — риск упасть и травмироваться', 'ice means a real risk of falling'),
  heat: () => t('сильная жара — риск перегрева', 'extreme heat risks overheating'),
  frost: () => t('сильный мороз — риск переохлаждения и обморожения', 'severe frost risks hypothermia and frostbite'),
};
const WEATHER_NAME = { storm: ['гроза', 'a thunderstorm'], rain: ['дождь', 'rain'], snow: ['снег', 'snow'], heat: ['сильная жара', 'extreme heat'], frost: ['сильный мороз', 'severe frost'], warm: ['жарко', 'hot'], cold: ['холодно', 'cold'], good: ['хорошая погода', 'good weather'] };

const B = {};

B.safety = (s, ctx) => {
  const urgent = ctx.sensitive.symptoms;
  const out = [t('Остановись и прекрати нагрузку сейчас. Не терпи и не «разминай» боль — дай телу покой.', 'Stop and end the effort now. Do not push through pain — rest.')];
  if (urgent && ctx.dizzyOnly) out.push(t('Головокружение, потемнение в глазах или тошнота при нагрузке — повод остановиться и показаться врачу, не терпи. Если появятся обморок, боль или давление в груди, одышка, онемение или спутанность сознания — вызывай скорую: 103 или 112 и не оставайся один. До осмотра врача — без тренировок.', 'Dizziness, darkening vision or nausea during effort is a reason to stop and see a doctor, so do not push through. If fainting, chest pain or pressure, shortness of breath, numbness or confusion appear, call emergency services (112) and do not stay alone. Until a doctor has checked you, no training.'));
  else if (urgent) out.push(t('Боль или давление в груди (особенно с отдачей в руку, челюсть или спину), одышка, обморок или предобморочное состояние, сильное неровное сердцебиение, онемение или слабость в лице или руке, спутанность сознания — тревожные признаки. Вызывай скорую прямо сейчас: 103 или 112, сам за руль не садись и не оставайся один. Не возвращайся к тренировкам, пока тебя не осмотрит врач.', 'Chest pain or pressure (especially spreading to the arm, jaw or back), shortness of breath, fainting or near-fainting, a strong irregular heartbeat, numbness or weakness in the face or arm, or confusion are red flags. Call emergency services (112) right now, do not drive yourself and do not stay alone. Do not resume training until a doctor has checked you.'));
  else out.push(t('Если боль острая, сильная, после удара или падения, есть отёк или она не проходит за пару дней, обратись к врачу. До этого — без тренировок на больное место.', 'If the pain is sharp, strong, follows a fall or blow, comes with swelling or lasts more than a couple of days, see a doctor. Until then, do not train the sore area.'));
  out.push(t('Я не ставлю диагнозы — это только совет по безопасности.', 'I do not diagnose — this is safety advice only.'));
  return { text: out, fact: null, next: ['stress', 'sleep', 'today'] };
};

B.treatment = () => ({
  text: [t('Вопросы о лекарствах, дозах и лечении — к врачу или фармацевту: я не подбираю препараты и не заменяю назначения.', 'Questions about medication, doses and treatment belong with a doctor or pharmacist: I do not choose drugs or replace prescriptions.'),
    t('Могу помочь с режимом сна, движением и стрессом. Если самочувствие ухудшилось, обратись за медицинской помощью.', 'I can help with sleep, movement and stress. If you feel worse, seek medical care.')],
  fact: null, next: ['sleep', 'stress', 'today'],
});

B.support = (s, ctx) => {
  if (ctx.guilt && ctx.gap) {
    return { text: [t('Перерыв случается у всех, и стыдиться тут нечего. Он не говорит ничего о тебе как о человеке.', 'Breaks happen to everyone, and there is nothing to be ashamed of. A break says nothing about who you are.'),
      t('Возвращайся мягко: первые 1–2 недели вполовину от прежнего объёма, потом прибавляй понемногу.', 'Return gently: for the first 1–2 weeks do half of your old volume, then add a little at a time.')], fact: null, next: ['train', 'move', 'sleep'] };
  }
  if (ctx.guilt) {
    return { text: [t('Жаль, что тебя это так задело. Один пропуск не описывает всё, что ты делаешь.', 'I am sorry this hit you so hard. One missed workout does not define what you do.'),
      t('Давай без наказания дополнительной нагрузкой: просто вернуться к плану со следующего занятия.', 'Let us not punish it with extra load: just return to the plan at the next session.')], fact: null, next: ['today', 'sleep', 'stress'] };
  }
  return { text: [t('Мне жаль, что сейчас так тяжело. Ты не обязан справляться в одиночку — поговори с близким человеком.', 'I am sorry it is so hard right now. You do not have to cope alone — talk to someone close.'),
    t('Сегодня можно снизить планку: прогулка, вода, отдых. Если тяжесть держится неделями, стоит поговорить со специалистом.', 'Today you can lower the bar: a walk, water, rest. If it lasts for weeks, it is worth talking to a professional.')],
  fact: null, next: ['stress', 'sleep', 'today'] };
};

B.why_metric = (s) => {
  const out = [t('Причину по одному значению определить нельзя, и гадать я не буду.', 'One value cannot tell the cause, and I will not guess.')];
  if (s.steps7 != null) out.push(t('Для сравнения: в среднем за неделю у тебя ', 'For comparison, your weekly average is ') + fmt(s.steps7) + t(' шагов в день.', ' steps a day.'));
  out.push(t('Что именно тебя смутило: значение кажется слишком низким или слишком странным, и когда это началось — сегодня или в последние дни?', 'What bothers you: does the value look too low or just odd, and when did it start — today or in recent days?'));
  return { text: out, fact: null, next: ['move', 'sleep', 'heart'] };
};

const minsRu = (gap) => {
  const n = Math.round(gap / 100);
  if (gap / 100 < 1.5) return 'меньше минуты';
  const w = n % 10 === 1 && n % 100 !== 11 ? 'минута' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 'минуты' : 'минут';
  return 'примерно ' + n + ' ' + (w === 'минута' ? 'минуту' : w);
};
const minsEn = (gap) => (gap / 100 < 1.5 ? 'under a minute' : 'roughly ' + Math.round(gap / 100) + ' minutes');
B.round_chase = (s, ctx) => {
  const rc = ctx.roundChase;
  const out = [t('Если вопрос только в красивом числе, можно оставить как есть. Круглый счёт — не обязательный финал дня.', 'If it is only about a pretty number, you can leave it. A round count is not a mandatory end to the day.')];
  if (rc && s.state !== 'tired') {
    const gap = rc.m - rc.n;
    out.push(t('Если самочувствие хорошее и хочется закрыть разрыв, это около ' + gap + ' шагов — ' + minsRu(gap) + ' спокойной ходьбы. Без спешки и бега ради числа.', 'If you feel fine and want to close the gap, it is about ' + gap + ' steps — ' + minsEn(gap) + ' of easy walking. No rushing for the number.'));
  } else if (s.state === 'tired') out.push(t('Сегодня восстановление не лучшее, так что смело оставляй как есть.', 'Recovery is not great today, so leave it as it is.'));
  return { text: out, fact: null, next: ['move', 'train', 'today'] };
};

B.plan_review = (s, ctx) => {
  const out = [];
  if (ctx.situations.includes('beginner_heavy')) out.push(t('Первую неделю — 2–3 лёгкие сессии по 20–30 минут в темпе, когда можно разговаривать. Нагрузку повышай не больше чем на 10% в неделю.', 'First week: 2–3 easy sessions of 20–30 minutes at talking pace. Raise the load by no more than 10% a week.'));
  else if (ctx.situations.includes('detailed_tracking')) out.push(t('Для начала достаточно двух-трёх показателей: сон, шаги и самочувствие. Остальное только добавляет шума.', 'Two or three metrics are enough to start: sleep, steps and how you feel. The rest adds noise.'));
  else out.push(t('Давай начнём с одного занятия, остальное пусть будет вариантами, а не обязательствами.', 'Let us start with one session; the rest are options, not obligations.'));
  out.push(t('Если пойдёт легко, через пару недель добавим второе. Какое занятие тебе больше нравится?', 'If it feels easy, we add a second in a couple of weeks. Which activity do you like most?'));
  return { text: out, fact: null, next: ['train', 'move', 'today'] };
};

B.simplify = () => ({
  text: [t('Простой план тоже план: прогулка 15–30 минут в спокойном темпе — полноценный день движения, когда сил на сложное нет.', 'A simple plan is still a plan: a 15–30 minute easy walk is a full day of movement when you lack energy for something harder.'),
    t('Если по ходу появятся силы, можно добавить, но обязательства нет.', 'If you feel energetic on the way you can add more, but there is no obligation.')],
  fact: null, next: ['move', 'train', 'sleep'],
});

B.plan_change = () => ({
  text: [t('Менять планы нормально: за неделю важна сумма движения, ориентир 150 минут умеренной активности, а не строгий порядок.', 'Changing plans is fine: what matters is the weekly total, about 150 minutes of moderate activity, not a strict order.'),
    t('Чем заменим отменённое: прогулкой, растяжкой или просто отдыхом?', 'What do we swap it for: a walk, stretching or just rest?')],
  fact: null, next: ['move', 'train', 'today'],
});

B.procrastination = (s) => ({
  text: [t('Договорись с собой на 10 минут: обуйся, выйди и пройдись. Не пойдёт — вернёшься, и это тоже засчитывается.', 'Make a deal for 10 minutes: shoes on, step out, walk. If it is not working, come back — that still counts.'),
    s.state === 'tired' ? t('Готовность сегодня невысокая, так что прогулка важнее тренировки.', 'Readiness is low today, so a walk beats a workout.') : t('Если мешает усталость или самочувствие, скажи, и подберём другой вариант.', 'If tiredness or how you feel is in the way, tell me and we will pick another option.')],
  fact: null, next: ['train', 'move', 'sleep'],
});

B.single_trend = (s) => {
  const out = [t('Одно значение ещё не тенденция: смотри на средние за 7 и 30 дней.', 'One value is not a trend: watch the 7- and 30-day averages.')];
  if (s.rhr7 != null) out.push(t('Пульс покоя за неделю — ', 'Resting HR this week — ') + fmt(s.rhr7) + t(' уд/мин.', ' bpm.'));
  else if (s.steps7 != null) out.push(t('Шагов в среднем за неделю — ', 'Weekly average steps — ') + fmt(s.steps7) + '.');
  out.push(t('Если отклонение повторится несколько дней подряд, разберём вместе.', 'If the deviation repeats for several days in a row, we will look into it together.'));
  return { text: out, fact: null, next: ['heart', 'move', 'sleep'] };
};

B.achievement = () => ({
  text: [t('Дай телу восстановиться: следующее занятие сделай полегче, а нагрузку повышай не больше чем на 10% в неделю.', 'Let your body recover: make the next session easier and raise the load by no more than 10% a week.')],
  fact: null, next: ['train', 'sleep', 'move'],
});

B.return_habit = () => ({
  text: [t('Возвращайся мягко: первые 1–2 недели вполовину от прежнего объёма, потом прибавляй понемногу.', 'Return gently: for the first 1–2 weeks do half of your old volume, then add a little at a time.')],
  fact: null, next: ['train', 'move', 'sleep'],
});

B.weather_train = (s, ctx) => {
  const u = ctx.weather;
  const w = u.cond ? { cond: u.cond, level: u.level, fromCache: false } : freshWeather();
  const out = [];
  const base = A.train(s).text[0];
  const ask = t('Что задумал: улицу или зал?', 'What is the plan: outdoors or the gym?');
  if (!w || !w.level) {
    out.push(w ? t('Погода сейчас обычная, ничего особенного.', 'The weather looks ordinary.') : t('Погоду я сам не вижу и свежих данных у меня нет, так что не знаю, что за окном.', 'I cannot see the weather and have no fresh data, so I do not know what it is outside.'));
    if (!w) out.push(t('Если гроза, гололёд, сильная жара или мороз, пробежку на улице лучше заменить занятием в помещении. Если просто дождь или ветер, можно тренироваться в помещении или выйти, одевшись по погоде.', 'With a thunderstorm, ice, extreme heat or frost, swap the outdoor run for an indoor session. With plain rain or wind, train indoors or dress for it and go out.'));
    out.push(base, ask);
  } else if (w.level === 'danger') {
    const nm = WEATHER_NAME[w.cond] ? WEATHER_NAME[w.cond][RU ? 0 : 1] : '';
    if (w.fromCache) out.push(t('По последним данным за окном: ' + nm + '.', 'Latest data says: ' + nm + '.'));
    if (u.indoor && !u.outdoor) out.push(t('В помещении заниматься можно, по самочувствию.', 'Training indoors is fine, according to how you feel.'));
    else out.push(t('Тренировку на улице сейчас лучше перенести: ', 'Better to postpone the outdoor workout: ') + DANGER_WHY[w.cond]() + '.');
    out.push(t('Если хочется сохранить занятие, сделай его дома или в зале.', 'To keep the session, do it at home or in the gym.'), base);
  } else if (w.level === 'inconvenient') {
    const nm = WEATHER_NAME[w.cond] ? WEATHER_NAME[w.cond][RU ? 0 : 1] : '';
    if (w.fromCache) out.push(t('По последним данным за окном: ' + nm + '.', 'Latest data says: ' + nm + '.'));
    out.push(t('Это неудобство, а не повод отменять тренировку. В помещении занимайся по плану. На улице одевайся по погоде и осторожнее на скользком; не хочется — достаточно зала или дома.', 'This is an inconvenience, not a reason to cancel. Indoors, follow the plan. Outdoors, dress for it and watch slippery spots; if you would rather not, the gym or home works.'), base);
  } else {
    if (w.fromCache) out.push(t('По последним данным за окном хорошая погода.', 'Latest data says the weather is good.'));
    out.push(t('Хорошая погода не повод нагружаться сильнее: ориентируйся на самочувствие. Если оно позволяет, можно начать с привычного плана.', 'Good weather is not a reason to push harder: go by how you feel. If it allows, start with your usual plan.'), base, ask);
  }
  return { text: out, fact: null, next: ['train', 'today', 'move'] };
};

B.about = () => ({
  text: [t('Я Хирон — наставник Epimely. Своё имя я взял у мудрого кентавра из мифов, который учил героев. Epimely от греческого epimeleia — «забота о себе».',
    'I am Chiron, the mentor of Epimely. I borrowed the name from the wise centaur of the myths who taught heroes. Epimely comes from the Greek epimeleia, "care of the self".'),
  t('Помогаю разобраться со сном, тренировками, пульсом и HRV, шагами, возрастом тела и стрессом. Ответы формируются локально, на телефоне; для погоды приложение обращается к погодному сервису. Я не заменяю врача.',
    'I can help with sleep, training, heart rate and HRV, steps, body age and stress. My answers are produced locally on your phone; for weather the app contacts a weather service. I do not replace a doctor.'),
  t('С чего начнём?', 'Where shall we start?')],
  fact: null, next: ['today', 'sleep', 'train'],
});

const NO_JOKES_ACK = () => [t('Понял, без шуток.', 'Got it, no jokes.'), t('Принято, шутки в сторону.', 'Understood, jokes aside.'), t('Понял, дальше серьёзно.', 'Understood, serious from here.')];

function chooseIntent(input, ctx, situationsOnly) {
  if (typeof input === 'string' && A[input]) return input;
  const sit = ctx.situations;
  const q = String(input || '').toLowerCase();
  if (ctx.sensitive.symptoms || ctx.sensitive.pain) return 'safety';
  if (ctx.sensitive.treatment) return 'treatment';
  if (ctx.sensitive.distress || ctx.guilt) return 'support';
  if (/кто ты|кто такой хирон|расскажи о себе|о себе подробн|что ты такое|как тебя зовут|\b(who are you|about yourself|about you|what are you|your name)\b/.test(q)) return 'about';
  if (/почему|отчего|из-за чего|с чего|\b(why|how come)\b/.test(q) && (sit.includes('number_1749') || /шаг|пульс|hrv|сон|вес|давлен|показател|цифр|значени|\b(steps?|pulse|heart rate|sleep|weight|pressure|number|value|figure|reading|metric)\b/.test(q))) return 'why_metric';
  const w = ctx.weather;
  if (w.training && (w.cond || w.asked)) return 'weather_train';
  for (const [k, id] of [['round_chase', 'round_chase'], ['overloaded_plan', 'plan_review'], ['detailed_tracking', 'plan_review'], ['beginner_heavy', 'plan_review'], ['simplify', 'simplify'], ['plan_change', 'plan_change'], ['procrastination', 'procrastination'], ['single_trend', 'single_trend'], ['achievement', 'achievement'], ['return_habit', 'return_habit']]) {
    if (sit.includes(k)) return id;
  }
  return situationsOnly ? null : matchTopic(input);
}

const lowerFirst = (x) => (x ? x[0].toLowerCase() + x.slice(1) : x);

// ───────── мосты к движку lib/coach: объяснения, упрощения и альтернативы строятся из существующей логики ─────────
const SIMPLE_STEP = {
  sleep: () => t('Один шаг: лечь на 30 минут раньше обычного.', 'One step: go to bed 30 minutes earlier than usual.'),
  heart: () => t('Один шаг: утром, в одно и то же время, записывать пульс покоя.', 'One step: log resting heart rate in the morning at the same time.'),
  stress: () => t('Один шаг: 5 минут медленного дыхания — вдох на 4 счёта, выдох на 6.', 'One step: 5 minutes of slow breathing — in for 4, out for 6.'),
  weight: () => t('Один шаг: меньше сладких напитков и перекусов.', 'One step: fewer sugary drinks and snacks.'),
  age: () => t('Один шаг: сон 7 часов и больше.', 'One step: 7+ hours of sleep.'),
};
function whyFor(topic, s) {
  if (topic === 'train' || topic === 'today') {
    if (s.state === 'tired') return [reasonTired(s)];
    if (s.readiness != null) return [t('Готовность сегодня ' + s.readiness + '/100' + (s.load === 'high' ? ', а нагрузка последних дней выше обычной' : '') + ' — рекомендация опирается на это.', 'Readiness today is ' + s.readiness + '/100' + (s.load === 'high' ? ' and recent load is above usual' : '') + ' — the advice is based on that.')];
    return [t('Данных о восстановлении мало, поэтому совет осторожный: ориентируйся на самочувствие.', 'There is little recovery data, so the advice is cautious: go by how you feel.')];
  }
  if (topic === 'sleep') return [s.sleepH != null ? t('Прошлой ночью — ' + hoursMin(s.sleepH) + '. Остальное — общие правила сна из базы знаний.', 'Last night — ' + hoursMin(s.sleepH) + '. The rest are general sleep rules from the knowledge base.') : t('Данных о сне нет, поэтому это общие правила из базы знаний, а не вывод по тебе.', 'There is no sleep data, so these are general rules from the knowledge base, not a conclusion about you.')];
  if (topic === 'move') return [s.steps7 != null ? t('В среднем ' + fmt(s.steps7) + ' шагов в день при ориентире около ' + fmt(s.stepGoal) + '.', 'You average ' + fmt(s.steps7) + ' steps a day against a target of about ' + fmt(s.stepGoal) + '.') : t('Данных о шагах нет, поэтому это общий ориентир.', 'There is no step data, so this is a general target.')];
  const fact = { heart: s.hrv7 != null ? FACTS.hrvBaseline : FACTS.restingHr, stress: FACTS.breathing, weight: FACTS.weightLoss, age: FACTS.vo2, cycle: FACTS.cycleNorm }[topic];
  return fact ? [fact.text] : [t('Это общий совет из базы знаний, а не вывод по твоим данным.', 'This is general advice from the knowledge base, not a conclusion from your data.')];
}
function altFor(topic, s, place) {
  if (topic === 'train' || topic === 'today') {
    if (place === 'home') return [t('Дома: растяжка или йога 20–30 минут.', 'At home: stretching or yoga for 20–30 minutes.')];
    if (place === 'gym') return [t('В зале: спокойное кардио 30–45 минут в разговорном темпе.', 'At the gym: easy cardio for 30–45 minutes at talking pace.')];
    if (place === 'outdoor') return [t('На улице: прогулка или лёгкий велосипед 20–30 минут.', 'Outdoors: a walk or an easy bike ride for 20–30 minutes.')];
    return [s.state === 'tired' ? t('Вариант: прогулка, лёгкий велосипед, йога или растяжка 20–30 минут.', 'Option: a walk, an easy bike ride, yoga or stretching for 20–30 minutes.') : t('Другой вариант: спокойное кардио 30–45 минут (можно разговаривать) или техника и мобильность.', 'Another option: easy cardio for 30–45 minutes (talking pace) or technique and mobility.')];
  }
  if (topic === 'sleep') return [t('Другой рычаг — свет: утром 10–20 минут дневного света, вечером приглушённый.', 'Another lever is light: 10–20 minutes of daylight in the morning, dim light in the evening.')];
  if (topic === 'move') return [t('Другой способ добрать шаги: 10 минут ходьбы после каждого приёма пищи.', 'Another way to add steps: 10 minutes of walking after each meal.')];
  if (topic === 'stress') return [t('Другой приём: прогулка 15–20 минут на улице без телефона.', 'Another technique: a 15–20 minute walk outside without the phone.')];
  return null;
}
// Разные формулировки ОДНОЙ и той же рекомендации (факты не меняются): движок выбирает давно не использованную,
// чтобы повтор вопроса менял основной блок, а не только хвост. Индекс 0 — исходный текст A.train.
function trainLines(s) {
  const base = A.train(s).text[0];
  if (s.state === 'tired') {
    const r = reasonTired(s);
    return [base, t('Тяжёлую тренировку сегодня лучше пропустить. ', 'Better to skip the hard session today. ') + r, t('По восстановлению сегодня лучше мягкий день. ', 'By recovery a gentle day is better today. ') + r, t('Нет, тяжёлому сегодня не место. ', 'No, the hard stuff has no place today. ') + r];
  }
  if (s.state === 'unknown') {
    return [base, t('Оценить восстановление не могу — данных мало. Решает самочувствие: бодр — умеренная нагрузка, вял — прогулка.', 'I cannot judge recovery — too little data. How you feel decides: energetic, moderate effort; sluggish, a walk.'),
      t('Данных о восстановлении мало, поэтому судья — самочувствие: есть силы — умеренная тренировка, нет — прогулка.', 'There is little recovery data, so how you feel is the judge: with energy, a moderate session; without, a walk.')];
  }
  const fresh = s.state === 'fresh';
  const plan = trainPlan(s, fresh);
  if (fresh) {
    return [base, t('Организм готов к нагрузке — ', 'Your body is ready for effort — ') + lowerFirst(plan), t('День подходит для основной работы. ', 'The day suits your main work. ') + plan, t('Можно нагружаться: ', 'You can push today: ') + lowerFirst(plan)];
  }
  return [base, t('Тренироваться можно, а рекорды оставим на потом. ', 'You can train; records can wait. ') + plan, t('Обычный день для умеренной нагрузки. ', 'An ordinary day for moderate effort. ') + plan, t('Идти можно, только без рекордов — ', 'Go ahead, just no records — ') + lowerFirst(plan)];
}
// Разные акценты в советах по сну (те же факты, другой выбор и порядок).
function sleepAlts(s) {
  const tips = sleepTipList(s);
  const out = [t('Что поможет: ', 'What helps: ') + tips.slice(0, 4).join('; ') + '.'];
  out.push(t('Если выбрать одно: ', 'If you pick one: ') + tips[0] + '.');
  if (tips.length >= 3) out.push(t('Два главных рычага: ', 'Two main levers: ') + tips[1] + '; ' + tips[2] + '.');
  out.push(t('Из мелочей: ', 'A small thing: ') + tips[tips.length - 1] + '.');
  out.push(t('Начни с простого: ', 'Start simple: ') + tips[Math.min(1, tips.length - 1)] + '.');
  return out.filter((x, i) => out.indexOf(x) === i);
}
// Объяснения и альтернативы для ответов старых builders (B.*), которые движок не знает по id.
const WHY_INTENT = {
  round_chase: () => [t('Шаги — это сумма движения за день, а не соревнование со счётчиком: разница в пару десятков шагов ничего не меняет. Важнее среднее за неделю.', 'Steps are the total movement of the day, not a contest with the counter: a difference of a few dozen steps changes nothing. The weekly average matters more.')],
  single_trend: () => [t('Одно значение зависит от множества мелочей (сон, еда, нагрузка), поэтому тенденцию видно только по нескольким дням.', 'A single value depends on many small things (sleep, food, load), so a trend only shows over several days.')],
  plan_review: () => [t('Короткий план проще выполнить, а выполненный план полезнее подробного, который остался на бумаге.', 'A short plan is easier to keep, and a plan that is done beats a detailed one left on paper.')],
  plan_change: () => [t('За неделю важна сумма движения, ориентир 150 минут умеренной активности, а не строгий порядок занятий.', 'What matters over a week is the total movement, about 150 minutes of moderate activity, not a strict order of sessions.')],
  procrastination: () => [t('Начать обычно труднее всего, поэтому планка в 10 минут: уже вышел — задача выполнена.', 'Starting is usually the hardest part, hence the 10-minute bar: once you are out, the task is done.')],
  achievement: () => [t('После нагрузки организму нужно время, а повышать объём больше чем на 10% в неделю не стоит.', 'After effort the body needs time, and volume should not rise more than 10% a week.')],
  return_habit: () => [t('После перерыва организм отвык от нагрузки, поэтому мягкий возврат надёжнее рывка.', 'After a break the body is out of practice, so a gentle return is safer than a rush.')],
  simplify: () => [t('Простой план выполнить проще, а регулярность важнее сложности.', 'A simple plan is easier to keep, and regularity matters more than complexity.')],
  why_metric: () => [t('По одному значению причину определить нельзя, поэтому я не гадаю.', 'One value cannot tell the cause, so I do not guess.')],
};
const ALT_INTENT = {
  round_chase: () => [t('Можно закрыть разрыв спокойной ходьбой после еды, а можно оставить как есть: на здоровье это не влияет.', 'You can close the gap with an easy walk after a meal, or leave it: it does not affect your health.')],
  procrastination: () => [t('Другой вход: пять минут растяжки прямо дома. Начал — и уже засчитано.', 'Another way in: five minutes of stretching right at home. Once you start, it counts.')],
  plan_review: () => [t('Другой путь: оставь одно занятие, а остальное считай бонусом.', 'Another way: keep one session and count the rest as a bonus.')],
  plan_change: () => [t('Вместо отменённого можно прогуляться 15–20 минут или просто отдохнуть.', 'Instead of the cancelled session you can walk for 15–20 minutes or simply rest.')],
};
function bridge(s) {
  return {
    trainLine: () => A.train(s).text[0],
    trainLines: () => trainLines(s),
    sleepAlts: () => sleepAlts(s),
    whyIntent: (id) => (WHY_INTENT[id] ? WHY_INTENT[id]() : null),
    altIntent: (id) => (ALT_INTENT[id] ? ALT_INTENT[id]() : null),
    dangerWhy: (cond) => (DANGER_WHY[cond] ? DANGER_WHY[cond]() : null),
    why: (topic) => whyFor(topic, s),
    simpler: (topic) => (['train', 'today', 'move'].includes(topic) ? B.simplify().text : SIMPLE_STEP[topic] ? [SIMPLE_STEP[topic]()] : null),
    alt: (topic, place) => altFor(topic, s, place),
    step: (topic) => (topic === 'train' || topic === 'today' ? (s.state === 'unknown' ? null : [trainPlan(s, s.state === 'fresh')]) : SIMPLE_STEP[topic] ? [SIMPLE_STEP[topic]()] : null),
  };
}

const SENSITIVE_INTENTS = ['safety', 'treatment', 'support'];

// Ответ коуча с характером.
// opts: { history: [{from:'me'|'coach', text:[...], humorId?}], tone: 'off'|'balanced'|'playful', session: {dampened, memory}, memory, now,
//   extra: { arc, rank, quests, rest } — для приветствия (lib/coach/greetExtra.js) и «какие задания на сегодня» (smartQuests) }
// Конвейер: нормализация -> чувствительное -> распознавание -> сценарий движка (lib/coach) или прежний builder -> юмор -> сборка -> проверка -> память.
// -> { topic, text[], fact, next, humorId, session: {dampened, memory} }  (память диалога лежит в session.memory)
// Двухпроходный разбор: сначала исходный текст; если правила ничего не поняли (неизвестно / неоднозначно / мусор), второй проход —
// по тексту с исправленными опечатками (match.repairText). Уверенный ответ первого прохода никогда не заменяется.
const WEAK_SCOPE = ['scope_unknown', 'scope_gibberish', 'scope_ambiguous'];
const isWeakRoute = (rt) => !rt || (rt.kind === 'engine' ? WEAK_SCOPE.includes(rt.id) : !rt.id);
export function reply(input, result, profile, opts) {
  const first = replyPass(input, result, profile, opts, false);
  if (typeof input !== 'string') return first;
  const weak = isWeakRoute(first.route);
  // слабое ключевое совпадение прежнего конвейера (legacy) тоже уступает уверенному сценарию по исправленному тексту
  if (!weak && !(first.route && first.route.kind === 'legacy')) return first;
  let fixed = input;
  try { fixed = repairText(input); } catch (e) { fixed = input; }
  if (fixed === input) return first;
  const second = replyPass(input, result, profile, opts, true);
  if (isWeakRoute(second.route)) return first;
  return weak || second.route.kind === 'engine' ? second : first;
}

function replyPass(input, result, profile, opts, repair) {
  const o = opts || {};
  const history = Array.isArray(o.history) ? o.history : [];
  const mem0 = deserialize(o.memory || (o.session && o.session.memory));
  // мягкая пауза после тяжёлых переживаний истекает через 3 хода (если человек не повторил тяжёлое)
  if (mem0.hold && mem0.hold.kind === 'soft' && mem0.turn - mem0.hold.turn >= SOFT_HOLD_TURNS) mem0.hold = null;
  const mode = o.tone === 'off' ? 'off' : normalizeMode(mem0.humorMode || o.tone);
  const session = { dampened: !!(o.session && o.session.dampened), memory: mem0 };
  const isTopicId = typeof input === 'string' && !!A[input];
  let ctx = null;
  try { ctx = detect(typeof input === 'string' ? input : '', history); } catch (e) { ctx = null; }
  if (!ctx) return { ...answer(input, result, profile), humorId: null, session };
  const raw0 = typeof input === 'string' ? input : '';
  // Опечатки/склейки/раскладка исправляются только для распознавания тем; безопасность проверяется и по исходному тексту, и по исправленному.
  let raw = raw0;
  if (repair && !isTopicId) { try { raw = repairText(raw0); } catch (e) { raw = raw0; } }
  const hasSens = (c) => !!(c && (c.sensitive.symptoms || c.sensitive.pain || c.sensitive.distress || c.sensitive.treatment || c.guilt));
  if (raw !== raw0) { let c2 = null; try { c2 = detect(raw, history); } catch (e) { c2 = null; } if (hasSens(c2) && !hasSens(ctx)) ctx = c2; }
  const nlu = analyzeText(raw, mem0);
  let death = raw0 ? (deathCheck(raw0) || (raw !== raw0 ? deathCheck(raw) : null)) : null;
  const inputF = isTopicId ? input : raw;
  // человек сам сказал, что симптом прошёл: пауза снимается, а слова «боль прошла» не запускают совет по безопасности заново
  const releasing = !!(mem0.hold && nlu.passed && !nlu.isQuestion);
  // самоповреждение/суицидальные мысли и расстройства пищевого поведения: отдельные сценарии (не диагноз, без юмора, с защитной паузой)
  if (!releasing && ctx.sensitive.crisis) death = 'crisis';
  else if (!releasing && ctx.sensitive.eating && death !== 'red') death = 'eating';
  if (releasing) { ctx.sensitive.pain = false; ctx.sensitive.symptoms = false; ctx.dizzy = false; ctx.dizzyOnly = false; }
  if (death === 'red' && !releasing) { ctx.sensitive.symptoms = true; ctx.blocked = true; }
  if (mem0.hold) ctx.blocked = true; // защитная пауза: ни шуток, ни мемов до слов «прошло / всё хорошо»
  if (nlu.notUnderstood) ctx.sensitive.noJokes = false; // «не понял» — просьба объяснить проще, а не отказ от шуток
  if (ctx.sensitive.noJokes) session.dampened = true; // действует сразу и до конца диалога
  const s = analyze(result, profile);
  const sens = !!(ctx.sensitive.symptoms || ctx.sensitive.pain || ctx.sensitive.distress || ctx.sensitive.treatment || ctx.guilt);
  const holdTopicButton = !!(mem0.hold && isTopicId && ['train', 'today', 'weather'].includes(input) && !sens);
  const runEngine = (holdTopicButton || !isTopicId) && (death !== 'red' || releasing) && (!sens || releasing || nlu.capability === 'cap_diagnose' || death === 'joke' || death === 'cautious' || death === 'crisis' || death === 'eating');
  let intent = null;
  let body = null;
  let paras = null;
  let humorId = null;
  let patch = {};
  let eng = null;
  if (runEngine) {
    const legacyIntent = sens ? null : chooseIntent(inputF, ctx, true);
    const env = {
      nlu, ctx, s, profile, mem: mem0, history, ru: RU, now: Date.now(), weather: WEATHER, extra: o.extra || null, legacy: bridge(s), legacyIntent, sens: !!sens,
      legacyTopic: !!matchTopic(inputF), legacyTopicId: matchTopic(inputF), death, tone: o.tone, forceHold: holdTopicButton,
      pickHumor: (sits, flags) => {
        if (session.dampened || mode === 'off' || mem0.hold) return null;
        return selectHumor({ input, ctx: { ...ctx, situations: [...ctx.situations, ...sits], flags: [...ctx.flags, ...(flags || [])] }, intent: null, mode, history, session, catalog: o.catalog, ru: RU });
      },
    };
    try { eng = respond(env); } catch (e) { eng = null; }
  }
  let mlLabel = null;
  if (eng && eng.kind === 'legacyTopic') { intent = eng.topic; if (eng.ml) mlLabel = eng.ml; else patch.resolved = true; eng = null; }
  if (eng) {
    if (eng.dampen === true) session.dampened = true;
    else if (eng.dampen === false) session.dampened = false;
    paras = eng.paras;
    humorId = eng.humor ? eng.humor.item.id : null;
    body = { topic: eng.topic || 'control', fact: null, next: eng.next || ['today', 'train', 'sleep'] };
    patch = { topic: eng.topic || undefined, scenario: eng.topic ? eng.scenario : undefined, variant: eng.altVariant || eng.variant, recommendation: eng.recommends, pending: eng.pending, resolved: eng.resolved, known: eng.known, brevity: eng.brevity, humorMode: eng.humorMode };
    if (eng.sensitive) patch.recommendation = null;
    patch.mainKeys = eng.mainKeys;
    patch.keepLast = !eng.topic && !eng.altVariant; // команды управления («почему», «другой вариант») не затирают последний вариант содержательного ответа
    patch.releaseHold = !!eng.release;
    if (death === 'cautious') patch.hold = 'red';
  } else {
    if (!intent) intent = chooseIntent(inputF, ctx);
    if (intent && B[intent]) body = { topic: intent, ...B[intent](s, ctx) };
    else if (intent && A[intent]) body = { topic: intent, ...A[intent](s) };
    else {
      body = answer('', result, profile);
      if (ctx.sensitive.noJokes) body = { ...body, text: [t('Продолжим по делу: о чём поговорим?', 'Back to business: what shall we talk about?')] };
    }
    paras = sanitize(body.text.slice());
    if (!paras.length) paras = answer('', result, profile).text;
    const sel = session.dampened || mode === 'off' ? null : selectHumor({ input, ctx, intent, mode, history, session, catalog: o.catalog, ru: RU });
    if (sel) {
      let place = sel.placement;
      if (place === 'closing' && /\?\s*$/.test(paras[paras.length - 1] || '')) place = 'lead';
      if (place === 'inline' && paras.length < 2) place = 'lead';
      if (sel.item.id === 'pochemu_1749' && place === 'lead') paras[0] = t('А если серьёзно: ', 'Seriously: ') + (RU ? lowerFirst(paras[0]) : paras[0]);
      if (place === 'lead') paras = [sel.text, ...paras];
      else if (place === 'inline') paras.splice(1, 0, sel.text);
      else paras.push(sel.text);
      humorId = sel.item.id;
    }
    if (ctx.sensitive.noJokes) {
      const acks = NO_JOKES_ACK();
      paras = [acks[hash(String(input) + history.length) % acks.length], ...paras];
    }
    if (mem0.brevity === 'short' && !SENSITIVE_INTENTS.includes(intent) && paras.length > 2) { paras = paras.slice(0, 2); body = { ...body, fact: null }; }
    const topic = body.topic || null;
    patch = { ...patch, topic: topic || undefined, scenario: intent || undefined, known: { place: nlu.place, activity: nlu.activity } };
    if (SENSITIVE_INTENTS.includes(intent)) patch.recommendation = null;
    else if (RECOMMEND_TOPICS.has(topic)) patch.recommendation = { topic, kind: 'topic' };
    else patch.recommendation = null; // «почему?» после ответа не про рекомендацию не должно объяснять старую
  }
  // защитная пауза включается после тревожного симптома, боли или травмы (а не по одному «умираю» в шутку)
  let patchSkipHold = false;
  const newHold = releasing ? null : death === 'crisis' ? 'crisis' : death === 'red' || ctx.sensitive.symptoms ? (ctx.dizzyOnly && death !== 'red' ? 'dizzy' : 'red') : ctx.sensitive.pain ? 'pain' : ctx.sensitive.distress || ctx.guilt ? 'soft' : null;
  if (newHold === 'soft' && mem0.hold && mem0.hold.kind !== 'soft') patchSkipHold = true;
  if (newHold && !patchSkipHold) patch.hold = newHold;
  session.memory = advance(mem0, { ...patch, now: typeof o.now === 'number' ? o.now : undefined });
  // holdSet: появилась защитная пауза -> вызывающий код ставит флаг дня отдыха (markRestDay, 'rest.v1').
  // consumed: приветствие упомянуло ранг/арку -> сохранить флаги (saveRankGreeted / arcMarkGreeted), чтобы не повторять.
  const consumed = { rank: eng && eng.scenario === 'greet_rank' && o.extra && o.extra.rank ? o.extra.rank.index : null, arc: eng && /^greet_arc_/.test(eng.scenario || '') && o.extra && o.extra.arc ? o.extra.arc.id : null };
  // route: куда ушёл разбор (для оценки и отладки; UI не использует). ml — метка, если выбор сделала локальная модель.
  const route = eng ? { kind: 'engine', id: eng.scenario, control: eng.control || null, ml: eng.ml || null } : { kind: 'legacy', id: intent || null, ml: mlLabel, death };
  const out = { topic: body.topic || null, text: paras, fact: body.fact || null, next: body.next || ['today', 'train', 'sleep'], humorId, session, holdSet: patch.hold || null, consumed };
  Object.defineProperty(out, 'route', { value: route, enumerable: false }); // не часть контракта ответа
  return out;
}
