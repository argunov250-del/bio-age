// Содержимое подробных экранов. Каждый строитель получает сохранённый расчёт и возвращает
// описание экрана: главное значение, цифры, график, разделы и простые объяснения.
// Нет данных — так и пишем; ничего не подставляем.
import { tr, RU } from './i18n';
import { fmt, signed, METRIC_INFO } from './format';
import { hoursMin, clock, shortDate, ago } from './time';
import { MASS, TEMP, unitsOf } from './units';
import { trendOf, level } from './scores';
import { workoutName } from './workouts';
import { mean } from './metrics';
import { isNum } from './num';
import { stepGoal } from './goals';

const TREND_TEXT = { better: 'улучшается', stable: 'стабильно', attention: 'требует внимания' };
export const trendText = (t) => (t ? tr(TREND_TEXT[t]) : tr('мало данных'));
const LEVEL_TEXT = { high: 'высокая', medium: 'средняя', low: 'низкая' };
const avgLast = (series, n) => {
  const v = (series || []).slice(-n).map((x) => x.v).filter((x) => x > 0);
  return v.length ? mean(v) : null;
};
const okv = (m) => (m && (m.status === 'ok' || m.status === 'insufficient') ? m.value : null);
const or = (v, f) => (v == null || (typeof v === 'number' && !isNum(v)) ? '—' : f(v));
const FEW = 'Данных пока мало — добавь записи вручную или подключи источник в Health Connect, чтобы приложение точнее оценило твою норму.';

// Группы Lifestyle Age для раздела «что повлияло».
const GROUPS = [
  ['Сон', ['sleepDuration', 'sleepRegularity']],
  ['Активность', ['steps', 'zones13', 'zones45', 'strength']],
  ['Восстановление', ['restingHr']],
  ['Сердечно-сосудистая форма', ['vo2max', 'leanMass']],
];

const B = {};

B.lifestyleAge = (r) => {
  const groups = GROUPS.map(([name, keys]) => {
    const items = keys.filter((k) => r.corr180.items[k]);
    return { label: tr(name), value: items.length ? signed(items.reduce((a, k) => a + r.corr180.items[k].years, 0), 1) + ' ' + tr('лет') : tr('нет данных') };
  });
  return {
    title: tr('Возраст тела'),
    hero: { value: fmt(r.bio, 1) },
    stats: [
      { label: tr('Паспортный возраст'), value: fmt(r.chrono, 1) },
      { label: tr('Разница'), value: signed(r.bio - r.chrono, 1) + ' ' + tr('лет'), good: r.bio <= r.chrono },
      { label: tr('Темп старения, 30 дней'), value: r.pace == null ? tr('мало данных') : fmt(r.pace, 2) + '×' },
      { label: tr('Пересчитан'), value: r.computedAt ? ago(Date.parse(r.computedAt)) : '—' },
    ],
    chart: { kind: 'line', points: (r.trend || []).map((p) => ({ t: p.t, v: p.v })), fixed: tr('Динамика за 6 месяцев'), ref: { value: r.chrono, label: tr('паспортный') + ' ' + Math.round(r.chrono) } },
    sections: [
      { title: tr('Что повлияло (вклад в годах)'), rows: groups },
      r.advice && r.advice.length ? { title: tr('Что можно улучшить'), tip: tr('Я бы обратил внимание на это:'), list: r.advice.map((a) => METRIC_INFO[a.key].name() + ': ' + a.text) } : null,
    ],
    explain: [
      tr('Возраст тела показывает, как сон, активность, восстановление и форма влияют на твоё состояние: чем он ниже паспортного, тем лучше.'),
      tr('Это не медицинский биологический возраст и не диагноз.'),
    ],
  };
};

function scoreHero(s, unit = '') {
  if (!s || s.status !== 'ok') return { value: '—', sub: s && s.status === 'insufficient' ? tr('нужно больше данных') : tr('нет данных') };
  return { value: String(s.score) + unit, sub: s.partial ? tr('неполная оценка: не все данные есть') : null, score: s.score };
}

