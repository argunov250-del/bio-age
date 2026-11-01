// Чистый расчёт результата по набору данных: общий для экрана и фоновой задачи.
import { summarize, series, ageAt, HISTORY_DAYS, RECENT_DAYS } from './metrics';
import { corrections, pace } from './formula';
import { advice } from './advice';
import { computeMetrics } from './windows';
import { computeScores } from './scores';
import { collectPeriods, cycleBase } from './cycle';

export function compute(ds, profile) {
  const p = { age: ageAt(profile.birth, ds.now), sex: profile.sex };
  const v180 = summarize(ds, profile, HISTORY_DAYS);
  const v30 = summarize(ds, profile, RECENT_DAYS);
  const corr180 = corrections(v180, p);
  const corr30 = corrections(v30, p);
  // Возраст образа жизни по неделям: каждую неделю — по данным за 30 дней до её конца.
  const trend = [];
  for (let w = 25; w >= 0; w--) {
    const end = new Date(ds.now.getTime() - w * 7 * 86400000);
    const v = summarize(ds, profile, RECENT_DAYS, end);
    if (!Object.values(v).some((x) => x.ok)) continue;
    const age = ageAt(profile.birth, end);
    trend.push({ t: end.getTime(), v: age + corrections(v, { age, sex: profile.sex }).total });
  }
  const metrics = computeMetrics(ds, profile);
  // Цикл — только для женщин и не во время беременности.
  const mode = profile.lifestyle && profile.lifestyle.cycle;
  const cycle = profile.sex === 'f' && profile.showCycle && mode !== 'pregnant' ? cycleBase(collectPeriods(ds), mode) : null;
  return {
    cycle,
    v180, v30, corr180, corr30, chrono: p.age, bio: p.age + corr180.total, pace: pace(v180, v30, p),
    trend, series: series(ds), advice: advice(v180, corr180, p),
    metrics, scores: computeScores(ds, metrics), computedAt: new Date().toISOString(),
  };
}
