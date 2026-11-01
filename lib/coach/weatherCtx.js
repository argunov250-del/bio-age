// Состояние погоды для коуча: ТОЛЬКО поля из lib/weather.js (kind, code, temp, day, at, place, stale).
// Ничего не запрашивает: данные приходят через setCoachWeather() из App.js. Прогноза, ветра, осадков и
// «ощущается как» в проекте нет — коуч о них не говорит как о known.

// Должно совпадать с TTL в lib/weather.js (проверяется тестом).
export const WEATHER_TTL = 30 * 60000;

const NAMES = {
  storm: ['гроза', 'a thunderstorm'], rain: ['дождь', 'rain'], snow: ['снег', 'snow'], fog: ['туман', 'fog'], clouds: ['облачно', 'cloudy'], clear: ['ясно', 'clear'],
  heat: ['сильная жара', 'extreme heat'], frost: ['сильный мороз', 'severe frost'], warm: ['жарко', 'hot'], cold: ['холодно', 'cold'], good: ['хорошая погода', 'good weather'], ice: ['гололёд', 'ice'], wind: ['ветер', 'wind'],
};
export const condName = (cond, ru = true) => (NAMES[cond] ? NAMES[cond][ru ? 0 : 1] : '');

// Классификация условий (как в прежнем freshWeather): опасно / неудобно / хорошо / обычно.
export function classify(kind, temp) {
  const tmp = typeof temp === 'number' && isFinite(temp) ? temp : null;
  if (kind === 'storm') return { cond: 'storm', level: 'danger' };
  if (tmp != null && tmp >= 33) return { cond: 'heat', level: 'danger' };
  if (tmp != null && tmp <= -20) return { cond: 'frost', level: 'danger' };
  if (kind === 'rain') return { cond: 'rain', level: 'inconvenient' };
  if (kind === 'snow') return { cond: 'snow', level: 'inconvenient' };
  if (tmp != null && tmp >= 28) return { cond: 'warm', level: 'inconvenient' };
  if (tmp != null && tmp <= -10) return { cond: 'cold', level: 'inconvenient' };
  if (kind === 'clear' && tmp != null && tmp >= 8 && tmp <= 26) return { cond: 'good', level: 'good' };
  return { cond: 'other', level: null };
}

// -> { status: 'none'|'current'|'stale', kind, temp, cond, level, place, ageMin, at }
// current — данные не старше TTL; stale — сохранённые (старше TTL, из кэша после ошибки или с неверными часами): НИКОГДА не «сейчас».
export function weatherState(w, now = Date.now()) {
  if (!w || typeof w !== 'object' || !w.kind) return { status: 'none' };
  const hasAt = typeof w.at === 'number' && isFinite(w.at);
  const age = hasAt ? now - w.at : null;
  const temp = typeof w.temp === 'number' && isFinite(w.temp) ? w.temp : null;
  const fresh = hasAt && w.stale !== true && age <= WEATHER_TTL && age >= -60000;
  return {
    status: fresh ? 'current' : 'stale',
    kind: w.kind, temp, ...classify(w.kind, temp),
    place: typeof w.place === 'string' && w.place.trim() ? w.place.trim() : null,
    ageMin: hasAt ? Math.max(0, Math.round(age / 60000)) : null,
    at: hasAt ? w.at : null,
  };
}
