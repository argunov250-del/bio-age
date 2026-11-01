// Сборка ответа: цельные варианты (чувствительное и сложное) или совместимые блоки (бытовое):
// реакция → главное → объяснение → действие → уточнение, плюс необязательная шутка по правилам.
// Здесь же склонения (шаг/минута/час) и проверка результата (нет undefined/null/NaN/плейсхолдеров).
import { fmt } from '../format';

// ───────────────────────── склонения ─────────────────────────
const FORMS = {
  step: { ru: ['шаг', 'шага', 'шагов'], en: ['step', 'steps'] },
  minute: { ru: ['минута', 'минуты', 'минут'], en: ['minute', 'minutes'] },
  minuteAcc: { ru: ['минуту', 'минуты', 'минут'], en: ['minute', 'minutes'] },
  hour: { ru: ['час', 'часа', 'часов'], en: ['hour', 'hours'] },
  day: { ru: ['день', 'дня', 'дней'], en: ['day', 'days'] },
  session: { ru: ['занятие', 'занятия', 'занятий'], en: ['session', 'sessions'] },
};

export function plural(n, kind, ru = true) {
  const f = FORMS[kind];
  if (!f) return '';
  const x = Math.abs(Math.round(Number(n)));
  if (!ru) return x === 1 ? f.en[0] : f.en[1];
  const m10 = x % 10;
  const m100 = x % 100;
  if (m10 === 1 && m100 !== 11) return f.ru[0];
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return f.ru[1];
  return f.ru[2];
}
// «5 шагов», «1 минуту», «2 часа»
export const withUnit = (n, kind, ru = true) => fmt(n) + ' ' + plural(n, kind, ru);

// ───────────────────────── переменные в шаблонах ─────────────────────────
// {name} — значение, {name|u} — единица в нужной форме, {name|full} — значение с единицей.
const UNIT_KIND = { steps: 'step', minutes: 'minute', minutesAcc: 'minuteAcc', hours: 'hour', days: 'day', sessions: 'session' };
const UNIT_TEXT = { bpm: ['уд/мин', 'bpm'], ms: ['мс', 'ms'] };

export function display(v, ru = true) {
  if (!v || !v.available) return null;
  switch (v.kind) {
    case 'hoursmin': { const m = Math.round(v.value * 60); return ru ? `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`; }
    case 'temp': return (v.value > 0 ? '+' : '') + v.value + '°';
    case 'score': return v.value + '/100';
    case 'count': return fmt(v.value);
    default: return String(v.value);
  }
}
export function unitOf(v, ru = true) {
  if (!v || !v.available || v.kind !== 'count') return '';
  const kind = UNIT_KIND[v.unit];
  return kind ? plural(v.value, kind, ru) : UNIT_TEXT[v.unit] ? UNIT_TEXT[v.unit][ru ? 0 : 1] : '';
}

