// Рекомендации по слабым метрикам: какие сильнее всего прибавляют возраст
// и сколько лет можно отыграть, если дотянуть метрику до цели.
import { METRICS, metricTarget, yearsFromHR } from './formula';
import { tr } from './i18n';
import { fmt } from './format';

const TEXT = {
  sleepDuration: (v) => tr('Спите в среднем ') + fmt(v, 1) + tr(' ч. Цель — 7–8 часов: ложитесь на 30 минут раньше и уберите телефон за час до сна.'),
  sleepRegularity: () => tr('Ложитесь и вставайте в одно и то же время, даже в выходные — регулярность сна важна не меньше длительности.'),
  steps: (v) => tr('В среднем ') + fmt(v) + tr(' шагов в день. Прогулка 20–30 минут добавит 2500–3000 шагов.'),
  zones13: (v) => tr('Умеренной нагрузки ') + fmt(v) + tr(' мин в неделю. Цель — от 300: быстрая ходьба, велосипед, плавание.'),
  zones45: (v) => tr('Интенсивной нагрузки ') + fmt(v) + tr(' мин в неделю. Добавьте 2 интервальные тренировки по 20 минут.'),
  strength: (v) => tr('Силовых ') + fmt(v) + tr(' мин в неделю. Цель — 30–60 минут: хватит двух коротких занятий.'),
  vo2max: () => tr('VO2max ниже цели. Быстрее всего его поднимают интервальные тренировки: 4 × 4 минуты на высоком пульсе.'),
  restingHr: (v) => tr('Пульс в покое ') + fmt(v) + tr(' уд/мин. Его снижают регулярные кардиотренировки и хороший сон.'),
  leanMass: () => tr('Безжировой массы меньше цели. Помогут силовые тренировки и достаточно белка в рационе.'),
};

function targetValue(t, v) {
  if (t.lo != null && t.hi != null) return Math.min(t.hi, Math.max(t.lo, v));
  return t.lo != null ? Math.max(t.lo, v) : Math.min(t.hi, v);
}

// [{ key, gain, text }] — не больше `limit`, по убыванию пользы.
export function advice(values, corr, p, limit = 3) {
  const out = [];
  for (const m of METRICS) {
    const v = values[m.key], it = corr.items[m.key];
    if (!v || !v.ok || !it) continue;
    const best = yearsFromHR(m.hr(targetValue(metricTarget(m.key, p), v.value), p));
    const gain = it.raw - best;
    if (gain >= 0.1) out.push({ key: m.key, gain, text: TEXT[m.key](v.value) });
  }
  return out.sort((a, b) => b.gain - a.gain).slice(0, limit);
}
