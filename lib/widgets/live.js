// Живые данные для виджета без открытия приложения: Health Connect из «безголового» JS.
// Работает только при разрешении READ_HEALTH_DATA_IN_BACKGROUND; иначе, при ошибке или таймауте — null
// (виджет рисуется по последнему снимку). Никогда не бросает. Фоновых модулей (WorkManager и т.п.) не используется.
const ASLEEP = [2, 4, 5, 6]; // SLEEPING, LIGHT, DEEP, REM

async function work(now) {
  const H = require('../health'); // лениво: тянет react-native-health-connect
  if ((await H.sdkStatus()) !== 'ok') return null;
  await H.init();
  const g = await H.grantedTypes();
  if (!g.has(H.BACKGROUND)) return null;
  const out = { steps: null, sleepH: null, restHr: null };
  const end = new Date(now);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (g.has('Steps')) {
    try { out.steps = (await H.stepsByDay(start, end)).reduce((a, x) => a + (Number(x.steps) || 0), 0); } catch (e) {}
  }
  if (g.has('SleepSession')) {
    try {
      let ms = 0;
      await H.readAll('SleepSession', new Date(now - 30 * 3600000), end, (recs) => {
        for (const r of recs) {
          const a = Date.parse(r.startTime), b = Date.parse(r.endTime);
          if (!(b > a)) continue;
          const st = Array.isArray(r.stages) ? r.stages : [];
          if (st.length) {
            for (const x of st) if (ASLEEP.includes(x.stage)) ms += Math.max(0, Date.parse(x.endTime) - Date.parse(x.startTime)) || 0;
          } else ms += b - a;
        }
      });
      if (ms >= 3600000) out.sleepH = ms / 3600000;
    } catch (e) {}
  }
  if (g.has('RestingHeartRate')) {
    try {
      let last = null;
      await H.readAll('RestingHeartRate', new Date(now - 3 * 86400000), end, (recs) => {
        for (const r of recs) {
          const t = Date.parse(r.time);
          if (Number.isFinite(r.beatsPerMinute) && (!last || t >= last.t)) last = { t, v: r.beatsPerMinute };
        }
      });
      if (last) out.restHr = last.v;
    } catch (e) {}
  }
  return out;
}

export async function readLive(now = Date.now(), timeoutMs = 8000) {
  let timer;
  try {
    return await Promise.race([work(now), new Promise((res) => { timer = setTimeout(() => res(null), timeoutMs); })]);
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
