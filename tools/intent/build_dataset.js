#!/usr/bin/env node
// Сборка датасета намерений для локальной модели «Хирона».
//   node tools/intent/build_dataset.js
// Источники: positives сценариев (lib/coach/scenarios), ручные реплики для старых тем/намерений, чувствительных классов
// и «прочего» (tools/intent/extra_phrases.js), негативы сценариев (только если конвейер правил считает их «прочим»).
// Сплит train/val/test делается по ИСХОДНОЙ реплике (нормализованной), аугментации не утекают между выборками.
// Выход: tools/intent/data/{train,val,test}.jsonl, labels.json, stats.json. Детерминирован (фиксированный сид).
const fs = require('fs');
const path = require('path');
const P = require('./pipeline');
const { augment, rng, TYPO_KINDS } = require('./augment');
const EXTRA = require('./extra_phrases');
const AUTHORED = require('./authored_phrases');

const SEED = 'hiron-intent-v1';
const OUT = path.join(__dirname, 'data');
const N_AUG = { train: 14, val: 5, test: 6 };
P.COACH_CONFIG.ml = false; // метки правил считаем без модели

const norm = (t) => P.normalize(t);
const orig = []; // {text, label, src, id}
for (const sc of P.SCENARIOS) {
  for (const t of sc.positives || []) orig.push({ text: t, label: P.canonScenario(sc.id), src: 'scenario', id: sc.id });
}
const scenarioCount = orig.length;
const dropped = { extra_inconsistent: 0, conflicts: 0 };
for (const [label, list] of Object.entries(EXTRA)) {
  for (const t of list) {
    if (P.routeLabel(t) === label) orig.push({ text: t, label, src: 'extra', id: label });
    else dropped.extra_inconsistent++;
  }
}
// негативы сценариев: метка = куда их ведёт конвейер правил (жёсткие контрпримеры: «не хочу отдыхать», «пропустил обед»);
// те, что правила считают «прочим», всегда идут в train (контракт: модель не должна на них срабатывать)
for (const sc of P.SCENARIOS) {
  for (const t of sc.negatives || []) orig.push({ text: t, label: P.routeLabel(t), src: 'negative', id: sc.id });
}
// фрагменты без намерения (ответы-обрывки вне диалога): всегда в train как «прочее»
for (const t of ['в google fit', 'в apple health', 'на часах', 'в телефоне', 'в приложении', 'вот это да', 'и что', 'не знаю что', 'а потом', 'то же самое', 'на работе', 'вот так', 'ну и что', 'потому что', 'и всё', 'а ещё', 'in google fit', 'on my watch', 'in the app', 'so what', 'and then', 'at work', 'the same', 'this one', 'хорошо что так', 'вчера был дождь', 'прошлым летом было жарко', 'в прошлом году', 'мой друг бегает']) if (P.routeLabel(t) === 'other') orig.push({ text: t, label: 'other', src: 'fragment', id: 'fragment' });
// авторские перефразировки: метка доверяется автору (без проверки правилами); конфликты по тексту отсеет дедуп
for (const [label, list] of Object.entries(AUTHORED)) for (const t of list) orig.push({ text: t, label, src: 'authored', id: label });
// реплики из тестов и демо-диалогов: метка = то, куда их ведёт конвейер правил на чистом тексте (не 'other': неизвестное не размечаем)
function harvest() {
  const out = new Set();
  const root = path.join(__dirname, '..', '..');
  const files = fs.readdirSync(path.join(root, '__tests__')).filter((f) => /^coach.*\.test\.js$/.test(f) && f !== 'coachMl.test.js').map((f) => path.join(root, '__tests__', f));
  files.push(path.join(root, 'scripts', 'demoDialogs.js'));
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const re = /'((?:[^'\\\n]|\\.){3,70})'|"((?:[^"\\\n]|\\.){3,70})"/g;
    let m;
    while ((m = re.exec(src))) out.add(m[1] || m[2]);
  }
  const demo = path.join(root, 'docs', 'coach-demo-dialogs.md');
  if (fs.existsSync(demo)) for (const l of fs.readFileSync(demo, 'utf8').split('\n')) { const m = l.match(/^\*\*(?:Пользователь|User):\*\* (.+)$/); if (m) out.add(m[1]); }
  return [...out].filter((t) => /[a-zа-яё]/i.test(t) && !/[«»:#%\\{}<>=/_]|\.js/.test(t) && t.split(' ').length <= 12);
}
let harvested = 0;
for (const t of harvest()) {
  const lab = P.routeLabel(t);
  if (lab !== 'other' && !/^wx_other_place$/.test(lab)) { orig.push({ text: t, label: lab, src: 'harvest', id: 'harvest' }); harvested++; }
}
// клавиатурная каша -> other
const rr = rng(SEED + 'gib');
const KB = ['йцукенгшщз', 'фывапролдж', 'ячсмитьбю', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
for (let i = 0; i < 30; i++) {
  const row = KB[Math.floor(rr() * KB.length)];
  const a = Math.floor(rr() * 3); const len = 4 + Math.floor(rr() * 5);
  const g = row.slice(a, a + len);
  if (P.routeLabel(g) === 'other') orig.push({ text: g, label: 'other', src: 'gibberish', id: 'gibberish' });
}
for (const t of ['!!!', '???', '...', 'хмм', 'эээ', 'ааааа', 'asdf', '12345', '🙂', 'ъъъъ']) if (P.routeLabel(t) === 'other') orig.push({ text: t, label: 'other', src: 'gibberish', id: 'gibberish' });

// дедуп по нормализованному тексту; конфликт меток -> выбрасываем все
const byNorm = new Map();
for (const o of orig) { const n = norm(o.text); if (!n) continue; (byNorm.get(n) || byNorm.set(n, []).get(n)).push(o); }
const items = [];
for (const [n, arr] of byNorm) {
  const labels = new Set(arr.map((x) => x.label));
  if (labels.size > 1) { dropped.conflicts += arr.length; continue; }
  items.push({ ...arr[0], norm: n });
}
// сплит по исходной реплике, стратифицированно по метке (детерминированный порядок по хэшу)
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const byLabel = {};
for (const it of items) (byLabel[it.label] = byLabel[it.label] || []).push(it);
for (const [label, arr] of Object.entries(byLabel)) {
  arr.sort((a, b) => hash(SEED + a.norm) - hash(SEED + b.norm));
  const n = arr.length;
  const nTest = n >= 3 ? Math.max(1, Math.round(n * 0.2)) : 0;
  const nVal = n >= 4 ? Math.max(1, Math.round(n * 0.15)) : 0;
  arr.forEach((it, i) => { it.split = i < nTest ? 'test' : i < nTest + nVal ? 'val' : 'train'; });
  if (label === 'other') { const keep = arr.filter((it) => it.src === 'negative' || it.src === 'fragment'); keep.forEach((it) => { it.split = 'train'; }); }
}
const rows = { train: [], val: [], test: [] };
const seen = new Set();
const push = (split, it, text, kinds) => {
  const n = norm(text);
  if (!n || seen.has(n)) return;
  seen.add(n);
  const row = { text, norm: n, label: it.label, src: it.src, orig: it.id + '|' + it.norm, aug: kinds };
  if (split !== 'train') row.rules = P.routeLabel(text);
  rows[split].push(row);
};
// «Проверенные» чистые мутации: убрать/добавить слово, подставить слово или половину фразы из другой реплики ТОЙ ЖЕ метки и ТОГО ЖЕ
// сплита; оставляем только те, что конвейер правил по-прежнему относит к исходной метке (смысл подтверждён правилами).
const N_MUT = { train: 12, val: 4, test: 5 };
const FILLERS = ['вообще', 'сегодня', 'пожалуйста', 'мне', 'как', 'а', 'ну', 'тогда', 'просто', 'тоже', 'ещё', 'уже', 'really', 'today', 'just', 'please', 'so', 'then'];
const pool = {};
for (const it of items) (pool[it.split + '|' + it.label] = pool[it.split + '|' + it.label] || []).push(it);
const mutate = (it, r) => {
  const w = it.text.split(/\s+/);
  const mates = pool[it.split + '|' + it.label];
  const other = mates[Math.floor(r() * mates.length)].text.split(/\s+/);
  const k = Math.floor(r() * 5);
  const o = w.slice();
  if (k === 0 && w.length > 2) o.splice(Math.floor(r() * w.length), 1);
  else if (k === 1) o.splice(Math.floor(r() * (w.length + 1)), 0, FILLERS[Math.floor(r() * FILLERS.length)]);
  else if (k === 2) o.splice(Math.floor(r() * (w.length + 1)), 0, other[Math.floor(r() * other.length)]);
  else if (k === 3) return w.slice(0, Math.ceil(w.length / 2)).concat(other.slice(Math.floor(other.length / 2))).join(' ');
  else o[Math.floor(r() * o.length)] = other[Math.floor(r() * other.length)];
  return o.join(' ');
};
const mutants = []; // {it, text}
let mutTried = 0;
for (const it of items) {
  if (it.label === 'other' && it.src !== 'extra') continue;
  const r = rng(SEED + 'mut' + it.norm);
  const got = new Set();
  for (let t = 0; t < N_MUT[it.split] * 12 && got.size < N_MUT[it.split]; t++) {
    const m = mutate(it, r); mutTried++;
    const n = norm(m);
    if (!n || n === it.norm || got.has(n) || byNorm.has(n)) continue;
    if (P.routeLabel(m) === it.label) { got.add(n); mutants.push({ it, text: m }); }
  }
}
// сначала все исходные и мутации (чтобы аугментация не заняла их нормализованный вид), потом опечатки/разговорные формы
for (const it of items) push(it.split, it, it.text, []);
for (const m of mutants) push(m.it.split, m.it, m.text, ['mut']);
for (const it of items) for (const a of augment(it.text, N_AUG[it.split], SEED)) push(it.split, it, a.text, a.kinds);
for (const m of mutants) for (const a of augment(m.text, m.it.split === 'train' ? 1 : 1, SEED + 'm', { maxSteps: 2 })) push(m.it.split, m.it, a.text, ['mut', ...a.kinds]);
// аугментация не должна менять смысл на чужой: проверка ради безопасности датасета — смотрим, что нормализация не пустая и метка не 'other' становится не-other сама (не проверяем: метка наследуется от исходной)
fs.mkdirSync(OUT, { recursive: true });
for (const [k, v] of Object.entries(rows)) fs.writeFileSync(path.join(OUT, k + '.jsonl'), v.map((r) => JSON.stringify(r)).join('\n') + '\n');
const XTEXTS = ['Привет 😀 как дела?', 'ё'.repeat(5) + ' ёж', 'ab'.repeat(150), 'тренироваться 👍 сегодня', '100% -5 +3', "don't want", 'ЫЫЫ'];
fs.writeFileSync(path.join(OUT, 'xcheck_norm.json'), JSON.stringify(Object.fromEntries(XTEXTS.map((t) => [t, norm(t)])), null, 1));
const labels = [...new Set(items.map((i) => i.label))].sort();
fs.writeFileSync(path.join(OUT, 'labels.json'), JSON.stringify(labels, null, 1));
const stats = { mutantsKept: mutants.length, mutantsTried: mutTried, seed: SEED, originals: items.length, scenarioPositives: scenarioCount, dropped, harvested, labels: labels.length, rows: Object.fromEntries(Object.entries(rows).map(([k, v]) => [k, v.length])), originalsPerSplit: Object.fromEntries(['train', 'val', 'test'].map((s) => [s, items.filter((i) => i.split === s).length])), perLabelOriginals: Object.fromEntries(labels.map((l) => [l, byLabel[l].length])) };
fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 1));
console.log(JSON.stringify({ ...stats, perLabelOriginals: undefined }));
