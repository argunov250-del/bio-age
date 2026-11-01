// Советы на сегодня — набор правил (без ИИ и без внешних сервисов) поверх уже
// посчитанных данных Health Connect. Каждое правило проверяет свои условия и, если
// сработало, объясняет почему: какие цифры к этому привели и что можно сделать.
// Тон — простой и поддерживающий. Без диагнозов, назначений, запугивания и обещаний.
import { RU } from './i18n';
import { fmt } from './format';
import { hoursMin } from './time';

const t = (ru, en) => (RU ? ru : en);
const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;
const pct = (x) => (x > 0 ? '+' : '') + fmt(x) + '%';

// Всё, что нужно правилам, из сохранённого расчёта и профиля.
function context(result, profile) {
  const sc = result.scores || null;
  const m = result.metrics || null;
  const p = profile || {};
  return {
    sc, m,
    sleep: sc && sc.sleep.status === 'ok' ? sc.sleep : null,
    readiness: sc && sc.readiness.status === 'ok' ? sc.readiness : null,
    recovery: sc ? sc.recovery : null,
    load: sc ? sc.load : null,
    activity: sc && sc.activity.status === 'ok' ? sc.activity : null,
    steps7: m && live(m.steps[7]) ? m.steps[7].value : null,
    steps30: m && live(m.steps[30]) ? m.steps[30].value : null,
    active7: m && live(m.activeMinutes[7]) ? m.activeMinutes[7].value : null,
    workouts7: m && m.exercise[7].status === 'ok' ? m.exercise[7].value : null,
    // Тренировки вообще записываются (за 90 дней были) — иначе совет «не было тренировок» бессмысленен.
    workoutsRecorded: !!(m && m.exercise[90].status === 'ok' && m.exercise[90].value > 0),
    sri14: m && m.sleepRegularity[14].status === 'ok' ? m.sleepRegularity[14].value : null,
    stress: p.lifestyle && p.lifestyle.stress,
    goal: p.goal || null,
  };
}

