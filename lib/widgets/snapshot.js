// Снимок для виджетов домашнего экрана: компактный JSON, который приложение пишет после расчёта,
// а безголовая задача виджета читает (без Health Connect и без расчёта). Всё здесь — чистые функции
// плюс два обращения к AsyncStorage; ничего не бросает наружу.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { stepGoal } from '../goals';

export const SNAPSHOT_KEY = 'widget.snapshot.v1';

// Локальный ключ дня (как metrics.dayKey; не импортируем metrics — он тянет Health Connect).
const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const isNum = (x) => typeof x === 'number' && Number.isFinite(x);
const round = (x, d) => { const k = Math.pow(10, d); return Math.round(x * k) / k; };
const numOr = (x, d) => (isNum(x) ? round(x, d) : null);
const lastPositive = (arr, maxBack) => {
  if (!Array.isArray(arr)) return null;
  for (let i = arr.length - 1, n = 0; i >= 0 && n < maxBack; i--, n++) {
    const v = arr[i] && arr[i].v;
    if (isNum(v) && v > 0) return v;
  }
  return null;
};

const HIST_DAYS = 14;
const numList = (a) => (Array.isArray(a) ? a.filter(isNum).slice(-HIST_DAYS) : []);
// История готовности по дням (в результате расчёта её нет): дополняем прошлым снимком, храним 14 дней.
function mergeHist(prev, day, score) {
  const h = {};
  const src = prev && typeof prev === 'object' && !Array.isArray(prev) ? prev : {};
  for (const k of Object.keys(src)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isNum(src[k])) h[k] = Math.round(src[k]);
  if (isNum(score)) h[day] = Math.round(score);
  const keys = Object.keys(h).sort().slice(-HIST_DAYS);
  const out = {};
  for (const k of keys) out[k] = h[k];
  return out;
}

// result — расчёт compute(); profile — профиль; growth — результат buildGrowth (или null); lang — 'ru' | 'en'.
export function buildSnapshot({ result, profile, growth, lang, now, prev }) {
  const t = isNum(now) ? now : Date.now();
  const day = dayKey(t);
  const r = result && typeof result === 'object' ? result : null;
  const se = (r && r.series) || {};
  const sc = (r && r.scores) || {};
  const chrono = r && isNum(r.chrono) ? r.chrono : (profile && isNum(profile.age) ? profile.age : null);
  const bio = r && isNum(r.bio) ? r.bio : null;
  const rd = sc.readiness && sc.readiness.status === 'ok' && isNum(sc.readiness.score) ? sc.readiness : null;
  const stepsRow = Array.isArray(se.steps) ? se.steps.find((x) => x && x.key === day) : null;
  const sleepKey = sc.lastNightKey;
  const sleepRow = sleepKey && Array.isArray(se.sleep) ? se.sleep.find((x) => x && x.key === sleepKey) : null;
  const g = growth && typeof growth === 'object' ? growth : null;
  const rdHist = mergeHist(prev && prev.rdHist, day, rd ? rd.score : null);
  const trend = Array.isArray(r && r.trend) ? r.trend.map((x) => x && x.v) : [];
  return {
    v: 1,
    day,
    spSteps: numList((Array.isArray(se.steps) ? se.steps : []).map((x) => x && x.v)).map((x) => Math.round(x)),
    spBio: numList(trend).map((x) => round(x, 1)),
    rdHist,
    bio: numOr(bio, 1),
    chrono: numOr(chrono, 1),
    delta: bio != null && chrono != null ? round(bio - chrono, 1) : null,
    readiness: rd ? Math.round(rd.score) : null,
    steps: stepsRow && isNum(stepsRow.v) ? Math.round(stepsRow.v) : null,
    stepGoal: stepGoal(chrono),
    sleepH: sleepRow && isNum(sleepRow.v) && sleepRow.v > 0 ? round(sleepRow.v, 1) : null,
    restHr: numOr(lastPositive(se.rhr, 3), 0),
    hrv: sc.recovery && isNum(sc.recovery.hrvLast) ? Math.round(sc.recovery.hrvLast) : null,
    level: g && isNum(g.level) ? Math.round(g.level) : null,
    rank: g && g.rank && typeof g.rank.name === 'string' ? g.rank.name.slice(0, 40) : null,
    updatedAt: t,
    lang: lang === 'en' ? 'en' : 'ru',
  };
}

// Любой мусор из хранилища -> безопасный снимок или null. Используется и записью, и чтением.
export function normalizeSnapshot(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
    return {
      v: 1,
      spSteps: numList(s.spSteps).map((x) => Math.round(x)),
      spBio: numList(s.spBio).map((x) => round(x, 1)),
      rdHist: mergeHist(s.rdHist, '0000-00-00', null),
      day: typeof s.day === 'string' ? s.day.slice(0, 10) : null,
      bio: numOr(s.bio, 1),
      chrono: numOr(s.chrono, 1),
      delta: numOr(s.delta, 1),
      readiness: numOr(s.readiness, 0),
      steps: numOr(s.steps, 0),
      stepGoal: isNum(s.stepGoal) && s.stepGoal > 0 ? Math.round(s.stepGoal) : 8000,
      sleepH: numOr(s.sleepH, 1),
      restHr: numOr(s.restHr, 0),
      hrv: numOr(s.hrv, 0),
      level: numOr(s.level, 0),
      rank: typeof s.rank === 'string' && s.rank ? s.rank.slice(0, 40) : null,
      updatedAt: isNum(s.updatedAt) ? s.updatedAt : 0,
      lang: s.lang === 'en' ? 'en' : 'ru',
    };
  } catch (e) {
    return null;
  }
}

export async function saveSnapshot(snap) {
  try {
    const clean = normalizeSnapshot(snap);
    if (!clean) return null;
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(clean));
    return clean;
  } catch (e) {
    return null;
  }
}

export async function loadSnapshot() {
  try {
    return normalizeSnapshot(await AsyncStorage.getItem(SNAPSHOT_KEY));
  } catch (e) {
    return null;
  }
}

// Подмешивает живые данные из Health Connect (шаги сегодня, сон, пульс покоя) в снимок.
export function applyLive(snap, live, now) {
  const t = isNum(now) ? now : Date.now();
  const base = normalizeSnapshot(snap) || normalizeSnapshot({ updatedAt: t });
  if (!live || typeof live !== 'object') return base;
  const out = { ...base };
  const today = dayKey(t);
  if (isNum(live.steps) && live.steps >= 0) {
    out.steps = Math.round(live.steps);
    const sp = base.spSteps.slice();
    if (base.day === today && sp.length) sp[sp.length - 1] = out.steps; else sp.push(out.steps);
    out.spSteps = sp.slice(-HIST_DAYS);
    out.day = today;
  }
  if (isNum(live.sleepH) && live.sleepH > 0) out.sleepH = round(live.sleepH, 1);
  if (isNum(live.restHr) && live.restHr > 0) out.restHr = Math.round(live.restHr);
  out.updatedAt = t;
  return out;
}
