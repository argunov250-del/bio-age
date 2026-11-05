// Аугментации реплик (детерминированные: сид + текст). Имитируют опечатки, разговорную речь и ошибки ввода.
const RU_ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю'];
const EN_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const NEIGH = {};
for (const rows of [RU_ROWS, EN_ROWS]) {
  rows.forEach((row, r) => [...row].forEach((ch, i) => {
    const n = [];
    if (row[i - 1]) n.push(row[i - 1]);
    if (row[i + 1]) n.push(row[i + 1]);
    for (const rr of [r - 1, r + 1]) if (rows[rr]) { if (rows[rr][i]) n.push(rows[rr][i]); if (rows[rr][i + 1]) n.push(rows[rr][i + 1]); }
    NEIGH[ch] = n;
  }));
}
const RU_KEYS = 'йцукенгшщзхъфывапролджэячсмитьбю';
const EN_KEYS = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const TO_EN = {}; const TO_RU = {};
[...RU_KEYS].forEach((c, i) => { TO_EN[c] = EN_KEYS[i]; TO_RU[EN_KEYS[i]] = c; });

function rng(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, a) => a[Math.floor(r() * a.length)];
const isLetter = (c) => /[a-zа-яё]/i.test(c);

const FILL_PRE = ['слушай, ', 'а ', 'ну ', 'короче, ', 'эй, ', 'слушай а ', 'ну вот ', 'так, ', 'хирон, ', 'слушай хирон, ', 'а вот ', 'блин, ', 'hey, ', 'so ', 'well, ', 'hey chiron, ', 'ok so ', 'um '];
const FILL_POST = [' пожалуйста', ' плиз', ' а?', ' да?', ' ну', ' что ли', ' вообще', ' кстати', ' блин', ' please', ' pls', ' lol', ' or what', ' btw', ' )', ' ))'];
const COLLOQ = [[/сегодня/g, 'седня'], [/сегодня/g, 'сёдня'], [/сейчас/g, 'щас'], [/что /g, 'чё '], [/что /g, 'шо '], [/пожалуйста/g, 'пжлст'], [/тренироваться/g, 'тренить'], [/тренировка/g, 'трена'], [/тренировк/g, 'трень'], [/спасибо/g, 'спс'], [/почему/g, 'чего'], [/привет/g, 'прив'], [/хочу/g, 'хачу'], [/нормально/g, 'норм'], [/пожалуйста/g, 'плиз'], [/сколько/g, 'скока'], [/можно/g, 'мона'], [/пробежка/g, 'побегушки'], [/сколько нужно/g, 'скока надо'], [/\bwant to\b/g, 'wanna'], [/\bgoing to\b/g, 'gonna'], [/\byou\b/g, 'u'], [/\bplease\b/g, 'plz'], [/\bthanks\b/g, 'thx']];

