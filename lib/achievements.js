// Достижения: считаются из уже готового расчёта (ряды за 90 дней, метрики, оценки)
// и ручных записей — отдельно ничего не собирается. Каждое достижение — цель с
// прогрессом; открытые запоминаются с датой (storage), чтобы не пропадали, когда
// данные за старые дни уходят из окна, и чтобы подсвечивать новые.
import { RU } from './i18n';
import { stepGoal as goalSteps, sleepGoal } from './goals';

const t = (ru, en) => (RU ? ru : en);
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);
const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;

// Самая длинная серия дней подряд, где f(день) истинно.
function bestStreak(list, f) {
  let best = 0, cur = 0;
  for (const x of list || []) { cur = f(x) ? cur + 1 : 0; best = Math.max(best, cur); }
  return best;
}

export const SECRET_IDS = ['steps20k', 'earlyBird', 'sleepNorm30'];
const WALK_TYPES = [79]; // ExerciseSession: ходьба

export const CATEGORIES = [
  ['move', () => t('Движение', 'Movement')],
  ['sleep', () => t('Сон', 'Sleep')],
  ['train', () => t('Тренировки', 'Training')],
  ['body', () => t('Восстановление и возраст тела', 'Recovery & body age')],
  ['habit', () => t('Привычки', 'Habits')],
];