B.readiness = (r) => {
  const sc = r.scores, rd = sc.readiness, rc = sc.recovery;
  const lv = rd.level;
  return {
    title: tr('Готовность'),
    hero: { ...scoreHero(rd), label: lv ? tr('Готовность ') + tr(LEVEL_TEXT[lv]) : null },
    stats: hrvNightSleepStats(sc).concat([
      { label: tr('Нагрузка за последние дни'), value: sc.load.level ? tr({ high: 'выше обычной', normal: 'обычная', low: 'ниже обычной' }[sc.load.level]) : tr('нет данных') },
    ]),
    chart: { kind: 'line', points: [] },
    sections: [
      { title: tr('Рекомендация на сегодня'), tip: tr('Смотрю на твои цифры и вижу так:'), text: lv === 'high' ? tr('Организм выглядит отдохнувшим, можно планировать обычную или более интенсивную тренировку.')
        : lv === 'medium' ? tr('Средняя готовность. Подойдёт умеренная нагрузка.')
          : lv === 'low' ? tr('Восстановление может быть неполным. Лучше выбрать прогулку, растяжку или лёгкую тренировку.')
            : tr(FEW) },
      rc.missing && rc.missing.length ? { title: tr('Чего не хватает'), list: rc.missing.map((k) => tr({ hrv: 'HRV (вариабельность пульса) — нужен источник HRV в Health Connect', nightHr: 'Пульс во сне — нужны пульс и сон в Health Connect', sleep: 'Сон за последнюю ночь — можно записать вручную' }[k])) } : null,
    ],
    explain: [
      tr('Готовность складывается из восстановления (HRV, ночной пульс, сон) и нагрузки последних дней.'),
      tr('Готовность не является медицинским показателем и не запрещает тренировку.'),
    ],
  };
};

function hrvNightSleepStats(sc) {
  const rc = sc.recovery, n = sc.norms;
  return [
    { label: tr('HRV к твоей норме'), value: rc.hrvDev != null ? signed(rc.hrvDev, 0) + '%' : tr('нет данных'), good: rc.hrvDev != null ? rc.hrvDev >= -5 : null },
    { label: tr('Ночной пульс'), value: rc.nightHrLast != null ? fmt(rc.nightHrLast) + (n.nightHr ? ' (' + tr('норма ') + fmt(n.nightHr) + ')' : '') : tr('нет данных'), good: rc.nightHrDiff != null ? rc.nightHrDiff <= 2 : null },
    { label: tr('Сон за последнюю ночь'), value: sc.sleep.status === 'ok' ? hoursMin(sc.sleep.hours) : tr('нет данных') },
    { label: tr('Качество сна'), value: sc.sleep.status === 'ok' ? sc.sleep.score + ' / 100' : tr('нет данных') },
  ];
}

B.recovery = (r) => {
  const sc = r.scores;
  return {
    title: tr('Восстановление'),
    hero: scoreHero(sc.recovery),
    stats: hrvNightSleepStats(sc).concat([
      { label: tr('Нагрузка за 7 дней'), value: sc.load.week ? fmt(sc.load.week) + (sc.load.weekUsual ? ' (' + tr('обычно ') + fmt(sc.load.weekUsual) + ')' : '') : tr('нет данных') },
    ]),
    chart: { kind: 'line', daily: r.series.nightHr, better: 'down', label: tr('Ночной пульс'), color: 'heart', ref: sc.norms.nightHr ? { value: sc.norms.nightHr, label: tr('норма') + ' ' + fmt(sc.norms.nightHr) + ' ' + tr('уд/мин') } : null },
    sections: sc.recovery.missing && sc.recovery.missing.length ? [{ title: tr('Чего не хватает'), text: tr(FEW) }] : [],
    explain: [
      tr('Восстановление показывает, насколько организм отдохнул после нагрузки и стресса.'),
      tr('Ночной пульс обычно ниже дневного. Его повышение относительно твоей нормы может говорить о недовосстановлении.'),
      tr('Нагрузка учитывает недавние тренировки и активность.'),
    ],
  };
};

