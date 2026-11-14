// Статистика журнала: связь поведения со следующим утренним восстановлением. Чистый JS.
// Это корреляция по малой выборке, а не причинность — формулировки нейтральные.
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const fin = (x) => (typeof x === 'number' && isFinite(x) ? x : null);
const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export const BEHAVIORS = ['caffeineLate', 'alcohol', 'lateMeal', 'screensBeforeBed', 'stressHigh', 'meditation', 'sauna', 'coldShower', 'supplements', 'water'];
export const MIN_YES = 5, MIN_NO = 5;
const isYes = (e, id, act) => {
  if (id === 'water') { const a = act; return !!(a && fin(a.waterMl) != null && a.waterGoalMl > 0 && a.waterMl >= 0.8 * a.waterGoalMl); }
  const v = e && e[id];
  return typeof v === 'number' ? v > 0 : !!v;
};
const nextKey = (k) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + 1); return dayKey(d); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const vari = (a) => { const m = mean(a); return a.length > 1 ? a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1) : 0; };

// recoveryByDay: { key: pct } или [{key, v}]. Восстановление «на следующее утро» = recovery дня d+1.
export function journalImpact(journalByDay, recoveryByDay, opts = {}) {
  const J = journalByDay && typeof journalByDay === 'object' ? journalByDay : {};
  const act = opts.activities || null;
  const R = {};
  if (Array.isArray(recoveryByDay)) recoveryByDay.forEach((x) => { if (x && fin(x.v) != null) R[x.key] = x.v; });
  else for (const k of Object.keys(recoveryByDay || {})) if (fin(recoveryByDay[k]) != null) R[k] = recoveryByDay[k];
  const minYes = opts.minYes || MIN_YES, minNo = opts.minNo || MIN_NO;
  const insights = [], needMore = [];
  for (const id of BEHAVIORS) {
    const ys = [], ns = [];
    for (const k of Object.keys(J)) {
      const next = R[nextKey(k)];
      if (next == null) continue;
      if (id === 'water' && !(act && act[k])) continue;
      (isYes(J[k], id, act && act[k]) ? ys : ns).push(next);
    }
    if (ys.length < minYes || ns.length < minNo) {
      if (ys.length + ns.length > 0 || id !== 'water') needMore.push({ id, nYes: ys.length, nNo: ns.length, needYes: Math.max(0, minYes - ys.length), needNo: Math.max(0, minNo - ns.length) });
      continue;
    }
    const diff = mean(ys) - mean(ns);
    const se = Math.sqrt(Math.max(vari(ys), 1) / ys.length + Math.max(vari(ns), 1) / ns.length);
    const t = diff / se;
    const confidence = Math.abs(t) >= 2.5 && Math.min(ys.length, ns.length) >= 7 ? 'high' : Math.abs(t) >= 1.7 ? 'medium' : 'low';
    insights.push({ id, deltaPct: Math.round(diff * 10) / 10, effect: Math.round(clamp(t, -99, 99) * 100) / 100, confidence, sign: Math.abs(diff) < 1 ? 'zero' : diff > 0 ? 'pos' : 'neg', nYes: ys.length, nNo: ns.length });
  }
  insights.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return { insights, needMore };
}
// Нейтральная подпись (без причинных утверждений).
export function insightText(i) {
  if (!i) return '';
  const d = Math.abs(i.deltaPct);
  const rel = i.sign === 'zero' ? 'почти не отличается' : i.sign === 'neg' ? `ниже на ${d} п.п.` : `выше на ${d} п.п.`;
  return `В дни с этой отметкой восстановление на следующее утро в среднем ${rel} (${i.nYes} и ${i.nNo} дней; связь, не причина).`;
}
export function needMoreText(n) {
  const need = Math.max(n.needYes, n.needNo);
  return `Нужно ещё ${need} дн. записей`;
}
