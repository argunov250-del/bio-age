// Нечёткое понимание без модели (детерминированные правила):
//  1) repairText(raw) — исправляет опечатки в словах, которых нет в словаре: расстояние Дамерау — Левенштейна ≤1 для слов ≥5 букв,
//     ≤2 для ≥9, «склеенные» слова («объясниподробнее»), неверная раскладка клавиатуры («ktym» -> «лень»). Чужие слова,
//     имена с заглавной и числа не трогает.
//  2) lexMatch(raw) — сравнение с фразами сценариев (positives) на уровне основ и понятий лексикона, взвешенный Жаккар (idf);
//     возвращает сценарий только при уверенности (порог и отрыв), иначе null -> «не понял / уточни».
// Безопасность выше по конвейеру: сюда чувствительные сообщения не попадают (см. coachBrain.reply и engine.route).
import { normalize } from './normalize';
import { SCENARIOS } from './scenarios';
import { stem, conceptOf, LEXICON_WORDS, COMMON_WORDS, VALID_WORDS, dl, maxEdits } from './lexicon';

const STOP = new Set(['я', 'мне', 'мой', 'моя', 'мои', 'у', 'в', 'во', 'на', 'и', 'а', 'но', 'то', 'это', 'эти', 'ты', 'мы', 'ли', 'же', 'бы', 'вот', 'ну', 'так', 'уже', 'еще', 'да', 'the', 'a', 'an', 'my', 'i', 'to', 'is', 'it', 'of', 'me', 'and', 'you', 'do', 'am', 'are', 'pls', 'please', 'пожалуйста', 'hi', 'эй', 'слушай', 'короче', 'блин', 'вообще', 'btw', 'lol']);
const wordsOf = (norm) => (norm ? norm.split(' ').filter(Boolean) : []);

let IDX = null;
function build() {
  const vocab = new Map(); // слово -> вес
  const add = (w, wt) => { if (/^[a-zа-я]{3,}$/.test(w)) vocab.set(w, (vocab.get(w) || 0) + wt); };
  const phrases = [];
  const df = new Map();
  const featOf = (w) => { const c = conceptOf(w); return c ? 'c:' + c : stem(w); };
  const feats = (norm) => { const s = new Set(); for (const w of wordsOf(norm)) if (!STOP.has(w)) s.add(featOf(w)); return s; };
  for (const w of LEXICON_WORDS) add(w, 3);
  for (const w of COMMON_WORDS) add(w.replace(/ё/g, 'е'), 2);
  const textsOf = (v) => (v.text ? [].concat(v.text.ru || [], v.text.en || []) : Object.values(v.blocks || {}).filter(Boolean).flatMap((b) => (Array.isArray(b) ? b.slice(0, 2) : [b.ru, b.en])).filter((x) => typeof x === 'string'));
  for (const sc of SCENARIOS) {
    const skip = sc.sensitive || ['sensitive', 'hold', 'quests', 'follow', 'scope', 'weather'].includes(sc.group) || /^(ctl_(yes|no|ok)|wx_)/.test(sc.id);
    for (const ph of [...sc.positives, ...(sc.negatives || [])]) for (const w of wordsOf(normalize(ph))) add(w, 3);
    for (const v of sc.variants) for (const t of textsOf(v)) for (const w of wordsOf(normalize(t))) add(w, 1);
    if (skip) continue;
    for (const ph of sc.positives) {
      const f = feats(normalize(ph));
      if (!f.size) continue;
      phrases.push({ id: sc.id, f });
      for (const k of f) df.set(k, (df.get(k) || 0) + 1);
    }
    for (const ph of sc.negatives || []) { const f = feats(normalize(ph)); if (f.size) phrases.push({ id: sc.id, f, neg: true }); }
  }
  const N = phrases.length || 1;
  const idf = (k) => Math.log(1 + N / (df.get(k) || 0.5));
  const inv = new Map();
  phrases.forEach((p, i) => { for (const k of p.f) { if (!inv.has(k)) inv.set(k, []); inv.get(k).push(i); } });
  const byLen = new Map();
  for (const w of vocab.keys()) { const l = w.length; if (!byLen.has(l)) byLen.set(l, []); byLen.get(l).push(w); }
  const valid = new Set(VALID_WORDS.map((w) => w.replace(/ё/g, 'е')));
  for (const w of valid) add(w, 1);
  const stems = new Set([...vocab.keys(), ...valid].map(stem));
  IDX = { valid, vocab, byLen, stems, phrases, inv, idf, feats, featOf, N, maxIdf: idf(null) };
  return IDX;
}
const idx = () => IDX || build();
export const resetMatchIndex = () => { IDX = null; };