export function fill(template, vars, ru = true) {
  return String(template).replace(/\{([a-zA-Z0-9_]+)(?:\|(u|full))?\}/g, (all, name, mode, off, whole) => {
    const v = vars && vars[name];
    let d = display(v, ru);
    // после «: » предложение продолжается строчной буквой («Про тренировку: организм готов…»); «Да!», аббревиатуры не трогаем
    if (d && v.kind === 'text' && off >= 2 && whole.slice(off - 2, off) === ': ' && /^[А-ЯЁA-Z][а-яёa-z]+[ ,—-]/.test(d)) d = d[0].toLowerCase() + d.slice(1);
    if (d == null) return all; // останется плейсхолдером -> валидатор отклонит вариант
    if (mode === 'u') return unitOf(v, ru) || all;
    if (mode === 'full') { const u = unitOf(v, ru); return u ? d + ' ' + u : d; }
    return d;
  });
}
export const varsIn = (tpl) => [...new Set((String(tpl).match(/\{([a-zA-Z0-9_]+)/g) || []).map((x) => x.slice(1)))];

// ───────────────────────── варианты ─────────────────────────
const BLOCK_ORDER = ['reaction', 'main', 'explain', 'action', 'extra', 'clarify'];
const pick = (pair, ru) => (Array.isArray(pair) ? pair[ru ? 0 : 1] : pair && typeof pair === 'object' ? pair[ru ? 'ru' : 'en'] : pair);

// Все переменные, которые нужны варианту: явные needs + {плейсхолдеры} в текстах.
export function variantNeeds(v) {
  const need = new Set(v.needs || []);
  const scan = (x) => varsIn(Array.isArray(x) ? x.join(' ') : typeof x === 'string' ? x : x ? [x.ru, x.en].flat().join(' ') : '').forEach((n) => need.add(n));
  if (v.text) { scan(v.text.ru); scan(v.text.en); }
  if (v.short) { scan(v.short.ru); scan(v.short.en); }
  if (v.blocks) for (const k of Object.keys(v.blocks)) { const b = v.blocks[k]; if (b && !(Array.isArray(b) && b[2])) scan(Array.isArray(b) ? [b[0], b[1]] : b); }
  return [...need];
}
export function hasEnglish(v) {
  if (v.text) return !!(v.text.en && [].concat(v.text.en).some(Boolean));
  if (v.blocks) return Object.values(v.blocks).every((b) => !b || (Array.isArray(b) ? !!b[1] : !!(b.en)));
  return false;
}
export const variantApplies = (v, vars, ru = true) => (ru || hasEnglish(v)) && variantNeeds(v).every((n) => vars && vars[n] && vars[n].available);

// env: { ru, vars, brevity, joke: {text, placement}|null, danger, adviceFirst, wantExplain }
export function assemble(v, env) {
  const ru = env.ru !== false;
  const vars = env.vars || {};
  const brevity = env.brevity || null;
  let paras = [];
  let clarify = null;
  let explained = false;
  if (v.text) {
    const src = brevity === 'short' && v.short ? v.short : v.text;
    paras = [].concat(src[ru ? 'ru' : 'en'] || []).map((x) => fill(x, vars, ru));
    if (v.askLast) clarify = paras[paras.length - 1];
  } else if (v.blocks) {
    const b = v.blocks;
    const want = (k) => {
      if (!b[k]) return false;
      if (brevity === 'short') return k === 'main' || k === 'clarify';
      if (k === 'explain') return brevity === 'detailed' || !!env.wantExplain || !!v.alwaysExplain;
      return true;
    };
    const parts = {};
    for (const k of BLOCK_ORDER) {
      if (!want(k)) continue;
      const spec = b[k];
      const needs = Array.isArray(spec) && Array.isArray(spec[2]) ? spec[2] : [];
      if (needs.some((n) => !vars[n] || !vars[n].available)) continue; // необязательный блок без данных просто пропускаем
      const txt = pick(spec, ru);
      if (!txt) continue;
      parts[k] = fill(txt, vars, ru);
    }
    // совместимость: вопрос в главном блоке — отдельного уточнения не нужно; уточнение всегда последнее; без повторов
    if (parts.main && /\?\s*$/.test(parts.main)) delete parts.clarify;
    if (parts.action && parts.clarify && /\?\s*$/.test(parts.action)) delete parts.action;
    if (env.onlyExplain && parts.explain) { explained = true; for (const k of Object.keys(parts)) if (k !== 'explain' && k !== 'main') delete parts[k]; }
    const seen = new Set();
    for (const k of BLOCK_ORDER) {
      const x = parts[k];
      if (!x || seen.has(x)) continue;
      seen.add(x);
      paras.push(x);
      if (k === 'clarify') clarify = x;
    }
  }
  paras = paras.filter((x) => typeof x === 'string' && x.trim());
  let jokeUsed = false;
  const j = env.joke;
  if (j && j.text && v.humorOk !== false && brevity !== 'short' && paras.length) {
    let place = j.placement || 'lead';
    // при опасности и в ответе-рекомендации (погода) ясный совет идёт первым, шутка — только после него (или её нет)
    const adviceFirst = env.danger || env.adviceFirst;
    if (adviceFirst && place !== 'before_clarify') place = 'closing';
    const last = paras[paras.length - 1] || '';
    if (place === 'closing' && /\?\s*$/.test(last)) place = clarify && paras.length > 1 ? 'before_clarify' : 'lead';
    if (place === 'inline' && paras.length < 2) place = 'lead';
    if (place === 'lead' && adviceFirst) return { paras, jokeUsed: false };
    if (place === 'lead') paras = [j.text, ...paras];
    else if (place === 'inline') paras.splice(1, 0, j.text);
    else if (place === 'before_clarify') paras.splice(paras.length - 1, 0, j.text);
    else paras.push(j.text);
    jokeUsed = true;
  }
  return { paras, jokeUsed, explained };
}

// ───────────────────────── проверка результата ─────────────────────────
const BAD = /(^|[^A-Za-zА-Яа-я0-9_])(undefined|null|NaN|Infinity)([^A-Za-zА-Яа-я0-9_]|$)|\[object|\{[^}]*\}|\$\{|%[sd]|\b[a-z]{2,}_[a-z0-9_]{2,}\b/;
export const badText = (x) => typeof x !== 'string' || !x.trim() || BAD.test(x);

// -> { ok, problems[] }. opts: { maxPara, maxTotal, jokeCount }
export function validate(paras, opts) {
  const o = { maxPara: 520, maxTotal: 1400, jokeCount: 0, ...(opts || {}) };
  const problems = [];
  if (!Array.isArray(paras) || !paras.length) return { ok: false, problems: ['empty'] };
  paras.forEach((x, i) => {
    if (badText(x)) problems.push('bad:' + i);
    else if (x.length > o.maxPara) problems.push('long_para:' + i);
  });
  if (paras.join(' ').length > o.maxTotal) problems.push('long_total');
  if (o.jokeCount > 1) problems.push('jokes');
  return { ok: !problems.length, problems };
}

// Для ответов старых builders: убираем только абзацы с мусором, остальное не трогаем.
export const sanitize = (paras) => (Array.isArray(paras) ? paras.filter((x) => !badText(x)) : []);
