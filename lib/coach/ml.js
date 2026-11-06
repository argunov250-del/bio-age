// Локальная модель намерений «Хирона»: чистый JavaScript, без native-модулей, сети и зависимостей.
// Хэшированные символьные n-граммы + слова -> мультиномиальная логистическая регрессия (веса int8, масштаб на класс).
// Нормализация — normalize() приложения; хэш FNV-1a 32 по единицам UTF-16 — бит-в-бит как в tools/intent/train.py
// (проверяется __tests__/coachMl.test.js на векторах, экспортированных из Python).
// Модель НЕ участвует в решениях о безопасности: она вызывается движком только после правил и только для маршрутизации.
import { normalize } from './normalize';
import { COACH_CONFIG } from './config';

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const TAG_CHAR = 99; // 'c'
const TAG_WORD = 119; // 'w'
const TAG_BIGRAM = 98; // 'b'
const MAXLEN = 160;

let M = null; // { dim, mask, labels, C, scale, bias, T, Q }

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeB64(str) {
  const lut = new Int16Array(128).fill(-1);
  for (let i = 0; i < 64; i++) lut[B64.charCodeAt(i)] = i;
  let len = str.length;
  while (len > 0 && str.charCodeAt(len - 1) === 61) len--;
  const out = new Int8Array(Math.floor((len * 3) / 4));
  let acc = 0; let bits = 0; let o = 0;
  for (let i = 0; i < len; i++) {
    const v = lut[str.charCodeAt(i)];
    if (v < 0) continue;
    acc = (acc << 6) | v; bits += 6;
    if (bits >= 8) { bits -= 8; out[o++] = (acc >> bits) & 255; acc &= (1 << bits) - 1; }
  }
  return out;
}

// Модель В ПРИЛОЖЕНИЕ НЕ ВХОДИТ (решение владельца: обучающие данные частично созданы ИИ). Её можно подставить только явно:
// setModel(obj) (тесты и tools/intent). Статических/динамических require модели и tools/ в lib/ нет — иначе Metro её упакует.
export function setModel(raw) {
  if (!raw) { M = null; return null; }
  const C = raw.labels.length;
  const Q = decodeB64(raw.w);
  if (Q.length !== raw.dim * C) throw new Error('intent model: bad weights size');
  M = { dim: raw.dim, mask: raw.dim - 1, labels: raw.labels, C, scale: Float64Array.from(raw.scale), bias: Float64Array.from(raw.bias), T: raw.temperature, Q, meta: raw.hash };
  return M;
}
export const hasModel = () => !!M;
export function loadModel() {
  if (!M) throw new Error('intent model: not set (setModel)');
  return M;
}
export const modelLabels = () => loadModel().labels.slice();

function fnvStep(h, u) {
  h = Math.imul(h ^ (u & 255), FNV_PRIME) >>> 0;
  return Math.imul(h ^ (u >>> 8), FNV_PRIME) >>> 0;
}

// Признаки строки norm (уже нормализованной): [индексы по возрастанию, значения] — совпадает с features() в train.py.
export function featuresOf(norm, bits) {
  const mask = (1 << (bits || loadModel().meta.bits)) - 1;
  const n = Math.min(norm.length, MAXLEN);
  const s = new Uint16Array(n + 2);
  s[0] = 32; s[n + 1] = 32;
  for (let i = 0; i < n; i++) s[i + 1] = norm.charCodeAt(i);
  const cnt = new Map();
  const add = (h) => { const i = (h & mask) >>> 0; cnt.set(i, (cnt.get(i) || 0) + 1); };
  const L = n + 2;
  for (let k = 2; k <= 5; k++) {
    for (let i = 0; i + k <= L; i++) {
      let h = fnvStep(FNV_OFFSET, TAG_CHAR);
      for (let j = 0; j < k; j++) h = fnvStep(h, s[i + j]);
      add(h);
    }
  }
  // слова (разделитель — пробел); границы слов в s[1..n]
  const words = [];
  let st = -1;
  for (let i = 1; i <= n; i++) {
    if (s[i] === 32) { if (st >= 0) { words.push([st, i]); st = -1; } } else if (st < 0) st = i;
  }
  if (st >= 0) words.push([st, n + 1]);
  const wordHash = (h, a, b) => { for (let i = a; i < b; i++) h = fnvStep(h, s[i]); return h; };
  for (const [a, b] of words) add(wordHash(fnvStep(FNV_OFFSET, TAG_WORD), a, b));
  const BEG = 94; const END = 36;
  for (let i = 0; i <= words.length; i++) {
    let h = fnvStep(FNV_OFFSET, TAG_BIGRAM);
    if (i === 0) h = fnvStep(h, BEG); else h = wordHash(h, words[i - 1][0], words[i - 1][1]);
    h = fnvStep(h, 1);
    if (i === words.length) h = fnvStep(h, END); else h = wordHash(h, words[i][0], words[i][1]);
    add(h);
  }
  const idx = Array.from(cnt.keys()).sort((a, b) => a - b);
  const val = idx.map((i) => 1 + Math.log(cnt.get(i)));
  let nrm = 0;
  for (const v of val) nrm += v * v;
  nrm = Math.sqrt(nrm) || 1;
  return [idx, val.map((v) => v / nrm)];
}