// Правила: priority — чем больше, тем важнее (сначала бережные советы, потом нагрузочные).
// kind: 'rest' — бережные, 'push' — про нагрузку; если сработал бережный, нагрузочные не показываем.
// goal — для какой цели профиля совет особенно уместен (небольшой приоритет сверху).
const RULES = [
  {
    id: 'sleep_short', kind: 'rest', priority: 90, goal: 'sleep', get area() { return t('Сон', 'Sleep'); },
    when: (c) => c.sleep && c.sleep.norm && c.sleep.hours < c.sleep.norm - 0.75,
    make: (c) => ({
      title: t('Сон ниже твоей обычной нормы — сегодня лучше выбрать спокойную активность.', 'Sleep was below your usual — choose something calm today.'),
      why: [
        t('Прошлой ночью: ', 'Last night: ') + hoursMin(c.sleep.hours),
        t('Твоя обычная норма: ', 'Your usual: ') + hoursMin(c.sleep.norm) + t(' (медиана за 30 дней)', ' (30-day median)'),
        t('Разница: ', 'Difference: ') + hoursMin(c.sleep.norm - c.sleep.hours),
      ],
      actions: [
        t('Выбери прогулку, растяжку или лёгкую тренировку', 'Pick a walk, stretching or an easy workout'),
        t('Если хочется вздремнуть — не дольше 20 минут и до 15:00', 'If you nap, keep it under 20 minutes and before 3 pm'),
        t('Сегодня ляг на 30–45 минут раньше обычного', 'Go to bed 30–45 minutes earlier tonight'),
      ],
    }),
  },
  {
    id: 'readiness_low', kind: 'rest', priority: 85, get area() { return t('Готовность', 'Readiness'); },
    when: (c) => c.readiness && c.readiness.score < 40,
    make: (c) => ({
      title: t('Восстановление может быть неполным — подойдёт прогулка, растяжка или лёгкая тренировка.', 'Recovery may be incomplete — a walk, stretching or an easy workout fits well.'),
      why: [t('Готовность: ', 'Readiness: ') + c.readiness.score + ' / 100' + t(' (низкая)', ' (low)')].concat(recoveryFacts(c)),
      actions: [
        t('Сделай день лёгким: прогулка 20–40 минут в спокойном темпе', 'Keep the day light: a 20–40 minute easy walk'),
        t('Пей достаточно воды и поешь вовремя', 'Drink enough water and eat on time'),
        t('Тяжёлую тренировку лучше перенести на завтра', 'Move a hard workout to tomorrow'),
      ],
    }),
  },
  {
    id: 'hrv_low', kind: 'rest', priority: 80, area: 'HRV',
    when: (c) => c.recovery && c.recovery.hrvDev != null && c.recovery.hrvDev <= -15,
    make: (c) => ({
      title: t('HRV ниже твоей обычной нормы — организму сегодня может пригодиться передышка.', 'HRV is below your usual — your body may welcome a lighter day.'),
      why: [
        t('HRV к твоей норме: ', 'HRV vs your baseline: ') + pct(c.recovery.hrvDev),
        t('Сравниваем только с твоими же значениями за 30–60 дней.', 'Compared only with your own values over 30–60 days.'),
        t('Так бывает при недосыпе, стрессе, высокой нагрузке или если организм с чем-то борется.', 'This happens with short sleep, stress, high load, or when your body is fighting something off.'),
      ],
      actions: [
        t('Лёгкая активность вместо интенсивной', 'Light activity instead of intense'),
        t('5 минут спокойного дыхания: вдох на 4 счёта, выдох на 6', '5 minutes of calm breathing: in for 4, out for 6'),
        t('Сегодня без алкоголя и поздних тяжёлых ужинов', 'Skip alcohol and heavy late meals tonight'),
      ],
    }),
  },
  {
    id: 'load_high', kind: 'rest', priority: 75, get area() { return t('Нагрузка', 'Load'); },
    when: (c) => c.load && c.load.ratio != null && c.load.ratio > 1.5,
    make: (c) => ({
      title: t('Последние дни были нагруженными — дай организму время восстановиться.', 'The last few days were demanding — give your body time to recover.'),
      why: [
        t('Нагрузка за 2 дня в ', 'Load over 2 days is ') + fmt(c.load.ratio, 1) + t(' раза выше твоей обычной', '× your usual'),
        t('Нагрузка считается по пульсу: минуты в зонах 1–5 с учётом интенсивности.', 'Load is based on heart rate: minutes in zones 1–5 weighted by intensity.'),
      ],
      actions: [
        t('Сегодня — день восстановления: прогулка, растяжка, мобильность', 'Make today a recovery day: walk, stretching, mobility'),
        t('Следующую интенсивную тренировку — через 1–2 дня', 'Plan the next hard session in 1–2 days'),
      ],
    }),
  },
  {
    id: 'night_hr_high', kind: 'rest', priority: 70, get area() { return t('Ночной пульс', 'Night heart rate'); },
    when: (c) => c.recovery && c.recovery.nightHrDiff != null && c.recovery.nightHrDiff >= 4,
    make: (c) => ({
      title: t('Ночной пульс выше обычного — сегодня лучше не перегружаться.', 'Night heart rate was higher than usual — take it easier today.'),
      why: [
        t('Ночной пульс: ', 'Night heart rate: ') + fmt(c.recovery.nightHrLast) + t(' уд/мин', ' bpm'),
        t('Обычно у тебя: ', 'Your usual: ') + fmt(c.sc.norms.nightHr) + t(' уд/мин', ' bpm') + ' (+' + fmt(c.recovery.nightHrDiff) + ')',
        t('Так бывает после алкоголя, позднего ужина, стресса, тяжёлой тренировки или недосыпа.', 'This happens after alcohol, a late meal, stress, a hard workout or short sleep.'),
      ],
      actions: [
        t('Умеренная нагрузка вместо тяжёлой', 'Moderate instead of hard training'),
        t('Последний приём пищи — за 2–3 часа до сна', 'Finish eating 2–3 hours before bed'),
      ],
    }),
  },
  {
    id: 'readiness_high', kind: 'push', priority: 50, goal: 'endurance', get area() { return t('Готовность', 'Readiness'); },
    when: (c) => c.readiness && c.readiness.score >= 70 && !(c.load && c.load.ratio > 1.5),
    make: (c) => ({
      title: t('Ты хорошо восстановился — можно запланировать более интенсивную тренировку.', "You've recovered well — a harder workout is a good option."),
      why: [t('Готовность: ', 'Readiness: ') + c.readiness.score + ' / 100' + t(' (высокая)', ' (high)')].concat(recoveryFacts(c)),
      actions: [
        t('Подойдёт интервальная тренировка или длинная кардиосессия', 'Intervals or a longer cardio session fit well'),
        t('Не забудь разминку 10 минут и заминку', "Don't skip a 10-minute warm-up and cool-down"),
      ],
    }),
  },
  {
    id: 'activity_drop', priority: 45, goal: 'weight', get area() { return t('Активность', 'Activity'); },
    when: (c) => c.steps7 != null && c.steps30 != null && c.steps7 < c.steps30 * 0.75,
    make: (c) => ({
      title: t('Активность за неделю ниже обычной — попробуй добавить короткую прогулку.', "This week's activity is below usual — try adding a short walk."),
      why: [
        t('Шаги за 7 дней: ', 'Steps, 7 days: ') + fmt(c.steps7) + t(' в день', ' a day'),
        t('Обычно за 30 дней: ', 'Usual, 30 days: ') + fmt(c.steps30) + t(' в день', ' a day'),
      ],
      actions: [
        t('Прогулка 15–20 минут после еды', 'A 15–20 minute walk after a meal'),
        t('Лестница вместо лифта, звонки — на ходу', 'Stairs instead of the lift, calls on the move'),
        t('Не пытайся наверстать всё одной тяжёлой тренировкой', "Don't try to make up for it with one hard workout"),
      ],
    }),
  },
  {
    id: 'active_low', priority: 40, goal: 'health', get area() { return t('Активные минуты', 'Active minutes'); },
    when: (c) => c.active7 != null && c.active7 < 150,
    make: (c) => ({
      title: t('Активных минут за неделю пока меньше 150 — добавь пару бодрых прогулок.', 'Fewer than 150 active minutes this week — add a couple of brisk walks.'),
      why: [
        t('Активные минуты за 7 дней: ', 'Active minutes, 7 days: ') + fmt(c.active7),
        t('Ориентир ВОЗ — от 150 минут умеренной нагрузки в неделю.', 'The WHO guideline is 150+ minutes of moderate activity a week.'),
      ],
      actions: [
        t('2 прогулки по 15 минут в быстром темпе', 'Two 15-minute brisk walks'),
        t('Велосипед или плавание в выходные', 'Cycling or swimming on the weekend'),
      ],
    }),
  },
  {
    id: 'sleep_irregular', priority: 35, goal: 'sleep', get area() { return t('Регулярность сна', 'Sleep regularity'); },
    when: (c) => c.sri14 != null && c.sri14 < 60,
    make: (c) => ({
      title: t('Режим сна плавает — попробуй ложиться и вставать в одно время.', 'Your sleep schedule varies — try a consistent bed and wake time.'),
      why: [
        t('Регулярность сна за 14 дней: ', 'Sleep regularity, 14 days: ') + fmt(c.sri14) + ' / 100',
        t('Регулярность показывает, насколько похожи время отхода ко сну и подъёма в разные дни.', 'Regularity shows how similar your bed and wake times are from day to day.'),
      ],
      actions: [
        t('Выбери время подъёма и держи его даже в выходные (±30 минут)', 'Pick a wake time and keep it on weekends too (±30 min)'),
        t('Утром — дневной свет в первые полчаса', 'Get daylight within the first half hour after waking'),
      ],
    }),
  },
  {
    id: 'no_workouts', kind: 'push', priority: 30, goal: 'strength', get area() { return t('Тренировки', 'Workouts'); },
    when: (c) => c.workouts7 === 0 && c.workoutsRecorded && !(c.readiness && c.readiness.score < 40),
    make: () => ({
      title: t('За неделю не было тренировок — даже 20 минут сегодня уже хороший шаг.', 'No workouts this week — even 20 minutes today is a good step.'),
      why: [t('Тренировок за 7 дней: 0', 'Workouts in 7 days: 0')],
      actions: [
        t('20 минут: приседания, отжимания, планка — по 3 подхода', '20 minutes: squats, push-ups, plank — 3 rounds'),
        t('Или быстрая прогулка с подъёмами в горку', 'Or a brisk walk with some hills'),
      ],
    }),
  },
  {
    id: 'stress_high', priority: 25, goal: 'energy', get area() { return t('Стресс', 'Stress'); },
    when: (c) => c.stress >= 7,
    make: (c) => ({
      title: t('В профиле указан высокий стресс — найди сегодня 10 минут на себя.', 'Your profile shows high stress — find 10 minutes for yourself today.'),
      why: [t('Стресс в профиле: ', 'Stress in your profile: ') + c.stress + ' / 10'],
      actions: [
        t('Прогулка без телефона', 'A walk without your phone'),
        t('Медленное дыхание 5 минут перед сном', '5 minutes of slow breathing before bed'),
      ],
    }),
  },
  {
    id: 'no_sleep_data', priority: 15, get area() { return t('Сон', 'Sleep'); },
    when: (c) => !c.sleep,
    make: () => ({
      title: t('Нет данных о сне — запиши сон вручную, и советы станут точнее.', 'No sleep data — log your sleep manually and the tips will get more accurate.'),
      why: [t('Сон, ночной пульс и HRV — основа оценок «Готовность» и «Восстановление».', 'Sleep, night heart rate and HRV drive the Readiness and Recovery scores.')],
      actions: [
        t('Запиши, во сколько лёг и встал: «Записать вручную» → «Сон»', 'Log when you went to bed and got up: Log manually → Sleep'),
        t('Или подключи приложение, которое записывает сон, через Health Connect', 'Or connect an app that records sleep via Health Connect'),
      ],
    }),
  },
  {
    id: 'good_sleep', kind: 'push', priority: 20, get area() { return t('Сон', 'Sleep'); },
    when: (c) => c.sleep && c.sleep.score >= 80,
    make: (c) => ({
      title: t('Отличный сон — хорошая основа для активного дня.', 'Great sleep — a good base for an active day.'),
      why: [t('Оценка сна: ', 'Sleep score: ') + c.sleep.score + ' / 100', t('Длительность: ', 'Duration: ') + hoursMin(c.sleep.hours)],
      actions: [t('Сохрани тот же режим сегодня вечером', 'Keep the same routine tonight')],
    }),
  },
];

