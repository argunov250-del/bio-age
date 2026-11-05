// Вода: локально всегда (lib/activities.js); Health Connect (Hydration) — только по желанию и
// при выданных разрешениях. Любой вызов HC обёрнут в try/catch и не бросает.
// Дедупликация: наши записи в HC имеют clientRecordId 'epimely-water-<id>'. При чтении такие записи
// пропускаем (они уже в локальной сумме), берём только чужие: двойного счёта нет.
import { Platform } from 'react-native';
import { addWater, undoWater, loadActivities, dayKey, waterGoalMl } from './activities';

export const HC_PREFIX = 'epimely-water-';
const RECORD = 'Hydration';

let hc = null;
const lib = () => {
  if (hc !== null) return hc;
  try { hc = Platform.OS === 'android' ? require('react-native-health-connect') : false; } catch (e) { hc = false; }
  return hc;
};
export const _resetForTests = () => { hc = null; };

export async function waterPermissions() {
  const l = lib();
  if (!l) return { read: false, write: false };
  try {
    await l.initialize();
    const list = (await l.getGrantedPermissions()) || [];
    const has = (t) => list.some((p) => p.recordType === RECORD && p.accessType === t);
    return { read: has('read'), write: has('write') };
  } catch (e) { return { read: false, write: false }; }
}

// Только по действию пользователя (включение переключателя). -> { read, write }
export async function askWaterSync() {
  const l = lib();
  if (!l) return { read: false, write: false };
  try {
    await l.initialize();
    await l.requestPermission([{ accessType: 'read', recordType: RECORD }, { accessType: 'write', recordType: RECORD }]);
  } catch (e) { /* отказ — работаем локально */ }
  return waterPermissions();
}

async function hcWrite(entry) {
  const l = lib();
  if (!l) return false;
  try {
    await l.insertRecords([{
      recordType: RECORD,
      startTime: new Date(entry.t - 60000).toISOString(),
      endTime: new Date(entry.t).toISOString(),
      volume: { unit: 'liters', value: entry.ml / 1000 },
      metadata: { clientRecordId: HC_PREFIX + entry.id },
    }]);
    return true;
  } catch (e) { return false; }
}

async function hcDelete(entry) {
  const l = lib();
  if (!l) return false;
  try { await l.deleteRecordsByIds(RECORD, [], [HC_PREFIX + entry.id]); return true; } catch (e) { return false; }
}

// Чужие записи Hydration за день, мл (наши пропускаем), либо null.
export async function externalWaterMl(now = Date.now(), perms) {
  const l = lib();
  const p = perms || (await waterPermissions());
  if (!l || !p.read) return null;
  try {
    const d = new Date(now);
    const res = await l.readRecords(RECORD, {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(),
        endTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString(),
      },
    });
    const list = (res && res.records) || [];
    const sum = list.reduce((a, r) => {
      const cid = r && r.metadata && r.metadata.clientRecordId;
      if (typeof cid === 'string' && cid.indexOf(HC_PREFIX) === 0) return a;
      return a + ((r && r.volume && Number(r.volume.inLiters)) || 0);
    }, 0);
    return Math.round(sum * 1000);
  } catch (e) { return null; }
}

// { ml, goalMl, progress, done, localMl, externalMl, source: 'local' | 'hc' }
export async function getWater(profile, now = Date.now()) {
  const map = await loadActivities();
  const localMl = (map[dayKey(now)] && map[dayKey(now)].waterMl) || 0;
  const goalMl = waterGoalMl(profile);
  const ext = await externalWaterMl(now);
  const externalMl = ext == null ? 0 : ext;
  const ml = localMl + externalMl;
  return { ml, goalMl, progress: Math.min(1, ml / goalMl), done: ml >= goalMl, localMl, externalMl, source: ext == null ? 'local' : 'hc' };
}

// +ml локально; если profile.waterSync и есть WRITE — ещё и в HC. -> { day, synced }
export async function addWaterSynced(profile, ml) {
  const day = await addWater(ml, profile);
  const entry = day.waterLog[day.waterLog.length - 1];
  let synced = false;
  if (profile && profile.waterSync && entry) {
    const perms = await waterPermissions();
    if (perms.write) synced = await hcWrite(entry);
  }
  return { day, synced };
}

// Откат последней порции; если синхронизация включена, пробуем удалить свою запись в HC.
export async function undoWaterSynced(profile) {
  const day = await undoWater();
  const gone = day.undone;
  let deleted = false;
  if (gone && profile && profile.waterSync) {
    const perms = await waterPermissions();
    if (perms.write) deleted = await hcDelete(gone);
  }
  return { day, deleted };
}
