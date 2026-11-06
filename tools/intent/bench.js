#!/usr/bin/env node
// Латентность JS-инференса в чистом node: холодная загрузка модели и predict() на репликах test.jsonl.
const fs = require('fs');
const path = require('path');
const env = require('./node_env');
const ml = env.require('lib/coach/ml'); // компиляция Babel вне замера
const rows = fs.readFileSync(path.join(__dirname, 'data', 'test.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const t0 = process.hrtime.bigint();
env.require('lib/coach/config').COACH_CONFIG.ml = true;
ml.setModel(require('./model/intent.json'));
const cold = Number(process.hrtime.bigint() - t0) / 1e6;
for (let i = 0; i < 300; i++) ml.predict(rows[i % rows.length].text); // прогрев JIT
const times = [];
for (let i = 0; i < 4000; i++) { const s = process.hrtime.bigint(); ml.predict(rows[(i * 7) % rows.length].text); times.push(Number(process.hrtime.bigint() - s) / 1e6); }
times.sort((a, b) => a - b);
const q = (p) => times[Math.floor(times.length * p)];
const out = { coldLoadMs: cold, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: times[times.length - 1], modelBytes: fs.statSync(path.join(env.root, 'tools/intent/model/intent.json')).size };
fs.writeFileSync(path.join(__dirname, 'data', 'bench.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