function recoveryFacts(c) {
  const out = [];
  const r = c.recovery;
  if (r && r.hrvDev != null) out.push(t('HRV к твоей норме: ', 'HRV vs your baseline: ') + pct(r.hrvDev));
  if (r && r.nightHrDiff != null) out.push(t('Ночной пульс к норме: ', 'Night heart rate vs usual: ') + (r.nightHrDiff > 0 ? '+' : '') + fmt(r.nightHrDiff) + t(' уд/мин', ' bpm'));
  if (c.sleep) out.push(t('Сон: ', 'Sleep: ') + hoursMin(c.sleep.hours) + ' · ' + c.sleep.score + ' / 100');
  if (c.load && c.load.level) out.push(t('Нагрузка за 2 дня: ', 'Load, 2 days: ') + t({ high: 'выше обычной', normal: 'обычная', low: 'ниже обычной' }[c.load.level], { high: 'above usual', normal: 'usual', low: 'below usual' }[c.load.level]));
  return out;
}

const noData = () => ({
  id: 'no_data', area: t('Данные', 'Data'),
  title: t('Данных пока мало — добавь записи, чтобы приложение точнее оценило твою норму.', 'Not much data yet — add some entries so the app can learn your baseline.'),
  why: [t('Для советов нужны сон, шаги или пульс хотя бы за несколько дней — из Health Connect или записанные вручную.', 'Tips need sleep, steps or heart rate for at least a few days — from Health Connect or logged manually.')],
  actions: [
    t('Запиши сон, шаги или тренировку вручную', 'Log sleep, steps or a workout manually'),
    t('Или подключи другие приложения и устройства через Health Connect', 'Or connect other apps and devices via Health Connect'),
  ],
});