// Список: { id, cat, icon, title, desc, value, target, done }.
export function evaluate(result, profile, entries, extra = {}) {
  const se = (result && result.series) || {};
  const m = (result && result.metrics) || {};
  const sc = (result && result.scores) || {};
  const steps = se.steps || [];
  const sleep = se.sleep || [];
  const workouts = se.workouts || [];
  const stepGoal = goalSteps(result && result.chrono);
  const maxSteps = Math.max(0, ...steps.map((x) => x.v));
  const totalSteps = steps.reduce((a, x) => a + (x.v || 0), 0);
  const nights7 = sleep.filter((x) => x.v >= 7).length;
  const strength = workouts.filter((w) => [13, 70, 81].includes(w.type)).length;
  const days = new Set((entries || []).map((e) => e.date)).size;
  const norm = sc.sleep && sc.sleep.norm != null ? sc.sleep.norm : null;
  const slg = sleepGoal(norm);
  const bedNights = (() => { const b = bestStreak(sleep, (x) => x.v > 0 && x.v >= slg); return b; })();
  // Ранняя птица: подъём до 5:00 после сна не меньше нормы−0,5 и утренняя ходьба до 9:00.
  // Время подъёма есть только у последней ночи (lastNight.end); иначе — честно не открываем.
  const ln = se.lastNight;
  const early = (() => {
    if (!ln || !isFinite(ln.end)) return 0;
    const end = new Date(ln.end);
    if (end.getHours() >= 5) return 0;
    if (!(num(ln.hours) >= slg - 0.5)) return 0;
    const dayStart = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    const nine = dayStart + 9 * 3600000;
    const walk = workouts.some((w) => w && WALK_TYPES.includes(w.type) && w.start >= ln.end && w.start < nine);
    return walk || num(ln.morningSteps) >= 2000 ? 1 : 0;
  })();
  const a = [
    // Движение
    { id: 'steps10k', cat: 'move', icon: '👟', title: t('Первые 10 000', 'First 10,000'), desc: t('День, когда прошёл 10 000 шагов', 'A day with 10,000 steps'), value: maxSteps, target: 10000 },
    { id: 'stepsStreak7', cat: 'move', icon: '🔥', title: t('Неделя в движении', 'Week on the move'), desc: t(`7 дней подряд от ${stepGoal} шагов`, `7 days in a row with ${stepGoal}+ steps`), value: bestStreak(steps, (x) => x.v >= stepGoal), target: 7 },
    { id: 'stepsStreak30', cat: 'move', icon: '🌍', title: t('Месяц в движении', 'Month on the move'), desc: t(`30 дней подряд от ${stepGoal} шагов`, `30 days in a row with ${stepGoal}+ steps`), value: bestStreak(steps, (x) => x.v >= stepGoal), target: 30 },
    { id: 'steps700k', cat: 'move', icon: '🗺️', title: t('Дальний путь', 'Long road'), desc: t('700 000 шагов за 3 месяца', '700,000 steps in 3 months'), value: totalSteps, target: 700000 },
    { id: 'who150', cat: 'move', icon: '🎯', title: t('Норма ВОЗ', 'WHO target'), desc: t('150+ активных минут за неделю', '150+ active minutes in a week'), value: live(m.activeMinutes && m.activeMinutes[7]) ? m.activeMinutes[7].value : 0, target: 150 },
    // Сон
    { id: 'sleep7', cat: 'sleep', icon: '🌙', title: t('Выспался', 'Well rested'), desc: t('Ночь сна от 7 часов', 'A night of 7+ hours'), value: nights7 ? 1 : 0, target: 1 },
    { id: 'sleepStreak7', cat: 'sleep', icon: '😴', title: t('Неделя сна', 'Week of sleep'), desc: t('7 ночей подряд от 7 часов', '7 nights in a row of 7+ hours'), value: bestStreak(sleep, (x) => x.v >= 7), target: 7 },
    { id: 'sleep30', cat: 'sleep', icon: '🛌', title: t('Мастер сна', 'Sleep master'), desc: t('30 ночей от 7 часов', '30 nights of 7+ hours'), value: nights7, target: 30 },
    { id: 'sri80', cat: 'sleep', icon: '⏰', title: t('Режим', 'On schedule'), desc: t('Регулярность сна от 80 из 100 за 2 недели', 'Sleep regularity of 80+ over 2 weeks'), value: m.sleepRegularity && live(m.sleepRegularity[14]) ? Math.round(m.sleepRegularity[14].value) : 0, target: 80 },
    // Тренировки
    { id: 'workout1', cat: 'train', icon: '🏃', title: t('Первый шаг', 'First step'), desc: t('Первая тренировка', 'Your first workout'), value: workouts.length, target: 1 },
    { id: 'workout10', cat: 'train', icon: '💪', title: t('Втянулся', 'Getting into it'), desc: t('10 тренировок', '10 workouts'), value: workouts.length, target: 10 },
    { id: 'workout50', cat: 'train', icon: '🏆', title: t('Стабильность', 'Consistency'), desc: t('50 тренировок', '50 workouts'), value: workouts.length, target: 50 },
    { id: 'strength8', cat: 'train', icon: '🏋️', title: t('Сила', 'Strength'), desc: t('8 силовых тренировок', '8 strength workouts'), value: strength, target: 8 },
    // Восстановление и возраст тела
    { id: 'ready85', cat: 'body', icon: '⚡', title: t('В ресурсе', 'Fully charged'), desc: t('Готовность от 85', 'Readiness of 85+'), value: sc.readiness && sc.readiness.status === 'ok' ? sc.readiness.score : 0, target: 85 },
    { id: 'hrvUp', cat: 'body', icon: '🫀', title: t('Сердце в форме', 'Heart in shape'), desc: t('HRV на 10% выше твоей нормы', 'HRV 10% above your baseline'), value: sc.recovery && sc.recovery.hrvDev != null ? Math.max(0, Math.round(sc.recovery.hrvDev)) : 0, target: 10 },
    { id: 'younger', cat: 'body', icon: '🧬', title: t('Моложе паспорта', 'Younger than your years'), desc: t('Возраст тела ниже паспортного', 'Body age below your actual age'), value: result && result.bio < result.chrono ? 1 : 0, target: 1 },
    { id: 'younger3', cat: 'body', icon: '✨', title: t('Минус три', 'Minus three'), desc: t('Возраст тела на 3 года ниже паспортного', 'Body age 3 years below your actual age'), value: result ? Math.max(0, Math.round((result.chrono - result.bio) * 10) / 10) : 0, target: 3 },
    { id: 'pace', cat: 'body', icon: '⏳', title: t('Время на твоей стороне', 'Time on your side'), desc: t('Темп за 30 дней ниже 1×', '30-day pace below 1×'), value: result && result.pace != null && result.pace < 1 ? 1 : 0, target: 1 },
    // Привычки
    { id: 'log1', cat: 'habit', icon: '📝', title: t('Первая запись', 'First entry'), desc: t('Записать что-то вручную', 'Log something manually'), value: (entries || []).length, target: 1 },
    { id: 'log7', cat: 'habit', icon: '📒', title: t('Дневник', 'Diary'), desc: t('Записи в 7 разных дней', 'Entries on 7 different days'), value: days, target: 7 },
    { id: 'import', cat: 'habit', icon: '📥', title: t('Переезд', 'Moving in'), desc: t('Импортировать данные из файла', 'Import data from a file'), value: extra.imported ? 1 : 0, target: 1 },
    // Секретные (скрыты до открытия)
    { id: 'steps20k', cat: 'move', secret: true, hidden: true, icon: '🏔️', title: t('Двадцатка', 'The Twenty'), desc: t('Двадцать тысяч шагов за один день. Это была большая дорога', 'Twenty thousand steps in a single day. That was a long road'), value: maxSteps, target: 20000 },
    { id: 'earlyBird', cat: 'habit', secret: true, hidden: true, icon: '🌅', title: t('Ранняя птица', 'Early bird'), desc: t('Встал(а) до рассвета и вышел(а) в утро', 'Up before dawn and out into the morning'), value: early, target: 1 },
    { id: 'sleepNorm30', cat: 'sleep', secret: true, hidden: true, icon: '🌌', title: t('Тридцать ночей', 'Thirty nights'), desc: t('Месяц ровного сна: каждая ночь в пределах твоей нормы', 'A month of steady sleep: every night within your norm'), value: bedNights, target: 30 },
  ];
  if (profile && profile.sex === 'f' && profile.showCycle && result && result.cycle) {
    a.push({ id: 'cycle3', cat: 'habit', icon: '🌸', title: t('Знаю свой цикл', 'I know my cycle'), desc: t('Отмечено 3 цикла', '3 cycles logged'), value: result.cycle.periods.length, target: 3 });
  }
  return a.map((x) => ({ ...x, done: x.value >= x.target }));
}

// Объединить с сохранёнными открытиями: открытое раньше остаётся открытым.
// Возвращает { list, unlocked: { id: время }, fresh: [id новых] }.
export function withUnlocks(list, saved, now = Date.now()) {
  const unlocked = { ...(saved || {}) };
  const fresh = [];
  for (const x of list) {
    if (x.done && !unlocked[x.id]) { unlocked[x.id] = now; fresh.push(x.id); }
  }
  return {
    list: list.map((x) => {
      const done = x.done || !!unlocked[x.id];
      const base = { ...x, done, at: unlocked[x.id] || null };
      // скрытые до открытия: без условий и прогресса
      return x.hidden && !done ? { ...base, title: '???', desc: '???', icon: '❓', value: 0 } : base;
    }),
    unlocked,
    fresh,
  };
}

export const NEW_MS = 3 * 86400000; // «новое» — первые 3 дня после открытия
