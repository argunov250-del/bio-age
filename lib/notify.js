// Уведомления о целях — локальные, без сети и фоновых задач: проверяются после каждого
// расчёта, пока приложение открыто. Отдельный канал 'goals-v2' — не пересекается с
// напоминаниями (scheduleReminders отменяет только запланированные напоминания, а эти — мгновенные).
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RU } from './i18n';
import { stepGoal, sleepGoal } from './goals';
import { GOALS_CHANNEL as CHANNEL, ensureChannels } from './channels';

const t = (ru, en) => (RU ? ru : en);
const KEY = 'goalsSent.v1';
export const MAX_PER_DAY = 3;
export const KEEP_DAYS = 60;
export const BIO_STEP = 0.5;
export const STREAK = 7;

const pad = (n) => (n < 10 ? '0' : '') + n;
export const dayStr = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const dayMs = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };

// Сколько дней подряд до конца ряда (включая последний) значение >= goal, и ключ первого дня серии.
function streakAtEnd(list, goal) {
  let n = 0;
  for (let i = (list || []).length - 1; i >= 0 && list[i].v >= goal; i--) n++;
  return n ? { n, start: list[list.length - n].key } : { n: 0, start: null };
}

// Чистая функция: какие события произошли. prev = { bioRef }, fresh = [{ id, title }].
// Только события «сегодня / прошлой ночью» — старые данные не поднимают шум.
export function goalEvents(prev, result, profile, today, fresh = []) {
  const out = [];
  if (fresh && fresh.length) {
    out.push(fresh.length === 1
      ? { key: 'ach:' + fresh[0].id, title: t('Новое достижение: ', 'New achievement: ') + fresh[0].title, body: t('Загляни в раздел достижений.', 'Check the achievements section.') }
      : { key: 'ach:' + fresh.map((x) => x.id).join('+'), ids: fresh.map((x) => 'ach:' + x.id), title: t('Новых достижений: ', 'New achievements: ') + fresh.length, body: fresh.map((x) => x.title).join(', ') });
  }
  const se = (result && result.series) || {};
  const steps = se.steps || [], sleep = se.sleep || [];
  const goal = stepGoal(result && result.chrono);
  const sc = result && result.scores;
  const SLEEP_GOAL_H = sleepGoal(sc && sc.sleep && sc.sleep.status === 'ok' ? sc.sleep.norm : null);
  const lastSteps = steps[steps.length - 1];
  const lastSleep = sleep[sleep.length - 1];
  if (lastSteps && lastSteps.key === today && lastSteps.v >= goal) {
    out.push({ key: 'steps:' + today, title: t('Цель по шагам выполнена', 'Steps goal reached'), body: t(`Сегодня уже ${Math.round(lastSteps.v)} шагов — цель ${goal}.`, `${Math.round(lastSteps.v)} steps today — goal ${goal}.`) });
    const s = streakAtEnd(steps, goal);
    if (s.n >= STREAK) out.push({ key: 'streakSteps:' + s.start, title: t('Серия: неделя в движении', 'Streak: a week on the move'), body: t(`${s.n} дней подряд от ${goal} шагов.`, `${s.n} days in a row with ${goal}+ steps.`) });
  }
  if (lastSleep && lastSleep.key === today && lastSleep.v >= SLEEP_GOAL_H) {
    out.push({ key: 'sleep:' + today, title: t('Выспался', 'Well rested'), body: t(`Сон прошлой ночью — ${lastSleep.v.toFixed(1)} ч, цель ${SLEEP_GOAL_H}.`, `Last night: ${lastSleep.v.toFixed(1)} h of sleep, goal ${SLEEP_GOAL_H}.`) });
    const s = streakAtEnd(sleep, SLEEP_GOAL_H);
    if (s.n >= STREAK) out.push({ key: 'streakSleep:' + s.start, title: t('Серия: неделя сна', 'Streak: a week of sleep'), body: t(`${s.n} ночей подряд от ${SLEEP_GOAL_H} часов.`, `${s.n} nights in a row of ${SLEEP_GOAL_H}+ hours.`) });
  }
  const bio = result && typeof result.bio === 'number' && isFinite(result.bio) ? result.bio : null;
  const ref = prev && typeof prev.bioRef === 'number' ? prev.bioRef : null;
  if (bio != null && ref != null && ref - bio >= BIO_STEP) {
    out.push({ key: 'bio:' + bio.toFixed(1), title: t('Возраст тела снизился', 'Body age dropped'), body: t(`Теперь ${bio.toFixed(1)} — на ${(ref - bio).toFixed(1)} лет меньше, чем в прошлый раз.`, `Now ${bio.toFixed(1)} — ${(ref - bio).toFixed(1)} years lower than last time.`) });
  }
  return out;
}

