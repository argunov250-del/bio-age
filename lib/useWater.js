// Хук воды за сегодня. profile — объект профиля (weightKg, waterSync).
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { getWater, addWaterSynced, undoWaterSynced, askWaterSync } from './water';
import { waterGoalMl, subscribe } from './activities';

export function useWater(profile) {
  const [state, setState] = useState(() => ({ ml: 0, goalMl: waterGoalMl(profile), progress: 0, done: false, localMl: 0, externalMl: 0, source: 'local' }));
  const refresh = useCallback(async () => {
    try { setState(await getWater(profile)); } catch (e) { /* прежнее */ }
  }, [profile]);
  useEffect(() => {
    refresh();
    const unsub = subscribe(() => { refresh(); });
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    return () => { unsub(); sub.remove(); };
  }, [refresh]);
  const add = useCallback((ml) => addWaterSynced(profile, ml), [profile]);
  const undo = useCallback(() => undoWaterSynced(profile), [profile]);
  return { ...state, add, undo, refresh, askSync: askWaterSync };
}
