// Датасет LoRA для голоса Хирона. Сначала готовые диалоги docs/coach-demo-dialogs.md
// (их собрал scripts/demoDialogs.js из настоящего движка). Каталог сценариев и
// вопросов кнопками добавляется только если такой реплики пользователя ещё нет.
// Запуск: npx jest --config tools/llm/jest.config.js
import fs from 'fs';
import path from 'path';
import { SCENARIOS } from '../../lib/coach/scenarios';
import { QA } from '../../lib/coach/qa';

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'data');
const DIALOGS = path.join(ROOT, 'docs', 'coach-demo-dialogs.md');

const SYSTEM = 'Ты Хирон — спокойный наставник Epimely. Отвечай на языке человека, коротко, одно–три предложения, без списков и без диагноза. Не выдумывай цифры, которых нет в реплике. Если симптом тревожный, скажи остановиться и обратиться к врачу.';

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const dirty = (s) => /\{[A-Za-z_]/.test(s);

function variantRu(v) {
  if (v.text && v.text.ru) return [].concat(v.text.ru).filter((x) => typeof x === 'string').join('\n');
  const order = ['reaction', 'main', 'explain', 'action', 'extra', 'clarify'];
  const parts = [];
  for (const k of order) {
    const b = v.blocks && v.blocks[k];
    if (!b) continue;
    const ru = Array.isArray(b) ? b[0] : b.ru;
    if (typeof ru === 'string' && ru.trim()) parts.push(ru.trim());
  }
  return parts.join(' ');
}

function parseDialogs(md) {
  const dialogs = [];
  let cur = null;
  let role = null;
  let buf = [];
  const flush = () => {
    if (!cur || !role) return;
    const text = buf.join('\n').replace(/\n+$/g, '').trim();
    if (text) cur.turns.push({ role, text });
    buf = [];
    role = null;
  };
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      flush();
      if (cur && cur.turns.length) dialogs.push(cur);
      cur = { title: line.replace(/^##\s+\d+\.\s+/, '').trim(), turns: [] };
      continue;
    }
    const m = line.match(/^\*\*(Пользователь|Хирон):\*\*\s*(.*)$/);
    if (m) {
      flush();
      role = m[1] === 'Пользователь' ? 'user' : 'assistant';
      buf = [m[2]];
      continue;
    }
    if (role) buf.push(line);
  }
  flush();
  if (cur && cur.turns.length) dialogs.push(cur);
  return dialogs;
}

function row(messages, source, id) {
  return { messages, source, id };
}

test('собирает train/val из диалогов и дыр каталога', () => {
  const seenUser = new Set();
  const examples = [];
  const dialogs = parseDialogs(fs.readFileSync(DIALOGS, 'utf8'));
  expect(dialogs.length).toBeGreaterThan(40);
  for (const d of dialogs) {
    const hist = [];
    let n = 0;
    for (let i = 0; i < d.turns.length; i++) {
      const t = d.turns[i];
      if (t.role === 'user') { hist.push(t); continue; }
      if (!hist.length || hist[hist.length - 1].role !== 'user') continue;
      const user = hist[hist.length - 1].text;
      seenUser.add(norm(user));
      examples.push(row([
        { role: 'system', content: SYSTEM },
        ...hist.slice(0, -1).map((x) => ({ role: x.role, content: x.text })),
        { role: 'user', content: user },
        { role: 'assistant', content: t.text },
      ], 'docs/coach-demo-dialogs.md', d.title + '#' + (++n)));
      hist.push(t);
    }
  }
  const fromDialogs = examples.length;

  let scenarioAdded = 0;
  for (const sc of SCENARIOS) {
    const phrases = [].concat(sc.positives || [], sc.phrasings || []).filter((p) => typeof p === 'string' && p.trim());
    const fresh = phrases.filter((p) => !seenUser.has(norm(p)));
    if (!fresh.length) continue;
    const answer = (sc.variants || []).map(variantRu).find((t) => t && !dirty(t));
    if (!answer) continue;
    const phrase = fresh[0];
    seenUser.add(norm(phrase));
    examples.push(row([
      { role: 'system', content: SYSTEM },
      { role: 'user', content: phrase },
      { role: 'assistant', content: answer },
    ], 'lib/coach/scenarios', sc.id));
    scenarioAdded++;
  }

  let qaAdded = 0;
  for (const q of QA) {
    const ask = q.q && q.q.ru;
    if (!ask || seenUser.has(norm(ask))) continue;
    const short = (q.short || []).map((s) => s && s.ru).find((t) => t && !dirty(t));
    if (!short) continue;
    seenUser.add(norm(ask));
    const messages = [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: ask },
      { role: 'assistant', content: short },
    ];
    const more = q.more && q.more.ru;
    if (more && !dirty(more)) {
      messages.push({ role: 'user', content: 'Подробнее' }, { role: 'assistant', content: more });
    }
    examples.push(row(messages, 'lib/coach/qa', q.id));
    qaAdded++;
  }

  const train = [];
  const val = [];
  for (const ex of examples) {
    const key = ex.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    (hash(key) % 10 === 0 ? val : train).push(ex);
  }
  expect(fromDialogs).toBeGreaterThan(100);
  expect(train.length).toBeGreaterThan(0);
  expect(val.length).toBeGreaterThan(0);
  fs.mkdirSync(OUT, { recursive: true });
  const dump = (name, rows) => fs.writeFileSync(path.join(OUT, name), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  dump('train.jsonl', train);
  dump('val.jsonl', val);
  const stats = {
    dialogs: dialogs.length,
    fromDialogs,
    examples: examples.length,
    train: train.length,
    val: val.length,
    scenarioAdded,
    qaAdded,
    sources: [
      'docs/coach-demo-dialogs.md',
      'scripts/demoDialogs.js',
      'lib/coach/scenarios',
      'lib/coach/qa',
    ],
    note: 'Ветка claude/orchestrator-task-delegation-euwxs5 не содержит файлов, которых нет в main.',
  };
  fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(JSON.stringify(stats));
});
