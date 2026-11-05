// Чистая логика таймеров «Дыхание 4–6» и «Цифровая пауза». Без React и без времени «из воздуха»:
// всё считается от переданных timestamps, поэтому тестируется.
//
// ЧЕСТНО об ограничениях: мы измеряем только таймер внутри приложения. Не можем знать, пользовался ли
// человек телефоном во время паузы (UsageStats не используем), поэтому пауза засчитывается по
// подтверждению пользователя («Получилось»). Дыхание засчитывается, только если приложение было
// на переднем плане: уход в фон дольше BG_LIMIT_MS отменяет сессию без штрафа.
import { addBreath, addPause } from './activities';

export const INHALE_S = 4;
export const EXHALE_S = 6;
export const CYCLE_S = INHALE_S + EXHALE_S;
export const BREATH_DEFAULT_MIN = 3;
export const PAUSE_DEFAULT_MIN = 20;
export const BG_LIMIT_MS = 10000;
export const BREATH_MIN_RATIO = 0.9; // засчитываем от 90% времени

// Последовательность фаз на N минут: [{ phase, sec }] (целые циклы, округление вниз, минимум 1).
export function breathSequence(minutes = BREATH_DEFAULT_MIN) {
  const cycles = Math.max(1, Math.floor((Math.max(0, minutes) * 60) / CYCLE_S));
  const seq = [];
  for (let i = 0; i < cycles; i++) seq.push({ phase: 'inhale', sec: INHALE_S }, { phase: 'exhale', sec: EXHALE_S });
  return seq;
}

// Состояние в момент elapsedMs: { phase, phaseProgress 0..1, cycle, remainingMs, done, scale 0..1 (размер круга) }
export function breathState(elapsedMs, minutes = BREATH_DEFAULT_MIN) {
  const total = breathSequence(minutes).length / 2 * CYCLE_S * 1000;
  const e = Math.max(0, elapsedMs);
  if (e >= total) return { phase: 'done', phaseProgress: 1, cycle: total / (CYCLE_S * 1000), remainingMs: 0, done: true, scale: 0 };
  const inCycle = (e % (CYCLE_S * 1000)) / 1000;
  const cycle = Math.floor(e / (CYCLE_S * 1000));
  const inhale = inCycle < INHALE_S;
  const phaseProgress = inhale ? inCycle / INHALE_S : (inCycle - INHALE_S) / EXHALE_S;
  return { phase: inhale ? 'inhale' : 'exhale', phaseProgress, cycle, remainingMs: total - e, done: false, scale: inhale ? phaseProgress : 1 - phaseProgress };
}

export const breathTotalMs = (minutes = BREATH_DEFAULT_MIN) => (breathSequence(minutes).length / 2) * CYCLE_S * 1000;

// Учёт ухода в фон. s = { startedAt, bgSince|null, cancelled }
export const startSession = (now) => ({ startedAt: now, bgSince: null, cancelled: false });
export function onBackground(s, now) { return s.bgSince == null ? { ...s, bgSince: now } : s; }
export function onForeground(s, now) {
  if (s.bgSince == null) return s;
  return { ...s, bgSince: null, cancelled: s.cancelled || now - s.bgSince > BG_LIMIT_MS };
}

// Дыхание: { counted, minutes }. Засчитывается при >= 90% длительности и без отмены из-за фона.
export function breathResult(s, now, minutes = BREATH_DEFAULT_MIN) {
  const away = s.bgSince != null && now - s.bgSince > BG_LIMIT_MS; // ещё в фоне и уже слишком долго
  const elapsed = now - s.startedAt;
  const ok = !s.cancelled && !away && elapsed >= breathTotalMs(minutes) * BREATH_MIN_RATIO;
  return { counted: ok, minutes: ok ? minutes : 0 };
}
export async function completeBreath(s, now, minutes = BREATH_DEFAULT_MIN) {
  const r = breathResult(s, now, minutes);
  if (r.counted) await addBreath(r.minutes, now);
  return r;
}

// Цифровая пауза: { endAt, remainingMs, done }. Досрочное завершение — «Закончить раньше?» без штрафа.
export function pauseState(startedAt, now, minutes = PAUSE_DEFAULT_MIN) {
  const endAt = startedAt + minutes * 60000;
  return { endAt, remainingMs: Math.max(0, endAt - now), done: now >= endAt };
}
// confirmed — пользователь честно нажал «Получилось». Без подтверждения и до срока — 0.
export function pauseResult(startedAt, now, confirmed, minutes = PAUSE_DEFAULT_MIN) {
  const st = pauseState(startedAt, now, minutes);
  return { counted: !!confirmed && st.done, minutes: !!confirmed && st.done ? minutes : 0 };
}
export async function completePause(startedAt, now, confirmed, minutes = PAUSE_DEFAULT_MIN) {
  const r = pauseResult(startedAt, now, confirmed, minutes);
  if (r.counted) await addPause(r.minutes, now);
  return r;
}