const steady = () => ({
  id: 'steady', area: t('Общее', 'Overall'),
  title: t('Хороший ритм — продолжай в том же духе и не забывай про сон.', "Good rhythm — keep it up and don't forget about sleep."),
  why: [t('Ни одно из правил не нашло, на что стоит обратить внимание сегодня.', 'None of the rules found anything that needs attention today.')],
  actions: [t('Обычная активность и привычный режим сна', 'Your usual activity and sleep routine')],
});

// { main, others[], basedOn } — главный совет и ещё до трёх сработавших правил.
export function recommend(result, profile) {
  if (!result) return { main: noData(), others: [], basedOn: null };
  const c = context(result, profile);
  if (!c.sc || (!c.sleep && !c.readiness && !c.activity)) {
    return { main: noData(), others: [], basedOn: result.computedAt || null };
  }
  const fired = RULES
    .filter((r) => { try { return !!r.when(c); } catch (e) { return false; } })
    .map((r) => ({ id: r.id, kind: r.kind, area: r.area, score: r.priority + (c.goal && r.goal === c.goal ? 8 : 0), ...r.make(c) }))
    .sort((a, b) => b.score - a.score);
  const rest = fired.some((x) => x.kind === 'rest');
  const shown = rest ? fired.filter((x) => x.kind !== 'push') : fired;
  return {
    main: shown[0] || steady(),
    others: shown.slice(1, 4),
    basedOn: result.computedAt || null,
  };
}

export const RULE_COUNT = RULES.length;
