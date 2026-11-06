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

// result — расчёт compute(); profile — профиль; growth — результат buildGrowth (или null); lang — 'ru' | 'en'.
export function buildSnapshot({ result, profile, growth, lang, now }) {
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
  return {
    v: 1,
    day,
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