function wordSpans(s) { const out = []; const re = /[a-zа-яё]+/gi; let m; while ((m = re.exec(s))) out.push([m.index, m.index + m[0].length]); return out; }
function editWord(s, r, fn, minLen) {
  const sp = wordSpans(s).filter(([a, b]) => b - a >= (minLen || 4));
  if (!sp.length) return null;
  const [a, b] = pick(r, sp);
  const w = s.slice(a, b);
  const nw = fn(w);
  return nw == null || nw === w ? null : s.slice(0, a) + nw + s.slice(b);
}
const KINDS = {
  swap: (s, r) => editWord(s, r, (w) => { const i = 1 + Math.floor(r() * (w.length - 2)); return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); }, 4),
  del: (s, r) => editWord(s, r, (w) => { const i = 1 + Math.floor(r() * (w.length - 1)); return w.slice(0, i) + w.slice(i + 1); }, 4),
  dup: (s, r) => editWord(s, r, (w) => { const i = Math.floor(r() * w.length); return w.slice(0, i) + w[i] + w.slice(i); }, 3),
  key: (s, r) => editWord(s, r, (w) => { const i = Math.floor(r() * w.length); const n = NEIGH[w[i].toLowerCase()]; return n && n.length ? w.slice(0, i) + pick(r, n) + w.slice(i + 1) : null; }, 4),
  vowel: (s, r) => editWord(s, r, (w) => { const v = [...w].map((c, i) => ('аеиоуыэюяaeiou'.includes(c) ? i : -1)).filter((i) => i >= 0); if (!v.length) return null; const i = pick(r, v); const sw = { а: 'о', о: 'а', е: 'и', и: 'е', я: 'е', e: 'a', a: 'e', o: 'a', u: 'o' }[w[i]]; return sw ? w.slice(0, i) + sw + w.slice(i + 1) : null; }, 4),
  nospace: (s, r) => { const ix = [...s].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i >= 0); if (!ix.length) return null; const i = pick(r, ix); return s.slice(0, i) + s.slice(i + 1); },
  yo: (s) => s.replace(/е/g, (c, i) => (i % 2 ? 'ё' : c)),
  punct: (s, r) => pick(r, [s + '?', s + '!', s + '...', s + '??', '...' + s, s + ' ?!', s.replace(/ /g, ', '), s + '.']),
  caps: (s, r) => pick(r, [s.toUpperCase(), s[0].toUpperCase() + s.slice(1)]),
  pre: (s, r) => pick(r, FILL_PRE) + s,
  post: (s, r) => s + pick(r, FILL_POST),
  order: (s, r) => { const w = s.split(' '); if (w.length < 2 || w.length > 8) return null; if (r() < 0.5) { const i = Math.floor(r() * (w.length - 1)); [w[i], w[i + 1]] = [w[i + 1], w[i]]; return w.join(' '); } w.unshift(w.pop()); return w.join(' '); },
  colloq: (s, r) => { const c = COLLOQ.filter(([rx]) => { rx.lastIndex = 0; return rx.test(s.toLowerCase()); }); if (!c.length) return null; const [rx, to] = pick(r, c); rx.lastIndex = 0; return s.toLowerCase().replace(rx, to); },
  layout: (s) => { const lo = s.toLowerCase(); const ru = [...lo].filter((c) => TO_EN[c]).length; if (ru < lo.length / 2) return null; return [...lo].map((c) => TO_EN[c] || c).join(''); },
  dropw: (s, r) => { const w = s.split(' '); if (w.length < 3) return null; w.splice(Math.floor(r() * w.length), 1); return w.join(' '); },
};
const KIND_NAMES = Object.keys(KINDS);
// «Лёгкие» виды для метрик «опечатки»; остальные — «разговорные»
const TYPO_KINDS = ['swap', 'del', 'dup', 'key', 'vowel', 'nospace', 'layout'];

// Вернуть до n уникальных вариантов [{text, kinds:[...]}]
function augment(text, n, seed, opts) {
  const r = rng(seed + '|' + text);
  const o = opts || {};
  const weights = o.weights || { swap: 4, del: 4, dup: 2, key: 4, vowel: 3, nospace: 3, yo: 1, punct: 3, caps: 1, pre: 4, post: 3, order: 2, colloq: 3, layout: 1, dropw: 1 };
  const bag = [];
  for (const [k, w] of Object.entries(weights)) for (let i = 0; i < w; i++) bag.push(k);
  const out = new Map();
  for (let tries = 0; tries < n * 8 && out.size < n; tries++) {
    const steps = 1 + Math.floor(r() * (o.maxSteps || 3));
    let s = text; const used = [];
    for (let i = 0; i < steps; i++) {
      const k = pick(r, bag);
      const t = KINDS[k](s, r);
      if (t && t !== s && t.trim()) { s = t; used.push(k); }
    }
    if (used.length && s !== text && !out.has(s)) out.set(s, used);
  }
  return [...out].map(([t, kinds]) => ({ text: t, kinds }));
}
module.exports = { rng, augment, KIND_NAMES, TYPO_KINDS };