B.sleep = (r) => {
  const sl = r.scores.sleep, s = r.series;
  const st = sl.night && sl.night.stages;
  const total = st ? st.deep + st.rem + st.light + st.awake : 0;
  const stageRow = (k, name) => ({ label: tr(name), value: st ? hoursMin(st[k] / 60) + ' · ' + fmt((st[k] / total) * 100) + '%' : tr('нет данных') });
  return {
    title: tr('Сон'),
    hero: { ...scoreHero(sl), label: tr('Оценка сна за ночь') },
    stats: [
      { label: tr('Длительность'), value: sl.status === 'ok' ? hoursMin(sl.hours) : tr('нет данных') },
      { label: tr('Засыпание и пробуждение'), value: sl.night ? clock(sl.night.start) + ' – ' + clock(sl.night.end) : '—' },
      { label: tr('Средний сон за 7 дней'), value: or(avgLast(s.sleep, 7), hoursMin) },
      { label: tr('Средний сон за 30 дней'), value: or(avgLast(s.sleep, 30), hoursMin) },
      { label: tr('Твоя норма'), value: or(sl.norm, hoursMin) },
      { label: tr('Регулярность за 14 дней'), value: or(sl.sri14, (v) => fmt(v) + ' / 100') },
      { label: tr('Тренд за 30 дней'), value: trendText(trendOf(s.sleep, 'up')) },
    ],
    chart: { kind: 'bar', daily: s.sleep, color: 'sleep', ref: sl.norm ? { value: sl.norm, label: tr('норма') + ' ' + hoursMin(sl.norm) } : { value: 7, label: tr('цель') + ' ' + hoursMin(7) } },
    sections: [
      { title: tr('Стадии сна'), rows: [stageRow('deep', 'Глубокий сон'), stageRow('rem', 'REM-сон'), stageRow('light', 'Лёгкий сон'), stageRow('awake', 'Без сна / пробуждения')] },
      { title: tr('Что значат стадии'), list: [
        tr('Глубокий сон помогает физическому восстановлению, мышцам и иммунитету.'),
        tr('REM-сон важен для памяти, обучения и эмоционального восстановления.'),
        tr('Лёгкий сон — обычная часть ночного сна, из него человек чаще просыпается.'),
        tr('Короткие пробуждения ночью нормальны. Важно, сколько времени ты бодрствуешь после пробуждения.'),
        tr('Регулярность показывает, насколько похожи время отхода ко сну и подъёма в разные дни.'),
      ] },
    ],
    improve: [
      tr('Ложиться и вставать примерно в одно время'),
      tr('Избегать яркого света и телефона перед сном'),
      tr('Не пить кофеин поздно вечером'),
      tr('Делать тренировки не слишком поздно вечером'),
      tr('Создавать спокойную обстановку перед сном'),
    ],
    few: sl.status !== 'ok' || sl.partial,
  };
};

B.activity = (r) => {
  const s = r.series, m = r.metrics, ac = r.scores.activity;
  const today = s.steps.length ? s.steps[s.steps.length - 1].v : null;
  return {
    title: tr('Активность'),
    hero: { ...scoreHero(ac), label: tr('Оценка активности за 7 дней') },
    stats: [
      { label: tr('Шаги сегодня'), value: or(today || null, fmt) },
      { label: tr('Средние шаги за 7 дней'), value: or(avgLast(s.steps, 7), fmt) },
      { label: tr('Средние шаги за 30 дней'), value: or(avgLast(s.steps, 30), fmt) },
      { label: tr('Активные минуты за неделю'), value: or(okv(m.activeMinutes[7]), (v) => fmt(v) + ' ' + tr('мин')) },
      { label: tr('Тренировки за неделю'), value: or(okv(m.exercise[7]), fmt) },
      { label: tr('Расстояние сегодня'), value: or(s.distance.length ? s.distance[s.distance.length - 1].v || null : null, (v) => fmt(v / 1000, 1) + ' ' + tr('км')) },
      { label: tr('Активные калории сегодня'), value: or(s.calories.length ? s.calories[s.calories.length - 1].v || null : null, (v) => fmt(v) + ' ' + tr('ккал')) },
      { label: tr('Тренд за 30 дней'), value: trendText(trendOf(s.steps, 'up')) },
    ],
    chart: { kind: 'bar', daily: s.steps, ref: { value: stepGoal(r.chrono), label: tr('цель') + ' ' + fmt(stepGoal(r.chrono)) } },
    explain: [
      tr('Шаги помогают оценить повседневную активность.'),
      tr('Активные минуты показывают время умеренной или высокой нагрузки.'),
      tr('Тренировки учитываются отдельно от обычных шагов и прогулок.'),
    ],
    improve: [
      tr('Добавить короткую прогулку'),
      tr('Увеличить количество активных минут постепенно'),
      tr('Не пытаться резко компенсировать неделю низкой активности одной тяжёлой тренировкой'),
    ],
    few: ac.status !== 'ok',
  };
};

