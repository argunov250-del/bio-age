// Тексты про цикл: названия и описания фаз, предупреждения, источники.
// Опираются на исследования, перечисленные в lib/cycle.js, и на данные носимых
// устройств о пульсе, HRV и температуре по фазам (Jasinski et al., npj Digital Medicine
// 2024, 45 811 циклов; Alzueta et al., Int J Womens Health 2022).
import { RU } from './i18n';
import { NORM } from './cycle';

const t = (ru, en) => (RU ? ru : en);
const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// «14 окт» / «Oct 14»
export function dayLabel(key) {
  const [, m, d] = key.split('-').map(Number);
  return RU ? `${d} ${MONTHS_RU[m - 1]}` : `${MONTHS_EN[m - 1]} ${d}`;
}
export const range = (a, b) => (a === b ? dayLabel(a) : dayLabel(a) + ' – ' + dayLabel(b));
const days = (n) => n + ' ' + t('дн.', n === 1 ? 'day' : 'days');

export function phaseName(phase) {
  return {
    menstrual: t('Месячные', 'Period'),
    follicular: t('Фолликулярная фаза', 'Follicular phase'),
    fertile: t('Фертильное окно', 'Fertile window'),
    ovulation: t('Овуляция (оценка)', 'Ovulation (estimate)'),
    luteal: t('Лютеиновая фаза', 'Luteal phase'),
    late: t('Задержка', 'Late period'),
    hormonal: t('Цикл на контрацепции', 'Cycle on contraception'),
  }[phase] || '';
}

export function phaseText(phase, today) {
  switch (phase) {
    case 'menstrual': return t('Пульс покоя в эти дни обычно самый низкий за цикл, а HRV — самый высокий. Тренироваться можно как обычно, если самочувствие позволяет; при боли помогают лёгкое движение и тепло.',
      'Resting heart rate is usually at its lowest and HRV at its highest now. You can train as usual if you feel well; for cramps, light movement and warmth help.');
    case 'follicular': return t('Растёт эстроген, многие отмечают больше энергии. Хорошее время, чтобы пробовать новое и наращивать нагрузку.',
      'Estrogen is rising and many people feel more energetic. A good time to try new things and build training load.');
    case 'fertile': return t('6 дней до ожидаемой овуляции включительно — вероятность беременности самая высокая. Это оценка по средней длине цикла, а не метод контрацепции.',
      'The 6 days up to and including expected ovulation — the highest chance of pregnancy. This is an estimate from average cycle length, not contraception.');
    case 'ovulation': return t('Ожидаемый день овуляции по средней длине цикла. Точнее его покажут тесты на овуляцию или базальная температура: после овуляции она повышается на 0,3–0,5 °C.',
      'Expected ovulation day from average cycle length. Ovulation tests or basal temperature are more accurate: it rises by 0.3–0.5 °C after ovulation.');
    case 'luteal': return t('Прогестерон поднимает температуру тела на 0,3–0,5 °C, пульс покоя выше, а HRV ниже — это нормально, а не признак переутомления. Сон может быть менее глубоким, к концу фазы у некоторых бывает ПМС.',
      'Progesterone raises body temperature by 0.3–0.5 °C, resting heart rate goes up and HRV goes down — this is normal, not overtraining. Sleep may be lighter, and some people get PMS near the end.');
    case 'late': return t('Месячные задерживаются на ', 'Your period is ') + days(today ? today.late : 0) + t('. Небольшие задержки бывают из-за стресса, болезни, перелётов или нагрузок. Если задержка больше недели или возможна беременность — сделай тест.',
      ' late. Small delays happen with stress, illness, travel or heavy training. If it is over a week late or pregnancy is possible, take a test.');
    case 'hormonal': return t('При гормональной контрацепции своей овуляции обычно нет, а кровотечение — реакция на перерыв в приёме. Поэтому прогноз овуляции не показывается.',
      'On hormonal contraception there is usually no ovulation, and bleeding is a response to the hormone break. So no ovulation forecast is shown.');
    default: return '';
  }
}

export function flagText(flag, base) {
  switch (flag) {
    case 'length': return t('Средний цикл — ', 'Average cycle — ') + days(base.avgLen) + t(`: вне обычного диапазона ${NORM.min}–${NORM.max} дней. Стоит обсудить с гинекологом.`, `: outside the usual ${NORM.min}–${NORM.max} days. Worth discussing with a gynecologist.`);
    case 'irregular': return t('Длина циклов различается на ', 'Cycle length varies by ') + days(base.spread) + t(` — больше обычных 7–${NORM.spread}. Так бывает при стрессе, нагрузках, смене веса; если держится несколько месяцев — к гинекологу.`, ` — more than the usual 7–${NORM.spread}. It happens with stress, training or weight change; if it lasts for months, see a gynecologist.`);
    case 'long': return t('Месячные длятся в среднем ', 'Periods last ') + days(base.periodLen) + t(` — дольше ${NORM.period}. Стоит обсудить с врачом.`, ` on average — longer than ${NORM.period}. Worth discussing with a doctor.`);
    default: return '';
  }
}

// Главная строка для карточки: когда следующие месячные.
export function nextLine(today) {
  if (!today) return t('Отметь первый день месячных — и я посчитаю цикл.', 'Mark the first day of your period and I will calculate your cycle.');
  if (today.phase === 'menstrual') return t('Месячные, день ', 'Period, day ') + today.day;
  if (today.late) return t('Задержка ', 'Late by ') + days(today.late);
  if (today.daysToNext === 0) return t('Месячные ожидаются сегодня', 'Period expected today');
  return t('Месячные через ', 'Period in ') + days(today.daysToNext) + ' · ' + dayLabel(today.nextKey);
}

export const SOURCES = [
  'FIGO: Munro et al., Int J Gynaecol Obstet, 2018',
  'Bull et al., npj Digital Medicine, 2019 (612 613 cycles)',
  'Wilcox et al., NEJM, 1995; BMJ, 2000',
  'Jasinski et al., npj Digital Medicine, 2024 (45 811 cycles)',
  'Alzueta et al., Int J Womens Health, 2022',
  'McNulty et al., Sports Med, 2020',
];
