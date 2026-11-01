// Выбор варианта ответа без случайности: из подходящих берётся тот, что дольше всех не
// использовался; при равенстве — стабильный порядок каталога. Когда все использованы — самый давний.
// Важный (safety) ответ никогда не блокируется ради разнообразия.

// Позиция id с конца истории: 0 — только что, Infinity — не использовался.
export function age(recent, id) {
  const i = (recent || []).lastIndexOf(id);
  return i < 0 ? Infinity : recent.length - 1 - i;
}

// candidates: [{id,...}] в стабильном порядке; opts: { exclude: [id], safety: bool }
export function pickVariant(candidates, recent, opts) {
  const o = opts || {};
  let list = candidates.slice();
  if (!list.length) return null;
  if (o.exclude && o.exclude.length && !o.safety) {
    const rest = list.filter((c) => !o.exclude.includes(c.id));
    if (rest.length) list = rest;
  }
  let best = null;
  let bestAge = -1;
  list.forEach((c) => {
    const a = age(recent, c.id);
    if (a > bestAge) { best = c; bestAge = a; } // строгое «больше»: при равенстве остаётся ранний в каталоге
  });
  return best;
}
