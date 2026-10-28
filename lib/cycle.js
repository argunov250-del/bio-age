// Менструальный цикл: месячные из Health Connect (MenstruationPeriod, MenstruationFlow)
// и ручных записей → длина цикла, длительность месячных, текущий день и фаза, прогноз
// следующих месячных, оценка овуляции и фертильного окна, отметки для календаря.
// Нормы и оценки — из исследований:
//  • норма: цикл 24–38 дней, разброс между циклами до 7–9 дней, месячные до 8 дней
//    (FIGO, Munro et al., Int J Gynaecol Obstet 2018);
//  • лютеиновая фаза в среднем 12,4 дня, фолликулярная — 16,9 и сильно разнится
//    (Bull et al., npj Digital Medicine 2019, 612 613 циклов) — поэтому овуляцию
//    считаем от ожидаемого начала следующих месячных назад;
//  • фертильное окно — 6 дней, заканчивается днём овуляции (Wilcox et al., NEJM 1995);
//    овуляция бывает раньше или позже ожидаемой (Wilcox et al., BMJ 2000).
// Это оценка, а не метод контрацепции и не диагноз.
import { dayKey, addDays, startOfDay, median } from './metrics';

const DAY = 86400000;
export const LUTEAL = 13; // дней от овуляции до следующих месячных (≈12,4 по Bull 2019)
export const FERTILE = 6; // дней в фертильном окне
export const NORM = { min: 24, max: 38, spread: 9, period: 8 };
const DEFAULT_LEN = 28;
const DEFAULT_PERIOD = 5;
const keyDate = (k) => new Date(k + 'T12:00:00');
const diffDays = (a, b) => Math.round((keyDate(b) - keyDate(a)) / DAY);
const shift = (k, n) => dayKey(addDays(keyDate(k), n));

// Из записей Health Connect и ручных — список месячных { start, days } по возрастанию.
export function collectPeriods(ds, entries) {
  const days = new Set();
  for (const p of (ds && ds.cycleRaw && ds.cycleRaw.periods) || []) {
    for (let t = startOfDay(new Date(p.start)).getTime(); t < p.end; t += DAY) days.add(dayKey(new Date(t + 12 * 3600000)));
  }
  for (const k of (ds && ds.cycleRaw && ds.cycleRaw.flow) || []) days.add(k);
  for (const e of entries || []) {
    if (e.type !== 'period') continue;
    for (let i = 0; i < (e.days || DEFAULT_PERIOD); i++) days.add(shift(e.date, i));
  }
  // Дни подряд (с пропуском не больше 2 дней) — одни месячные.
  const sorted = [...days].sort();
  const out = [];
  for (const k of sorted) {
    const last = out[out.length - 1];
    if (last && diffDays(last.end, k) <= 2) last.end = k;
    else out.push({ start: k, end: k });
  }
  return out.map((p) => ({ start: p.start, days: diffDays(p.start, p.end) + 1 }));
}

// Основа для экранов: средние и нормы. Сам «сегодня» считается при показе (cycleToday).
export function cycleBase(periods, mode) {
  const starts = periods.map((p) => p.start);
  const lens = [];
  for (let i = 1; i < starts.length; i++) {
    const L = diffDays(starts[i - 1], starts[i]);
    if (L >= 15 && L <= 90) lens.push(L); // промежутки длиннее — скорее пропуск записей
  }
  const recent = lens.slice(-6);
  const periodDays = periods.slice(-6).map((p) => p.days);
  const avgLen = recent.length ? Math.round(median(recent)) : null;
  const spread = recent.length >= 3 ? Math.max(...recent) - Math.min(...recent) : null;
  const periodLen = periodDays.length ? Math.round(median(periodDays)) : null;
  const flags = [];
  if (avgLen != null && recent.length >= 2 && (avgLen < NORM.min || avgLen > NORM.max)) flags.push('length');
  if (spread != null && spread > NORM.spread) flags.push('irregular');
  if (periodLen != null && periodLen > NORM.period) flags.push('long');
  return { mode: mode || 'tracking', periods: periods.slice(-24), lens: recent, n: recent.length, avgLen, spread, periodLen, flags };
}

// Состояние на сегодня: день цикла, фаза, прогнозы. null — месячные ещё не отмечены.
export function cycleToday(base, now = new Date()) {
  if (!base || !base.periods || !base.periods.length) return null;
  const today = dayKey(now);
  const last = base.periods[base.periods.length - 1];
  const len = base.avgLen || DEFAULT_LEN;
  const pLen = base.periodLen || last.days || DEFAULT_PERIOD;
  const day = diffDays(last.start, today) + 1;
  if (day < 1) return null;
  const hormonal = base.mode === 'contraception';
  const nextKey = shift(last.start, len);
  const ovDay = len - LUTEAL; // день цикла
  const late = day > len ? day - len : 0;
  let phase;
  // Месячные идут, пока не прошла их обычная длительность (не все отмечают каждый день).
  if (day <= Math.max(last.days, pLen)) phase = 'menstrual';
  else if (late) phase = 'late';
  else if (hormonal) phase = 'hormonal';
  else if (day === ovDay) phase = 'ovulation';
  else if (day > ovDay - FERTILE && day < ovDay) phase = 'fertile';
  else if (day < ovDay) phase = 'follicular';
  else phase = 'luteal';
  return {
    day, len, periodLen: pLen, phase, late,
    nextKey, daysToNext: Math.max(0, diffDays(today, nextKey)),
    ovKey: hormonal ? null : shift(last.start, ovDay - 1),
    fertileFrom: hormonal ? null : shift(last.start, ovDay - FERTILE),
    fertileTo: hormonal ? null : shift(last.start, ovDay - 1),
    ovDay: hormonal ? null : ovDay,
    estimate: base.n < 2, // пока мало циклов — прогноз по средним значениям
    lastStart: last.start,
  };
}

// Отметки для календаря: { 'YYYY-MM-DD': 'period' | 'predicted' | 'fertile' | 'ovulation' }.
export function calendarMarks(base, now = new Date(), cyclesAhead = 3) {
  const marks = {};
  if (!base) return marks;
  for (const p of base.periods) for (let i = 0; i < p.days; i++) marks[shift(p.start, i)] = 'period';
  const t = cycleToday(base, now);
  if (!t) return marks;
  const hormonal = base.mode === 'contraception';
  // Окно текущего цикла и прогнозы на несколько циклов вперёд.
  // При задержке прогноз считаем от сегодняшнего дня, а не от прошедшей даты.
  const from = t.late ? dayKey(now) : t.lastStart;
  for (let c = t.late ? 1 : 0; c <= cyclesAhead; c++) {
    const start = t.late ? shift(from, t.len * (c - 1)) : shift(from, t.len * c);
    if (c > 0) for (let i = 0; i < t.periodLen; i++) { const k = shift(start, i); if (!marks[k]) marks[k] = 'predicted'; }
    if (!hormonal) {
      for (let i = t.ovDay - FERTILE; i < t.ovDay - 1; i++) { const k = shift(start, i); if (!marks[k]) marks[k] = 'fertile'; }
      const ov = shift(start, t.ovDay - 1);
      if (!marks[ov]) marks[ov] = 'ovulation';
    }
  }
  return marks;
}
