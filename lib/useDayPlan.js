// План дня для экранов: умные квесты (planQuests), арка Хирона (arcState), флаг дня отдыха, ранг для приветствия.
// Всё считается локально из уже готовых данных; флаги хранятся в lib/coach/dayStore.js (rest.v1, arcs.v1, rank.greeted.v1).
// onReward({ xp, eventId, journal }) вызывается один раз при завершении арки (награда вне потолка).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildContext, planQuests } from './coach/quests';
import { arcState, arcAct, arcMarkGreeted, emptyArcs } from './coach/arcs';
import { buildGreetExtra } from './coach/greetExtra';
import { loadRestKey, markRestDay, loadArcs, saveArcs, loadRankGreeted, saveRankGreeted } from './coach/dayStore';

export function useDayPlan({ result, profile, weather, growth, entries, opens, now, onReward }) {
  const [loaded, setLoaded] = useState(false);
  const [restKey, setRestKey] = useState(null);
  const [stored, setStored] = useState(() => emptyArcs());
  const [rankGreeted, setRankGreeted] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all([loadRestKey(), loadArcs(), loadRankGreeted()]).then(([r, a, g]) => {
      if (!alive) return;
      setRestKey(r); setStored(a); setRankGreeted(g); setLoaded(true);
    }).catch(() => { if (alive) setLoaded(true); });
    return () => { alive = false; };
  }, []);

  const level = growth && typeof growth.level === 'number' ? growth.level : null;
  const nowMs = now instanceof Date ? now.getTime() : Date.now();
  const ctx = useMemo(
    () => buildContext({ result, profile, weather, activities: entries, growth: level == null ? null : { level }, now: nowMs, restKey, opens }),
    [result, profile, weather, level, entries, nowMs, restKey, opens],
  );
  const plan = useMemo(() => planQuests(ctx), [ctx]);
  const arc = useMemo(() => arcState(ctx, stored), [ctx, stored]);

  const awarded = useRef(new Set());
  const rewardRef = useRef(onReward);
  rewardRef.current = onReward;
  useEffect(() => {
    if (!loaded || !arc.changed) return;
    if (JSON.stringify(arc.stored) !== JSON.stringify(stored)) { setStored(arc.stored); saveArcs(arc.stored); }
    const r = arc.reward;
    if (r && !awarded.current.has(r.eventId)) {
      awarded.current.add(r.eventId);
      if (rewardRef.current) rewardRef.current(r);
    }
  }, [arc, loaded, stored]);

  const actArc = useCallback((id, action, opts) => {
    const next = arcAct(stored, id, action, Date.now(), opts);
    setStored(next);
    saveArcs(next);
  }, [stored]);

  const extra = useMemo(
    () => (loaded ? buildGreetExtra({ arc, level, rankGreeted, stored, quests: plan.quests, rest: plan.mode === 'rest', dayKey: ctx.dayKey }) : null),
    [loaded, arc, level, rankGreeted, stored, plan, ctx.dayKey],
  );

  // Ответ коуча: защитная пауза -> день отдыха; приветствие упомянуло ранг/арку -> больше не повторять.
  const onReply = useCallback((a) => {
    if (!a) return;
    if (a.holdSet) markRestDay().then((k) => setRestKey(k)).catch(() => {});
    const used = a.consumed || {};
    if (typeof used.rank === 'number') { setRankGreeted(used.rank); saveRankGreeted(used.rank); }
    if (used.arc) {
      const next = arcMarkGreeted(stored, ctx.dayKey);
      setStored(next);
      saveArcs(next);
    }
  }, [stored, ctx.dayKey]);

  return { plan, arc: loaded ? arc : { id: null, stage: 'none' }, actArc, extra, onReply, loaded };
}
