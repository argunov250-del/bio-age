// Диалоговая память коуча: компактное структурированное состояние (НЕ тексты сообщений).
// Чистые функции; хранение на телефоне — в store.js (ключ coachState.v1).
export const MEMORY_KEY = 'coachState.v1';
export const PENDING_TTL = 2;      // сколько ходов живёт ожидаемое уточнение
export const KNOWN_TTL = 6;        // сколько ходов помним параметры текущего запроса (место, вид занятия)
export const RECENT_MAX = 40;      // сколько последних id вариантов ответов помним (id шуток хранятся отдельно, в истории)

export const emptyMemory = () => ({
  v: 1,
  turn: 0,
  lastAt: null,            // время последнего хода (мс) — для «возвращения после перерыва»
  lastTopic: null,         // тема: train / sleep / steps / weather ...
  lastScenario: null,      // id последнего сценария
  lastVariant: null,       // id последнего варианта
  lastRecommendation: null, // { topic, kind } — чему отвечает «почему?» и «проще»
  pending: null,           // { key, ttl, topic, data } — ожидаемое уточнение
  known: {},               // { place: {v, turn}, activity: {v, turn}, ... }
  brevity: null,           // null | 'short' | 'detailed'
  humorMode: null,         // null (по профилю) | 'off' | 'balanced' | 'playful'
  recent: [],              // id недавних вариантов ответов (отдельно от шуток)
  recentMain: [],          // ключи недавно использованных формулировок ОСНОВНОГО содержания (вид рекомендации), не только id варианта
  qaRecent: [],            // режим «вопросы кнопками»: недавние варианты ответов 'id#номер' (ротация)
  qaAsked: [],             // id недавно заданных вопросов (подсказки не повторяются)
  hold: null,              // { kind: 'red'|'pain'|'dizzy'|'soft', turn } — защитная пауза сессии после тревожного симптома или боли
});

const isStr = (x, max = 60) => typeof x === 'string' && x.length > 0 && x.length <= max;
const num = (x) => typeof x === 'number' && isFinite(x);

// Любой вход -> корректная память (повреждённое/чужое -> пустая).
export function deserialize(input, opts) {
  let o = input;
  if (typeof input === 'string') { try { o = JSON.parse(input); } catch (e) { o = null; } }
  const m = emptyMemory();
  if (!o || typeof o !== 'object' || o.v !== 1) return m;
  m.turn = num(o.turn) && o.turn >= 0 ? Math.floor(o.turn) : 0;
  m.lastAt = num(o.lastAt) ? o.lastAt : null;
  m.brevity = o.brevity === 'short' || o.brevity === 'detailed' ? o.brevity : null;
  m.humorMode = ['off', 'balanced', 'playful'].includes(o.humorMode) ? o.humorMode : null;
  m.recent = Array.isArray(o.recent) ? o.recent.filter((x) => isStr(x, 80)).slice(-RECENT_MAX) : [];
  m.recentMain = Array.isArray(o.recentMain) ? o.recentMain.filter((x) => isStr(x, 80)).slice(-RECENT_MAX) : [];
  m.qaRecent = Array.isArray(o.qaRecent) ? o.qaRecent.filter((x) => isStr(x, 80)).slice(-RECENT_MAX) : [];
  m.qaAsked = Array.isArray(o.qaAsked) ? o.qaAsked.filter((x) => isStr(x, 80)).slice(-RECENT_MAX) : [];
  if (opts && opts.newSession) return m; // новая сессия: помним предпочтения и повторы, но не «о чём говорили»
  m.lastTopic = isStr(o.lastTopic) ? o.lastTopic : null;
  m.lastScenario = isStr(o.lastScenario, 80) ? o.lastScenario : null;
  m.lastVariant = isStr(o.lastVariant, 80) ? o.lastVariant : null;
  if (o.hold && ['red', 'pain', 'dizzy', 'soft', 'crisis'].includes(o.hold.kind)) m.hold = { kind: o.hold.kind, turn: num(o.hold.turn) ? o.hold.turn : 0 };
  if (o.lastRecommendation && isStr(o.lastRecommendation.topic)) {
    m.lastRecommendation = { topic: o.lastRecommendation.topic, kind: isStr(o.lastRecommendation.kind) ? o.lastRecommendation.kind : null };
  }
  if (o.pending && isStr(o.pending.key) && num(o.pending.ttl) && o.pending.ttl > 0) {
    m.pending = { key: o.pending.key, ttl: Math.min(PENDING_TTL, Math.floor(o.pending.ttl)), topic: isStr(o.pending.topic) ? o.pending.topic : null, data: o.pending.data && typeof o.pending.data === 'object' ? o.pending.data : null };
  }
  if (o.known && typeof o.known === 'object') {
    for (const k of Object.keys(o.known)) {
      const e = o.known[k];
      if (isStr(k, 20) && e && (typeof e.v === 'string' || num(e.v)) && num(e.turn)) m.known[k] = { v: e.v, turn: e.turn };
    }
  }
  return m;
}

export const serialize = (mem) => JSON.stringify(deserialize(mem));

// Известный параметр (с учётом срока жизни).
export function knownParam(mem, key) {
  const e = mem && mem.known && mem.known[key];
  if (!e) return null;
  return mem.turn - e.turn <= KNOWN_TTL ? e.v : null;
}

// Один ход: переносит память вперёд. patch: { topic, scenario, variant, recommendation, pending, known, brevity, humorMode, now, keepTopic }
// Ожидаемое уточнение живёт PENDING_TTL ходов и сбрасывается сменой темы; параметры — KNOWN_TTL ходов.
export function advance(mem, patch) {
  const p = patch || {};
  const base = deserialize(mem);
  const turn = base.turn + 1;
  const next = { ...base, turn, lastAt: num(p.now) ? p.now : base.lastAt };
  const topicChanged = p.topic && base.lastTopic && p.topic !== base.lastTopic;
  if (p.topic) next.lastTopic = p.topic;
  if (p.scenario) next.lastScenario = p.scenario;
  if (p.variant) { if (!(p.keepLast && base.lastVariant && !/^ctl_/.test(base.lastVariant))) next.lastVariant = p.variant; next.recent = [...base.recent, p.variant].slice(-RECENT_MAX); }
  if (p.recommendation !== undefined) next.lastRecommendation = p.recommendation;
  if (p.mainKeys && p.mainKeys.length) next.recentMain = [...base.recentMain, ...p.mainKeys].slice(-RECENT_MAX);
  // защитная пауза: включается тревожным симптомом/болью, снимается только словами человека «прошло / всё хорошо»
  if (p.hold) next.hold = { kind: p.hold, turn };
  else if (p.releaseHold) next.hold = null;
  // ожидаемое уточнение
  if (p.pending) next.pending = { key: p.pending.key, ttl: PENDING_TTL, topic: p.pending.topic || next.lastTopic, data: p.pending.data || null };
  else if (base.pending && !p.resolved && base.pending.ttl - 1 > 0 && !topicChanged) next.pending = { ...base.pending, ttl: base.pending.ttl - 1 };
  else next.pending = null;
  // параметры
  const known = {};
  for (const k of Object.keys(base.known)) if (turn - base.known[k].turn <= KNOWN_TTL && !(topicChanged && p.dropKnownOnTopicChange)) known[k] = base.known[k];
  if (p.known) for (const k of Object.keys(p.known)) if (p.known[k] != null) known[k] = { v: p.known[k], turn };
  next.known = known;
  if (p.brevity !== undefined) next.brevity = p.brevity;
  if (p.humorMode !== undefined) next.humorMode = p.humorMode;
  return next;
}
