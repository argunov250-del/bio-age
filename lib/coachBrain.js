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

const t = (ru, en) => (RU ? ru : en);
const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;
const val = (m, k, w) => (m && m[k] && live(m[k][w]) ? m[k][w].value : null);

// Погода за окном (если включена в профиле) — для советов про прогулки и тренировки.
let WEATHER = null;
export const setCoachWeather = (w) => { WEATHER = w; };

function weatherLine() {
  const w = WEATHER;
  if (!w) return null;
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
  s.stepGoal = s.age != null && s.age >= 60 ? 7000 : 8000;
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

function greet(s) {
  return s.hour < 5 ? t('Доброй ночи.', 'Good night.') : s.hour < 12 ? t('Доброе утро!', 'Good morning!')
    : s.hour < 18 ? t('Добрый день!', 'Good afternoon!') : t('Добрый вечер!', 'Good evening!');
}

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
  ['sleep', ['сон', 'сна', 'спат', 'сплю', 'засып', 'бессон', 'просып', 'ночь', 'sleep', 'insomn', 'nap', 'bed']],
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
  const q = String(text || '').toLowerCase();
  let best = null;
  let bestN = 0;
  for (const [id, words] of KEYWORDS) {
    const n = words.filter((w) => q.includes(w)).length;
    if (n > bestN) { best = id; bestN = n; }
  }
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
    out.push(t('Пока мало данных, чтобы оценить восстановление, — начну с простого.', "There's not enough data yet to judge recovery, so let's keep it simple."));
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
  const tips = [];
  if (s.sleep7 != null && s.sleep7 < 7) tips.push(t('ложись на 30–45 минут раньше — недобор за неделю около ', 'go to bed 30–45 minutes earlier — this week you are short about ') + hoursMin(s.sleepDebt));
  if (s.sri != null && s.sri < 75) tips.push(t('вставай в одно и то же время даже в выходные — это главный якорь режима', 'wake at the same time even on weekends — it anchors your rhythm'));
  tips.push(t('последний кофе — до 14:00', 'last coffee before 2 pm'));
  tips.push(t('утром 10–20 минут дневного света, вечером — приглушённый', '10–20 minutes of daylight in the morning, dim light in the evening'));
  if (s.nightHrDiff != null && s.nightHrDiff > 3) tips.push(t('ночной пульс повышен — поздний ужин и алкоголь вечером его поднимают', 'night HR is up — late dinners and evening alcohol raise it'));
  if (s.phase === 'luteal' || s.phase === 'late') tips.unshift(t('сейчас лютеиновая фаза: тело теплее, поэтому спальня попрохладнее и лёгкое одеяло помогут спать глубже', 'you are in the luteal phase: your body runs warmer, so a cooler bedroom and lighter blanket help'));
  tips.push(t('прохладная тёмная спальня и телефон вне кровати', 'a cool dark bedroom and the phone away from bed'));
  out.push(t('Что поможет: ', 'What helps: ') + tips.slice(0, 4).join('; ') + '.');
  const fact = s.phase === 'luteal' ? FACTS.lutealSleep : s.sri != null && s.sri < 75 ? FACTS.sleepRegularity : s.nightHrDiff != null && s.nightHrDiff > 3 ? FACTS.alcohol : pick([FACTS.caffeine, FACTS.morningLight, FACTS.sleepNeed], 3);
  return { text: out, fact, next: ['stress', 'today', 'heart'] };
};

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