// Чистая функция состояния: решает, что отправить, и возвращает новое состояние.
// state = null — первый запуск: только запоминаем текущее, ничего не отправляем.
export function planNotifications(state, result, profile, today, fresh = []) {
  const first = !state;
  const st = {
    sent: { ...((state && state.sent) || {}) },
    bioRef: state && typeof state.bioRef === 'number' ? state.bioRef : null,
    day: today,
    n: state && state.day === today ? state.n || 0 : 0,
  };
  const cutoff = dayMs(today) - KEEP_DAYS * 86400000;
  for (const k of Object.keys(st.sent)) if (dayMs(st.sent[k]) < cutoff) delete st.sent[k];
  const events = goalEvents(st, result, profile, today, fresh);
  const bio = result && typeof result.bio === 'number' && isFinite(result.bio) ? result.bio : null;
  const send = [];
  for (const e of events) {
    const keys = e.ids || [e.key];
    if (st.sent[e.key]) continue;
    if (first) { keys.forEach((k) => { st.sent[k] = today; }); st.sent[e.key] = today; continue; }
    if (st.n >= MAX_PER_DAY) continue; // лимит: остальное не помечаем — попробуем при следующем расчёте
    keys.forEach((k) => { st.sent[k] = today; });
    st.sent[e.key] = today;
    st.n++;
    send.push({ key: e.key, title: e.title, body: e.body });
  }
  // Эталон возраста тела: при первом запуске — текущий; дальше обновляется только вехой (новый минимум).
  if (bio != null) st.bioRef = st.bioRef == null || send.some((e) => e.key.startsWith('bio:')) ? bio : st.bioRef;
  return { state: st, send };
}

async function loadState() {
  try { const s = await AsyncStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}

async function saveState(s) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
}

// Показать уведомление сейчас. Только проверяет разрешение — запрос разрешения только по действию пользователя.
export async function notifyNow(id, title, body) {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (!cur || !cur.granted) return false;
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      identifier: 'goal-' + id,
      content: { title, body, sound: 'default' },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null, // сразу
    });
    return true;
  } catch (e) {
    return false;
  }
}

let chain = Promise.resolve();
// Новый ранг: одно локальное уведомление, в общем дневном лимите MAX_PER_DAY, один раз на ранг ('rank:<index>').
export function notifyRankUp(profile, rank, now = Date.now()) {
  if (!rank || typeof rank.index !== 'number' || (profile && profile.notifyGoals === false)) return chain;
  chain = chain.then(async () => {
    try {
      const today = dayStr(now);
      const prev = await loadState();
      if (!prev) return; // первый запуск ещё не засеян: checkGoals сделает это сам
      const st = { ...prev, sent: { ...(prev.sent || {}) }, day: today, n: prev.day === today ? prev.n || 0 : 0 };
      const key = 'rank:' + rank.index;
      if (st.sent[key] || st.n >= MAX_PER_DAY) return;
      const ok = await notifyNow(key, t('Новый ранг: ', 'New rank: ') + rank.name, t('Это сделала твоя регулярность.', 'Your consistency did this.'));
      if (!ok) return;
      st.sent[key] = today; st.n++;
      await saveState(st);
    } catch (e) {}
  });
  return chain;
}
// Вызывается после каждого расчёта. fresh — [{ id, title }] новых достижений.
// Сохраняет отметку об отправке только для тех уведомлений, которые реально доставлены.
export function checkGoals(profile, result, fresh = [], now = Date.now()) {
  if (!result || (profile && profile.notifyGoals === false)) return chain;
  chain = chain.then(async () => {
    try {
      const prev = await loadState();
      const { state, send } = planNotifications(prev, result, profile, dayStr(now), fresh);
      const failed = new Set();
      for (const e of send) {
        const ok = await notifyNow(e.key, e.title, e.body);
        if (!ok) {
          failed.add(e.key);
          if (e.key.startsWith('ach:') && e.key.includes('+')) {
            e.key.slice(4).split('+').forEach((id) => failed.add('ach:' + id));
          }
        }
      }
      if (failed.size > 0) {
        for (const k of failed) {
          if (!prev || !prev.sent || !prev.sent[k]) delete state.sent[k];
        }
        state.n = Math.max(0, (state.n || 0) - failed.size);
        if ([...failed].some((k) => k.startsWith('bio:'))) {
          state.bioRef = prev && typeof prev.bioRef === 'number' ? prev.bioRef : null;
        }
      }
      await saveState(state);
    } catch (e) {}
  });
  return chain;
}