B.hrv = (r) => {
  const m = r.metrics, b = m.hrvBaseline, s = r.series;
  const last = s.hrv.length ? s.hrv[s.hrv.length - 1] : null;
  return {
    title: 'HRV',
    hero: { value: last ? fmt(last.v) : '—', unit: tr('мс'), sub: last ? ago(last.t) : tr('нет данных') },
    stats: [
      { label: tr('Медиана за 7 дней'), value: or(okv(m.hrv[7]), (v) => fmt(v) + ' ' + tr('мс')) },
      { label: tr('Твоя норма (30–60 дней)'), value: b.status === 'ok' ? fmt(b.value) + ' ' + tr('мс') : b.status === 'insufficient' ? tr('копится: ') + b.n + ' / 14' : tr('нет данных') },
      { label: tr('Отклонение от нормы'), value: b.deviationPct != null ? signed(b.deviationPct, 0) + '%' : '—', good: b.deviationPct != null ? b.deviationPct >= -5 : null },
      { label: tr('Измерений за 90 дней'), value: fmt(s.hrv.length) },
    ],
    chart: { kind: 'line', points: s.hrv, ref: b.status === 'ok' ? { value: b.value, label: tr('база') + ' ' + fmt(b.value) + ' ' + tr('мс') } : null },
    explain: [
      tr('HRV показывает вариабельность сердечного ритма. Часто она связана с восстановлением, стрессом, сном и нагрузкой.'),
      tr('HRV нужно сравнивать с твоей обычной нормой, а не с нормами других людей.'),
      tr('Низкое относительно твоей нормы может быть связано с недосыпом, стрессом, болезнью или высокой нагрузкой.'),
      tr('Высокое относительно твоей нормы часто говорит о хорошем восстановлении.'),
    ],
    few: b.status !== 'ok',
  };
};

