// Проверка целей при закрытом приложении: expo-background-task (WorkManager на Android).
// defineTask вызывается при импорте — App.js импортирует этот файл на верхнем уровне,
// поэтому задача зарегистрирована и при «безголовом» запуске системой. Без сети.
import * as TaskManager from 'expo-task-manager';
import * as BackgroundTask from 'expo-background-task';
import { setLang } from './i18n';
import { loadProfile, loadEntries, loadOpens } from './storage';
import { planEntries } from './sleepPlan';
import { applyManual } from './manual';
import { sdkStatus, init, grantedTypes, BACKGROUND } from './health';
import { loadDataset } from './metrics';
import { loadImported } from './importer';
import { compute } from './compute';
import { checkGoals } from './notify';

export const TASK = 'goals-check';
export const INTERVAL_MIN = 30; // минимум; система решает сама (экономия батареи может отложить)

// Одна проверка. Не бросает: { ok, skipped?, error? }.
export async function runGoalsCheck() {
  try {
    const profile = await loadProfile();
    if (!profile || profile.notifyGoals === false) return { ok: true, skipped: 'off' };
    setLang(profile.lang);
    // Health Connect из фона читается только с отдельным разрешением; без него HC пропускаем.
    let hc = new Set();
    if ((await sdkStatus()) === 'ok') {
      await init();
      const g = await grantedTypes();
      if (g.has(BACKGROUND)) hc = g;
    }
    let imported = null;
    try { imported = loadImported(); } catch (e) {}
    // Данные только из Health Connect, но фонового доступа нет — ничего не считаем (чтобы не выдать ложный результат).
    if (!hc.size && !profile.skipHC && !imported) return { ok: true, skipped: 'no-background-access' };
    const [entries, opens] = await Promise.all([loadEntries(), loadOpens()]);
    const plan = planEntries(profile.sleepPlan, opens);
    const ds = applyManual(await loadDataset(hc, profile, undefined, imported), [...entries, ...plan]);
    await checkGoals(profile, compute(ds, profile));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

TaskManager.defineTask(TASK, async () => {
  const r = await runGoalsCheck();
  return r.ok ? BackgroundTask.BackgroundTaskResult.Success : BackgroundTask.BackgroundTaskResult.Failed;
});

// Включить/выключить фоновую задачу по настройке профиля. Тихо при любых ошибках.
export async function syncGoalsTask(profile) {
  try {
    if (profile && profile.notifyGoals !== false) {
      await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: INTERVAL_MIN });
      return true;
    }
    if (await TaskManager.isTaskRegisteredAsync(TASK)) await BackgroundTask.unregisterTaskAsync(TASK);
  } catch (e) {}
  return false;
}
