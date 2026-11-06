#!/usr/bin/env node
// Оценка ТОЛЬКО правил (без модели): coachBrain.reply с COACH_CONFIG.ml = false на val/test, строки sens_* пропускаются
// (безопасность проверяется отдельно). Печатает точность, срез по опечаткам и задержку на сообщение.
//   node tools/intent/eval_rules.js [--split test|val|all] [--errors N]
const fs = require('fs');
const path = require('path');
const P = require('./pipeline');
const { TYPO_KINDS } = require('./augment');
P.COACH_CONFIG.ml = false;
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const D = path.join(__dirname, 'data');
const load = (n) => fs.readFileSync(path.join(D, n + '.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const kindOf = (r) => (!r.aug.length ? 'clean' : r.aug.some((k) => TYPO_KINDS.includes(k)) ? 'typo' : r.aug.length === 1 && r.aug[0] === 'mut' ? 'mutation' : 'colloquial');
const splits = opt('split', 'all') === 'all' ? ['val', 'test'] : [opt('split')];
const showErr = Number(opt('errors', 0));
const out = {};
for (const sp of splits) {
  const rows = load(sp).filter((r) => !r.label.startsWith('sens_'));
  const t0 = process.hrtime.bigint();
  for (const r of rows) r.pred = P.routeLabel(r.text);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / rows.length;
  const acc = (rs) => (rs.filter((r) => r.pred === r.label).length / (rs.length || 1));
  const sub = {};
  for (const k of ['clean', 'typo', 'colloquial', 'mutation']) { const s = rows.filter((r) => kindOf(r) === k); sub[k] = { n: s.length, acc: +acc(s).toFixed(4) }; }
  out[sp] = { n: rows.length, acc: +acc(rows).toFixed(4), sub, msPerMessage: +ms.toFixed(3) };
  if (showErr) rows.filter((r) => r.pred !== r.label).slice(0, showErr).forEach((r) => console.log(sp, JSON.stringify(r.text), r.label, '->', r.pred));
}
console.log(JSON.stringify(out, null, 1));