B.heartRate = (r) => {
  const m = r.metrics, s = r.series, n = r.scores.norms;
  return {
    title: tr('Пульс'),
    hero: { value: or(okv(m.restingHr[7]), fmt), unit: tr('уд/мин'), sub: tr('пульс покоя, среднее за 7 дней') },
    stats: [
      { label: tr('Пульс покоя за 30 дней'), value: or(okv(m.restingHr[30]), (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Ночной пульс за 7 дней'), value: or(okv(m.nightHr[7]), (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Ночной пульс за 30 дней'), value: or(okv(m.nightHr[30]), (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Твоя норма пульса покоя'), value: or(n.rhr, (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Тренд за 30 дней'), value: trendText(trendOf(s.rhr, 'down')) },
    ],
    chart: { kind: 'line', daily: s.rhr, better: 'down', color: 'heart', ref: n.rhr ? { value: n.rhr, label: tr('норма') + ' ' + fmt(n.rhr) + ' ' + tr('уд/мин') } : null },
    explain: [
      tr('Пульс покоя часто снижается при регулярных тренировках и хорошем восстановлении.'),
      tr('Ночной пульс обычно ниже дневного и полезен для оценки восстановления.'),
      tr('Пульс может меняться из-за стресса, недосыпа, болезни, алкоголя или тяжёлой тренировки.'),
    ],
    few: m.restingHr[30].status !== 'ok',
  };
};

B.bloodPressure = (r) => {
  const m = r.metrics, s = r.series, last = m.bloodPressureLast;
  return {
    title: tr('Давление'),
    hero: { value: last.status === 'ok' ? fmt(last.value) + '/' + fmt(last.dia) : '—', unit: tr('мм рт. ст.'), sub: last.status === 'ok' ? tr('последнее измерение, ') + shortDate(last.t) : tr('нет данных') },
    stats: [
      { label: tr('Систолическое (верхнее)'), value: last.status === 'ok' ? fmt(last.value) : '—' },
      { label: tr('Диастолическое (нижнее)'), value: last.status === 'ok' ? fmt(last.dia) : '—' },
      { label: tr('Среднее за 7 дней'), value: m.bloodPressure[7].status === 'ok' ? fmt(m.bloodPressure[7].value) + '/' + fmt(m.bloodPressure[7].dia) : tr('нет данных') },
      { label: tr('Измерений за 90 дней'), value: fmt(s.bp.length) },
    ],
    chart: { kind: 'line', points: s.bp, windows: [30, 90], label: tr('Верхнее давление') },
    explain: [
      tr('Давление показывает нагрузку на сосуды. Для оценки важны регулярные измерения, а не одно значение.'),
      tr('Измеряй давление в спокойном состоянии, сидя, в одно и то же время.'),
      tr('Приложение не ставит диагнозы. Если давление беспокоит — обсуди его с врачом.'),
    ],
  };
};

B.body = (r, profile) => {
  const m = r.metrics, s = r.series, u = MASS[unitsOf(profile).mass];
  const last = s.weight.length ? s.weight[s.weight.length - 1] : null;
  const kg = last ? last.v : profile.weightKg || null;
  const h = okv(m.height);
  const bmi = kg && h ? kg / ((h / 100) ** 2) : null;
  const waist = profile.lifestyle && profile.lifestyle.waistCm;
  return {
    title: tr('Вес и тело'),
    hero: { value: or(kg, (v) => fmt(u.from(v), 1)), unit: tr(u.label), sub: last ? ago(last.t) : kg ? tr('из профиля') : tr('нет данных') },
    stats: [
      { label: tr('Средний вес за 7 дней'), value: or(okv(m.weight[7]), (v) => fmt(u.from(v), 1) + ' ' + tr(u.label)) },
      { label: tr('Средний вес за 30 дней'), value: or(okv(m.weight[30]), (v) => fmt(u.from(v), 1) + ' ' + tr(u.label)) },
      { label: tr('Тренд за 90 дней'), value: m.weightTrend90.status === 'ok' ? signed(u.from(m.weightTrend90.value), 1) + ' ' + tr(u.label) : tr('мало данных') },
      { label: 'BMI', value: or(bmi, (v) => fmt(v, 1)) },
      { label: tr('Окружность талии'), value: waist ? fmt(waist) + ' ' + tr('см') : tr('не указана') },
    ],
    chart: { kind: 'line', points: s.weight, map: u.from },
    explain: [
      tr('Вес может меняться из-за воды, еды, тренировок и сна. Важнее смотреть недельный тренд.'),
      tr('BMI — простой расчёт по росту и весу. Он не учитывает мышцы и состав тела.'),
      tr('Окружность талии помогает оценить распределение жира.'),
    ],
  };
};

B.vo2max = (r) => {
  const m = r.metrics, s = r.series;
  const pts = s.vo2;
  const now = Date.now();
  const diffSince = (days) => {
    const inWin = pts.filter((p) => p.t >= now - days * 86400000);
    return inWin.length >= 2 ? signed(inWin[inWin.length - 1].v - inWin[0].v, 1) : tr('мало данных');
  };
  return {
    title: 'VO2max',
    hero: { value: or(okv(m.vo2max), (v) => fmt(v, 1)), unit: tr('мл/кг/мин'), sub: m.vo2max.status === 'ok' ? (m.vo2max.source === 'manual_input' ? tr('ручной ввод') : 'Health Connect') + (m.vo2max.t ? ' · ' + (typeof m.vo2max.t === 'number' ? shortDate(m.vo2max.t) : m.vo2max.t.split('-').reverse().join('.')) : '') : tr('нет данных') },
    stats: [
      { label: tr('Тренд за 30 дней'), value: diffSince(30) },
      { label: tr('Тренд за 90 дней'), value: diffSince(90) },
      { label: tr('Предыдущие значения'), value: pts.length > 1 ? pts.slice(-4, -1).reverse().map((p) => fmt(p.v, 1)).join(', ') : '—' },
    ],
    chart: { kind: 'line', points: pts },
    explain: [
      tr('VO2max показывает аэробную выносливость: насколько эффективно организм использует кислород при нагрузке.'),
      tr('VO2max меняется медленно. Смотри тренд за недели и месяцы, а не за один день.'),
    ],
    improve: [tr('Регулярные кардионагрузки'), tr('Постепенное увеличение длительности или интенсивности'), tr('Достаточный сон и восстановление')],
  };
};

B.workout = (r, profile, w) => {
  const dur = (w.end - w.start) / 60000;
  const week = r.scores.load.week;
  return {
    title: workoutName(w.type, w.title),
    hero: { value: fmt(dur), unit: tr('мин'), sub: shortDate(w.start) + ' ' + clock(w.start) },
    stats: [
      { label: tr('Активные минуты'), value: w.activeMin != null && w.hrAvg != null ? fmt(w.activeMin) + ' ' + tr('мин') : tr('нет данных') },
      { label: tr('Средний пульс'), value: or(w.hrAvg, (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Максимальный пульс'), value: or(w.hrMax, (v) => fmt(v) + ' ' + tr('уд/мин')) },
      { label: tr('Расстояние'), value: or(w.distance || null, (v) => fmt(v / 1000, 2) + ' ' + tr('км')) },
      { label: tr('Калории'), value: or(w.calories || null, (v) => fmt(v) + ' ' + tr('ккал')) },
      { label: tr('Нагрузка'), value: w.hrAvg != null ? fmt(w.load) : tr('нет данных') },
    ],
    sections: [
      week && w.hrAvg != null ? { title: tr('Влияние на неделю'), text: (RU ? 'Эта тренировка — около ' : 'This workout is about ') + fmt(Math.min(100, (w.load / week) * 100)) + (RU ? '% нагрузки за последние 7 дней.' : '% of the last 7 days load.') } : null,
    ],
    explain: [
      tr('Нагрузка показывает, сколько тренировочной работы было за последние дни.'),
      tr('Пульс во время тренировки помогает понять интенсивность нагрузки.'),
    ],
  };
};

// Простые метрики без отдельного макета.
const simple = (title, key, unit, f, explain, opts = {}) => (r) => {
  const m = r.metrics[key];
  return {
    title,
    hero: { value: or(okv(m[7]), f), unit, sub: tr('среднее за 7 дней') },
    stats: [
      { label: tr('Среднее за 30 дней'), value: or(okv(m[30]), (v) => f(v) + ' ' + unit) },
      { label: tr('Среднее за 90 дней'), value: or(okv(m[90]), (v) => f(v) + ' ' + unit) },
      { label: tr('Измерений за 30 дней'), value: fmt(m[30].n || 0) },
    ],
    chart: { kind: 'line', points: [] },
    explain,
    few: m[30].status !== 'ok',
    ...opts,
  };
};

B.spo2 = (r) => simple('SpO2', 'spo2', '%', (v) => fmt(v, 1), [
  tr('SpO2 — насыщение крови кислородом. Часы измеряют его примерно, поэтому это вспомогательная метрика.'),
  tr('Ночные значения обычно немного ниже дневных.'),
])(r);
B.respiratory = (r) => simple(tr('Дыхание во сне'), 'respiratoryRate', tr('/мин'), (v) => fmt(v, 1), [
  tr('Частота дыхания во сне обычно стабильна. Заметное изменение относительно твоей нормы бывает при недосыпе, стрессе или простуде.'),
])(r);
B.temperature = (r, profile) => {
  const t = r.metrics.bodyTempDeviation, u = TEMP[unitsOf(profile).temp];
  return {
    title: tr('Температура'),
    hero: { value: t.status === 'ok' ? signed(u.delta(t.value), 1) : '—', unit: u.label, sub: tr('отклонение от твоей нормы') },
    stats: [{ label: tr('Последнее значение'), value: t.status === 'ok' ? fmt(u.from(t.last), 1) + ' ' + u.label : tr('нет данных') }],
    chart: { kind: 'line', points: [] },
    explain: [tr('Сравниваем только с твоей обычной температурой. Отклонение бывает из-за болезни, стресса, нагрузки или цикла.')],
    few: t.status !== 'ok',
  };
};

export function buildDetail(key, result, profile, arg) {
  if (!result || !result.scores) return null;
  const d = B[key] ? B[key](result, profile, arg) : null;
  if (d) d.sections = (d.sections || []).filter(Boolean);
  return d;
}

export const levelOf = level;
