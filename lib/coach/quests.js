// Умные квесты (spec 1.3, 2.2): контекст дня -> список замен заданий с репликой Хирона.
// Локальные правила, без модели и сети. Новых медицинских порогов нет: только analyze(), weatherState(),
// личная норма сна и цели из lib/goals.js. Чистые функции: время приходит аргументом now.
import { analyze } from '../coachBrain';
import { RU } from '../i18n';
import { weatherState, condName } from './weatherCtx';
import { stepGoal, sleepGoal } from '../goals';
import { withUnit } from './assemble';

export const STREAK_RISK_MIN = 3;          // параметр продукта (не медицинский)
export const SLEEP_POOR_MARGIN = 0.5;      // то же условие, что в analyze() для cycleSoftened
export const STREAK_HOURS = [18, 21];      // напоминание о серии только вечером

const pad = (n) => (n < 10 ? '0' : '') + n;
export const keyOf = (x) => { const d = new Date(x); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const shiftKey = (key, days) => {
  const [y, m, d] = String(key).split('-').map(Number);
  return keyOf(new Date(y, m - 1, d + days, 12).getTime());
};
const isN = (x) => typeof x === 'number' && isFinite(x);

// Подряд идущие дни (до вчера включительно) с шагами >= цели.
function streakBefore(arr, todayKey, goal) {
  const by = new Map((arr || []).filter(Boolean).map((x) => [x.key, Number(x.v) || 0]));
  let n = 0;
  for (let k = shiftKey(todayKey, -1); n < 400; k = shiftKey(k, -1)) {
    if ((by.get(k) || 0) >= goal) n++; else break;
  }
  return n;
}

const dayKeys = (list) => (Array.isArray(list) ? list : []).map((a) => {
  if (!a) return null;
  if (typeof a.key === 'string') return a.key;
  if (typeof a.date === 'string') return a.date;
  return isN(a.start) ? keyOf(a.start) : null;
}).filter(Boolean);

/**
 * Собрать контекст дня из уже посчитанных данных (ничего не запрашивает).
 * @param {{result, profile, weather, activities?, growth?, now?, hold?, rest?, restKey?, opens?, lang?}} i
 *   hold — memory.hold из сессии коуча ({kind}|null); rest — защитная пауза сегодня (bool);
 *   restKey — сохранённый ключ последнего дня отдыха (rest.v1); opens — моменты открытия (opens.v1).
 */
export function buildContext({ result, profile, weather, activities, growth, now = Date.now(), hold = null, rest = false, restKey = null, opens = null, lang } = {}) {
  const s = analyze(result, profile);                    // существующая функция коуча
  const W = weatherState(weather, now);
  const day = keyOf(now);
  const ru = lang ? lang === 'ru' : RU;
  const goal = stepGoal(s.age);
  const se = (result && result.series) || {};
  const stepsArr = (Array.isArray(se.steps) ? se.steps : []).filter((x) => x && typeof x.key === 'string');
  const sleepArr = (Array.isArray(se.sleep) ? se.sleep : []).filter((x) => x && typeof x.key === 'string');
  const today = stepsArr.find((x) => x.key === day);
  const stepsNow = today && isN(today.v) ? Number(today.v) : null;
  const norm = s.sleepNorm == null ? sleepGoal(null) : s.sleepNorm;
  const holdKind = hold && hold.kind ? hold.kind : null;
  return {
    v: 1, ru, now, dayKey: day, hour: new Date(now).getHours(),
    steps: { value: stepsNow, goal, left: stepsNow == null ? null : Math.max(0, goal - stepsNow), streakDays: streakBefore(stepsArr, day, goal) },
    sleep: { hours: s.sleepH, norm: norm, goal: sleepGoal(s.sleepNorm), poor: s.sleepH != null && s.sleepNorm != null && s.sleepH < s.sleepNorm - SLEEP_POOR_MARGIN },
    weather: W.status === 'none' ? { status: 'none' } : { status: W.status, kind: W.kind, temp: W.temp, cond: W.cond, level: W.level, place: W.place },
    body: { state: s.state, readiness: s.readiness, load: s.load, cycleSoftened: !!s.cycleSoftened },
    userGoals: { goal: s.goal, stepGoal: goal, sleepGoal: sleepGoal(s.sleepNorm) },
    series: { steps: stepsArr.slice(-45), sleep: sleepArr.slice(-45) },
    activityDays: dayKeys(activities),
    growth: growth && isN(growth.level) ? { level: growth.level } : null,
    hold: holdKind,
    rest: !!(rest || holdKind || (restKey && restKey === day)),
    lastRestKey: typeof restKey === 'string' ? restKey : null,
    opens: Array.isArray(opens) ? opens.filter(isN) : null,
  };
}

// ───────────────────────── тексты (голос Хирона, без давления) ─────────────────────────
const T = {
  rest: { id: 'sq_rest', xp: null,
    title: ['День отдыха: заданий нет', 'Rest day: no quests'],
    why: ['Сегодня просто отдыхаем. Заданий нет, и это нормально.', 'Today we simply rest. No quests, and that is fine.'] },
  breathe: { id: 'sq_breathe', xp: 'care',
    title: ['Дыхание 3 минуты и мягкая растяжка 5 минут дома', '3 minutes of breathing and 5 of gentle stretching at home'] },
  indoor: { id: 'sq_indoor', xp: 'care',
    title: ['Домашняя разминка 10 минут', '10-minute home warm-up'] },
  heatHome: { id: 'sq_heat_home', xp: 'care',
    title: ['Домашняя активность 10 минут (лестница, зарядка) и вода по норме', '10 minutes of activity at home (stairs, light exercise) and water as planned'] },
  recovery: { id: 'sq_recovery', xp: 'care',
    title: ['Лёгкий день: растяжка 10 минут и сон по норме', 'Easy day: 10 minutes of stretching and a full night of sleep'] },
  earlyWalk: { id: 'sq_early_walk', xp: 'steps',
    title: ['Прогулка до 10:00 или после 19:00 и вода', 'A walk before 10:00 or after 19:00, and water'] },
  minimum: { id: 'sq_minimum', xp: 'steps',
    title: ['Минимум дня: короткая прогулка до цели по шагам', 'Minimum for today: a short walk to your steps goal'] },
};

const pickL = (pair, ru) => pair[ru ? 0 : 1];
const mk = (ctx, def, scenario, why, extra) => {
  const ru = ctx.ru !== false;
  const w = typeof why === 'function' ? why : () => why;
  const out = {
    id: def.id, scenario, replaces: 'steps', xpSource: def.xp,
    title: pickL(def.title, ru), why: w(ru),
    i18n: { ru: { title: def.title[0], why: w(true) }, en: { title: def.title[1], why: w(false) } },
    ...(extra || {}),
  };
  return out;
};

const wxText = (w, ru) => condName(w.cond, ru) || condName(w.kind, ru);
const tempText = (w) => (w.temp > 0 ? '+' : '') + Math.round(w.temp) + '°';

/**
 * Режим дня по приоритету: rest > опасная погода (C) > усталость/нагрузка (D) > мало сна (A) > жара (B) > серия (E).
 * @returns {{ mode: string, scenario: string|null, quests: Array, hide: string[] }}
 */
export function planQuests(ctx) {
  const c = ctx || {};
  const ru = c.ru !== false;
  const w = c.weather || { status: 'none' };
  const fresh = w.status === 'current';
  const bad = fresh && (w.level === 'danger' || w.level === 'inconvenient');
  const body = c.body || {};
  const tired = body.load === 'high' || body.state === 'tired';

  if (c.rest) {
    const q = { id: T.rest.id, scenario: 'rest', replaces: '*', xpSource: null, title: pickL(T.rest.title, ru), why: pickL(T.rest.why, ru), i18n: { ru: { title: T.rest.title[0], why: T.rest.why[0] }, en: { title: T.rest.title[1], why: T.rest.why[1] } }, hides: ['steps', 'workout', 'water', 'streak'] };
    return { mode: 'rest', scenario: 'rest', quests: [q], hide: q.hides };
  }
  const one = (mode, scenario, q, hide) => ({ mode, scenario, quests: [{ ...q, hides: hide }], hide });

  if (fresh && (w.cond === 'storm' || w.cond === 'frost')) { // C
    const why = (r) => (tired
      ? (r ? `За окном ${wxText(w, r)}, и телу нужно восстановиться. Уличную прогулку пропускаем, сегодня лёгкий день: растяжка и ранний отбой.` : `Outside it is ${wxText(w, r)}, and your body needs to recover. We skip the outdoor walk; today is an easy day: stretching and an early night.`)
      : (r ? `За окном ${wxText(w, r)}. Уличную прогулку сегодня пропускаем, это нормально. Десять минут разминки дома.` : `Outside it is ${wxText(w, r)}. We skip the outdoor walk today, and that is fine. Ten minutes of warming up at home.`));
    return one('danger_weather', 'C', mk(c, tired ? T.recovery : T.indoor, 'C', why), ['steps']);
  }
  if (tired) { // D
    const why = (r) => (r ? 'Нагрузка высокая или силы на исходе, телу нужно восстановиться. Сегодня лёгкий день: растяжка и ранний отбой.' : 'Your load is high or energy is low, so your body needs to recover. Today is an easy day: stretching and an early night.');
    return one('recovery', 'D', mk(c, T.recovery, 'D', why), ['steps', 'workout']);
  }
  if (c.sleep && c.sleep.poor) { // A
    const gentle = body.state === 'tired';
    const why = (r) => {
      if (bad) return r ? `Ты спал(а) меньше обычного, да и за окном ${wxText(w, r)}. Сегодня не гонимся за шагами: три минуты дыхания и пять минут растяжки дома${gentle ? ', если есть силы' : ''}. Этого достаточно.`
        : `You slept less than usual, and outside it is ${wxText(w, r)}. We are not chasing steps today: three minutes of breathing and five of stretching at home${gentle ? ', if you have the energy' : ''}. That is enough.`;
      return r ? 'Ты спал(а) меньше обычного. Сегодня не гонимся за шагами: три минуты дыхания и пять минут растяжки дома. Этого достаточно.'
        : 'You slept less than usual. We are not chasing steps today: three minutes of breathing and five of stretching at home. That is enough.';
    };
    return one('poor_sleep', 'A', mk(c, T.breathe, 'A', why), ['steps']);
  }
  if (fresh && w.cond === 'heat') { // B, >= 33
    const why = (r) => (r ? `Жара ${tempText(w)}. Сегодня без улицы: зарядка дома и вода.` : `Heat, ${tempText(w)}. No outdoors today: light exercise at home and water.`);
    return one('heat', 'B', mk(c, T.heatHome, 'B', why), ['steps']);
  }
  if (fresh && w.cond === 'warm') { // B, 28..32: шаги остаются, меняется подсказка времени
    const why = (r) => (r ? `На улице ${tempText(w)}. Если идти, то рано утром или вечером, и пей воду. А в самую жару лучше в тени и дома.` : `It is ${tempText(w)} outside. If you walk, go early in the morning or in the evening, and drink water. In the peak heat, stay in the shade or indoors.`);
    return one('warm', 'B', mk(c, T.earlyWalk, 'B', why), []);
  }
  const st = c.steps || {};
  const atRisk = st.streakDays >= STREAK_RISK_MIN && st.value != null && st.value < st.goal && c.hour >= STREAK_HOURS[0] && c.hour < STREAK_HOURS[1];
  if (atRisk) { // E
    const why = (r) => (r ? `До цели осталось ${withUnit(st.left, 'step', true)}, это около 10–15 минут неспешной ходьбы. Серия ждёт, но если сегодня не получится, это тоже не беда.`
      : `${withUnit(st.left, 'step', false)} left to your goal, about 10–15 minutes of an easy walk. Your streak will wait, and if it does not work out today, that is fine too.`);
    return one('streak', 'E', mk(c, T.minimum, 'E', why, { left: st.left }), []);
  }
  return { mode: 'normal', scenario: null, quests: [], hide: [] };
}

/** Замены заданий на сегодня: [{ id, replaces, title, why, xpSource, ... }] (пусто — обычный день). */
export const smartQuests = (ctx) => planQuests(ctx).quests;
