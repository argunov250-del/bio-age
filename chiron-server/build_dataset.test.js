// Датасет чата для LoRA Хирона. Основа — каталог вопросов (answerQuestion):
// русский и английский, источники, перефразировки. Безопасность — из готовых
// сценариев (sensitive и отказ от диагноза), без новых медицинских советов.
// Запуск: npx jest --config chiron-server/jest.config.js
import fs from 'fs';
import path from 'path';
import { makeEnv, answerQuestion } from '../lib/coach/qaEngine';
import { QA } from '../lib/coach/qa';
import { SCENARIOS } from '../lib/coach/scenarios';

const OUT = path.join(__dirname, 'data');
const SYSTEM = 'Ты Хирон, спокойный наставник Epimely. По умолчанию отвечай по-русски; если человек пишет по-английски, отвечай по-английски. Коротко, одно–три предложения, без списков. Не ставь диагнозов и не назначай лечение. Если в ответе есть источник, назови его. При тревожном симптоме скажи остановиться и обратиться к врачу или в экстренную службу.';

const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const dirty = (s) => /\{[A-Za-z_]/.test(s);

const FULL = {
  chrono: 40, bio: 38,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: {
    steps: { 7: { status: 'ok', value: 8000 } },
    sleepDuration: { 7: { status: 'ok', value: 7.4 } },
    restingHr: { 7: { status: 'ok', value: 60 } },
    hrv: { 7: { status: 'ok', value: 50 } },
    hrvBaseline: { value: 50 },
    vo2max: { status: 'ok', value: 42 },
  },
};

function cite(sources, ru) {
  const lines = (sources || []).map((s) => s.source || [s.title, s.year].filter((x) => x != null && x !== '').join(', ')).filter(Boolean);
  if (!lines.length) return '';
  return (ru ? 'Источник: ' : 'Source: ') + lines.join('; ');
}

function joinAnswer(text, sources, ru) {
  const body = [].concat(text || []).filter(Boolean).join(' ');
  const src = cite(sources, ru);
  return src ? body + '\n' + src : body;
}

function variantText(v, ru) {
  if (v.text) return [].concat(v.text[ru ? 'ru' : 'en'] || []).filter((x) => typeof x === 'string').join(' ');
  const order = ['reaction', 'main', 'explain', 'action', 'extra', 'clarify'];
  const parts = [];
  for (const k of order) {
    const b = v.blocks && v.blocks[k];
    if (!b) continue;
    const line = Array.isArray(b) ? b[ru ? 0 : 1] : (ru ? b.ru : b.en);
    if (typeof line === 'string' && line.trim()) parts.push(line.trim());
  }
  return parts.join(' ');
}

function paraphrases(q, ru) {
  const base = String(q || '').trim();
  if (!base) return [];
  const extra = ru
    ? ['Расскажи коротко: ' + base, 'Объясни простыми словами: ' + base.replace(/\?$/, '')]
    : ['In short: ' + base, 'Explain simply: ' + base.replace(/\?$/, '')];
  const out = [];
  const seen = new Set();
  for (const p of [base, ...extra]) {
    const k = norm(p);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

test('собирает chat jsonl из каталога, перефразировок и отказов', () => {
  const examples = [];
  const seen = new Set();
  const push = (messages, source, id) => {
    const key = messages.map((m) => m.role + ':' + m.content).join('\n');
    if (seen.has(key)) return;
    seen.add(key);
    examples.push({ messages, source, id });
  };

  for (const ru of [true, false]) {
    const env = makeEnv({ result: FULL, profile: {}, tone: 'off' });
    env.ru = ru;
    for (const q of QA) {
      const a = answerQuestion(q.id, env, null);
      if (!a) continue;
      const ask = ru ? q.q.ru : q.q.en;
      const short = joinAnswer(a.text, a.sources, ru);
      if (!ask || !short || dirty(short)) continue;
      const more = a.more && !dirty(a.more) ? (joinAnswer([a.more], a.sources, ru)) : '';
      paraphrases(ask, ru).forEach((phrase, i) => {
        const messages = [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: phrase },
          { role: 'assistant', content: short },
        ];
        if (i === 0 && more) {
          messages.push({ role: 'user', content: ru ? 'Подробнее' : 'More detail' });
          messages.push({ role: 'assistant', content: more });
        }
        push(messages, 'lib/coach/qa', q.id + (ru ? ':ru' : ':en') + '#' + i);
      });
    }
  }

  const safety = SCENARIOS.filter((s) => s.sensitive || s.id === 'cap_diagnose');
  let safetyAdded = 0;
  for (const sc of safety) {
    const answerRu = (sc.variants || []).map((v) => variantText(v, true)).find((t) => t && !dirty(t));
    const answerEn = (sc.variants || []).map((v) => variantText(v, false)).find((t) => t && !dirty(t));
    for (const phrase of sc.positives || []) {
      const ru = /[А-Яа-яЁё]/.test(phrase);
      const answer = ru ? answerRu : answerEn;
      if (!answer) continue;
      paraphrases(phrase, ru).forEach((p, i) => {
        push([
          { role: 'system', content: SYSTEM },
          { role: 'user', content: p },
          { role: 'assistant', content: answer },
        ], 'lib/coach/scenarios', sc.id + '#' + i + ':' + phrase);
        safetyAdded++;
      });
    }
  }

  const train = [];
  const val = [];
  for (const ex of examples) {
    const key = ex.messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
    (hash(key) % 10 === 0 ? val : train).push(ex);
  }
  expect(examples.length).toBeGreaterThan(400);
  expect(safetyAdded).toBeGreaterThan(5);
  expect(train.length).toBeGreaterThan(0);
  expect(val.length).toBeGreaterThan(0);
  fs.mkdirSync(OUT, { recursive: true });
  const dump = (name, rows) => fs.writeFileSync(path.join(OUT, name), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  dump('train.jsonl', train);
  dump('val.jsonl', val);
  const stats = {
    examples: examples.length,
    train: train.length,
    val: val.length,
    safetyRows: examples.filter((e) => e.source === 'lib/coach/scenarios').length,
    qaRows: examples.filter((e) => e.source === 'lib/coach/qa').length,
    sources: ['lib/coach/qa', 'lib/coach/qaEngine.js answerQuestion', 'lib/coach/scenarios (sensitive, cap_diagnose)'],
  };
  fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(JSON.stringify(stats));
});