// Вероятности по всем классам (Float64Array длиной C).
export function probsOf(norm) {
  const m = loadModel();
  const [idx, val] = featuresOf(norm, m.meta.bits);
  const z = new Float64Array(m.C);
  for (let k = 0; k < idx.length; k++) {
    const row = idx[k] * m.C; const v = val[k];
    for (let c = 0; c < m.C; c++) z[c] += v * m.Q[row + c];
  }
  let mx = -Infinity;
  for (let c = 0; c < m.C; c++) { z[c] = (z[c] * m.scale[c] + m.bias[c]) / m.T; if (z[c] > mx) mx = z[c]; }
  let sum = 0;
  for (let c = 0; c < m.C; c++) { z[c] = Math.exp(z[c] - mx); sum += z[c]; }
  for (let c = 0; c < m.C; c++) z[c] /= sum;
  return z;
}

// Предсказание для сырой реплики. k — сколько лучших вернуть. Детерминировано.
// нет модели или COACH_CONFIG.ml выключен -> null.
// -> { norm, top: [{ label, p }], p, margin } ; для пустого текста — null.
export function predict(raw, k) {
  if (!COACH_CONFIG.ml || !M) return null;
  const norm = normalize(raw);
  if (!norm) return null;
  const m = M;
  const p = probsOf(norm);
  const kk = k || 3;
  const order = Array.from({ length: m.C }, (_, i) => i).sort((a, b) => p[b] - p[a] || a - b).slice(0, kk);
  const top = order.map((i) => ({ label: m.labels[i], p: p[i] }));
  return { norm, top, p: top[0].p, margin: top[0].p - (top[1] ? top[1].p : 0) };
}

// ───────────── маршрутизация предсказания (правила уже отработали) ─────────────
const CONTROL_OF = { ctl_short: 'short', ctl_detailed: 'detailed', ctl_simpler: 'simpler', ctl_repeat: 'repeat', ctl_norepeat: 'norepeat', ctl_why: 'why', ctl_other: 'other', ctl_thanks: 'thanks', ctl_nojokes: 'nojokes', ctl_funnier: 'funnier' };
const NO_ROUTE = new Set(['other', 'ctl_ok', 'ctl_yes', 'ctl_no', 'data_user_stated', 'wx_other_place', 'wx_missing_field', 'wx_geo_denied', 'wx_walk', 'legacy_weather_train']);
const SENS = new Set(['sens_safety', 'sens_treatment', 'sens_support']);
export const isSensLabel = (l) => SENS.has(l);

// Описание маршрута по метке или null. Не знает о состоянии диалога: движок решает, допустим ли маршрут.
export function describeRoute(label) {
  if (!label || NO_ROUTE.has(label)) return null;
  if (SENS.has(label)) return { kind: 'sens', label };
  if (CONTROL_OF[label]) return { kind: 'control', control: CONTROL_OF[label], label };
  if (label === 'wx_now' || label === 'wx_forecast' || label === 'wx_train') return { kind: 'weather', which: label, label };
  if (label.indexOf('legacy_') === 0) return { kind: 'legacy', topic: label.slice(7), label };
  return { kind: 'scenario', id: label, label };
}