const known = (I, w) => I.vocab.has(w) || I.valid.has(w) || I.stems.has(stem(w)) || !!conceptOf(w);

const ROWS = ['йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const adjacent = (a, b) => ROWS.some((r) => { const i = r.indexOf(a); const j = r.indexOf(b); return i >= 0 && j >= 0 && Math.abs(i - j) === 1; });
// Замена одной буквы допустима только между соседними клавишами («смеха» -> «смена» не опечатка); вставка, пропуск и перестановка — всегда.
function plausible(w, c) {
  if (w.length !== c.length) return true;
  let i = 0; while (w[i] === c[i]) i++;
  if (w[i] === c[i + 1] && w[i + 1] === c[i]) return true; // перестановка
  let j = w.length - 1; while (w[j] === c[j]) j--;
  if (i === j) return adjacent(w[i], c[i]) || (/[аеиоуыэюяaeiou]/.test(w[i]) && /[аеиоуыэюяaeiou]/.test(c[i])); // гласная на гласную — фонетическая опечатка
  return true;
}
// Ближайшее слово словаря: min правок; при равенстве разных основ — не исправляем (null); для 2 правок первая буква совпадает.
function fuzzy(I, w) {
  const k = maxEdits(w.length);
  if (!k) return null;
  const cands = []; let bd = k + 1;
  for (let l = w.length - k; l <= w.length + k; l++) {
    const arr = I.byLen.get(l);
    if (!arr) continue;
    for (const c of arr) {
      if (c === w) continue;
      const d = dl(w, c, k);
      if (d > k) continue;
      if (d === 2 && c[0] !== w[0]) continue;
      if (d === 1 && !plausible(w, c)) continue;
      if (d < bd) bd = d;
      cands.push([c, d, I.vocab.get(c)]);
    }
  }
  const top = cands.filter((x) => x[1] === bd).sort((x, y) => y[2] - x[2] || (x[0] < y[0] ? -1 : 1));
  if (!top.length) return null;
  const best = top[0];
  // конфликт: другой корень с сопоставимым весом -> не исправляем (формы одного корня конфликтом не считаются)
  const rival = top.find((x) => x !== best && !(stem(x[0]) === stem(best[0]) || (x[0].length >= 5 && x[0].slice(0, 3) === best[0].slice(0, 3))) && x[2] * 2 > best[2]);
  return rival ? null : best[0];
}

const LAT = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const CYR = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const LAYOUT = Object.fromEntries([...LAT].map((c, i) => [c, CYR[i]]));
const fromLayout = (t) => [...t.toLowerCase()].map((c) => LAYOUT[c] || c).join('');

// Исправление одного слова: словарь -> раскладка -> нечёткое -> разделение склейки. null = оставить как есть.
function fixWord(I, raw) {
  const w = normalize(raw);
  if (!w || w.includes(' ') || /\d|'/.test(w)) return null;
  if (/^[a-z,.;'\[\]`]+$/i.test(raw) && !/^[a-z]+$/i.test(raw) && raw.length >= 3) { // «,tp» — явная раскладка
    const c = normalize(fromLayout(raw));
    if (c && known(I, c)) return c;
  }
  if (w.length < 4 || known(I, w)) return null;
  if (/^[a-z]+$/.test(w)) {
    const c = normalize(fromLayout(w));
    if (c.length >= 3 && I.vocab.has(c) && !I.vocab.has(w)) return c; // «ktym» -> «лень»
  }
  const f = fuzzy(I, w);
  if (f) return f;
  if (w.length >= 7) { // склейка: «объясниподробнее»
    for (let i = 3; i <= w.length - 3; i++) {
      const a = w.slice(0, i); const b = w.slice(i);
      const fa = I.vocab.has(a) || (a.length >= 5 && fuzzy(I, a));
      const fb = I.vocab.has(b) || (b.length >= 5 && fuzzy(I, b));
      if (fa && fb && (a.length >= 4 || I.vocab.has(a)) && (b.length >= 4 || I.vocab.has(b))) return (I.vocab.has(a) ? a : fuzzy(I, a)) + ' ' + (I.vocab.has(b) ? b : fuzzy(I, b));
    }
  }
  return null;
}

// -> исправленная строка (или исходная, если менять нечего).
export function repairText(raw) {
  if (typeof raw !== 'string' || !raw.trim() || raw.length > 400) return raw;
  const I = idx();
  let changed = false;
  let first = true;
  const out = raw.replace(/[A-Za-zА-Яа-яЁё,.;'`\[\]]+/g, (tok) => {
    const wasFirst = first; first = false;
    // имена и города с заглавной буквы (не в начале) оставляем: «погода в Омске»
    if (!wasFirst && /^[A-ZА-ЯЁ][a-zа-яё]+$/.test(tok)) return tok;
    const core = tok.replace(/^[,.;'`\[\]]+(?=[A-Za-zА-Яа-яЁё])|(?<=[A-Za-zА-Яа-яЁё])[.;]+$/g, '');
    const lead = tok.slice(0, tok.indexOf(core)); const tail = tok.slice(lead.length + core.length);
    const r = fixWord(I, core);
    if (r == null || r === core.toLowerCase()) return tok;
    changed = true;
    return lead + r + tail;
  });
  return changed ? out : raw;
}

// -> { id, score, margin } для лучшего сценария или null. Пороги подобраны по val (tools/intent/eval_rules.js).
export const LEX = { minScore: 0.3, minMargin: 0.05 };
export function lexMatch(raw) {
  const I = idx();
  const norm = normalize(repairText(raw));
  const q = I.feats(norm);
  if (!q.size) return null;
  const wq = new Map(); let sq = 0;
  for (const k of q) { const w = I.inv.has(k) ? I.idf(k) : I.idf(null) * 0.6; wq.set(k, w); sq += w; }
  const seen = new Set(); const best = new Map(); const bestNeg = new Map(); const cover = new Map();
  for (const k of q) {
    for (const i of I.inv.get(k) || []) {
      if (seen.has(i)) continue;
      seen.add(i);
      const p = I.phrases[i];
      let inter = 0; let sp = 0;
      for (const f of p.f) { const w = I.idf(f); sp += w; if (q.has(f)) inter += w; }
      const sc = inter / (sq + sp - inter);
      if (p.neg) { if (sc > (bestNeg.get(p.id) || 0)) bestNeg.set(p.id, sc); continue; }
      if (sc > (best.get(p.id) || 0)) { best.set(p.id, sc); cover.set(p.id, inter / sq); }
    }
  }
  // фраза, которая в каталоге помечена как НЕ этот сценарий, и покрытие слов запроса защищают от ложных срабатываний
  for (const [id, sc] of best) if ((bestNeg.get(id) || 0) >= sc || cover.get(id) < 0.6) best.delete(id);
  const r = [...best.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  if (!r.length) return null;
  const margin = r[0][1] - (r[1] ? r[1][1] : 0);
  if (q.size <= 2 && r[0][1] < 0.6) return null; // два слова без контекста: слишком шатко («в Google Fit»)
  return { id: r[0][0], score: r[0][1], margin };
}
