// Типизированные переменные ответа: значение, единица, период, источник, время обновления, доступность.
// Строятся ТОЛЬКО из того, что уже посчитано приложением (analyze(), результат, профиль, погода из weather.js)
// и из слов самого пользователя. Нет данных -> available:false -> вариант с ней не выбирается.
// Неизвестное никогда не заменяется нулём.
import { withUnit } from './assemble';
import { condName } from './weatherCtx';

const isN = (x) => typeof x === 'number' && isFinite(x);
const mk = (name, value, kind, o) => {
  const ok = kind === 'text' ? typeof value === 'string' && value.length > 0 : isN(value);
  return { name, value: ok ? value : null, kind, unit: (o && o.unit) || null, period: (o && o.period) || null, source: (o && o.source) || null, updatedAt: (o && o.updatedAt) || null, available: ok };
};

export const VAR_NAMES = ['steps7', 'steps30', 'stepGoal', 'sleepH', 'sleepNorm', 'sleepScore', 'sleep7', 'readiness', 'rhr7', 'active7', 'workouts7',
  'wxTemp', 'wxLabel', 'wxPlace', 'wxAgeMin', 'savedLabel', 'savedAgo', 'savedTemp', 'userSleepH', 'userSteps', 'knownPlace', 'knownActivity'];

const PLACE_NAME = { home: ['дома', 'at home'], gym: ['в зале', 'at the gym'], outdoor: ['на улице', 'outdoors'] };
const ACT_NAME = { run: ['бег', 'running'], strength: ['силовая', 'strength work'], stretch: ['растяжка', 'stretching'], cycle: ['велосипед', 'cycling'], swim: ['плавание', 'swimming'], cardio: ['кардио', 'cardio'], walk: ['прогулка', 'a walk'] };
export const placeName = (p, ru = true) => (PLACE_NAME[p] ? PLACE_NAME[p][ru ? 0 : 1] : '');
export const actName = (a, ru = true) => (ACT_NAME[a] ? ACT_NAME[a][ru ? 0 : 1] : '');

// s — результат analyze(); W — weatherState(); known — { place, activity }; user — числа из слов пользователя.
export function buildVars(s, W, known, user, ru = true) {
  const S = s || {};
  const v = {};
  const put = (x) => { v[x.name] = x; };
  put(mk('steps7', S.steps7 != null ? Math.round(S.steps7) : null, 'count', { unit: 'steps', period: '7d', source: 'app' }));
  put(mk('steps30', S.steps30 != null ? Math.round(S.steps30) : null, 'count', { unit: 'steps', period: '30d', source: 'app' }));
  put(mk('stepGoal', S.stepGoal, 'count', { unit: 'steps', period: 'day', source: 'goal' }));
  put(mk('sleepH', S.sleepH, 'hoursmin', { unit: 'hours', period: 'last_night', source: 'app' }));
  put(mk('sleepScore', S.sleepScore, 'score', { period: 'last_night', source: 'app' }));
  put(mk('sleepNorm', S.sleepNorm, 'hoursmin', { unit: 'hours', period: 'norm', source: 'app' }));
  put(mk('sleep7', S.sleep7, 'hoursmin', { unit: 'hours', period: '7d', source: 'app' }));
  put(mk('readiness', S.readiness, 'score', { source: 'app' }));
  put(mk('rhr7', S.rhr7 != null ? Math.round(S.rhr7) : null, 'count', { unit: 'bpm', period: '7d', source: 'app' }));
  put(mk('active7', S.active7 != null ? Math.round(S.active7) : null, 'count', { unit: 'minutes', period: '7d', source: 'app' }));
  put(mk('workouts7', S.workouts7, 'count', { unit: 'sessions', period: '7d', source: 'app' }));
  const w = W || { status: 'none' };
  const cur = w.status === 'current';
  put(mk('wxTemp', cur ? w.temp : null, 'temp', { source: 'weather', updatedAt: w.at }));
  put(mk('wxLabel', cur ? condName(w.kind, ru) : '', 'text', { source: 'weather', updatedAt: w.at }));
  put(mk('wxPlace', cur && w.place ? w.place : '', 'text', { source: 'weather' }));
  put(mk('wxAgeMin', cur && w.ageMin != null ? Math.max(1, w.ageMin) : null, 'count', { unit: 'minutesAcc', source: 'weather', updatedAt: w.at }));
  const st = w.status === 'stale';
  put(mk('savedLabel', st ? condName(w.kind, ru) : '', 'text', { source: 'weather_saved', updatedAt: w.at }));
  put(mk('savedTemp', st ? w.temp : null, 'temp', { source: 'weather_saved', updatedAt: w.at }));
  put(mk('savedAgo', st && w.ageMin != null ? (w.ageMin >= 90 ? withUnit(Math.round(w.ageMin / 60), 'hour', ru) : withUnit(w.ageMin, 'minuteAcc', ru)) + (ru ? ' назад' : ' ago') : '', 'text', { source: 'weather_saved', updatedAt: w.at }));
  const u = user || {};
  put(mk('userSleepH', isN(u.sleep) && u.sleep > 0 && u.sleep <= 24 ? u.sleep : null, 'hoursmin', { unit: 'hours', source: 'user' }));
  put(mk('userSteps', isN(u.steps) && u.steps > 0 ? Math.round(u.steps) : null, 'count', { unit: 'steps', source: 'user' }));
  const k = known || {};
  put(mk('knownPlace', k.place ? placeName(k.place, ru) : '', 'text', { source: 'user' }));
  put(mk('knownActivity', k.activity ? actName(k.activity, ru) : '', 'text', { source: 'user' }));
  return v;
}
