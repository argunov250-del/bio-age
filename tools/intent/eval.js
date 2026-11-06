#!/usr/bin/env node
// Оценка настоящего конвейера (coachBrain.reply) на val/test: только правила vs правила + модель.
//   node tools/intent/eval.js [--sweep]
// Пишет tools/intent/data/metrics_js.json. Метки маршрута приводятся к пространству модели (pipeline.canonScenario).
const fs = require('fs');
const path = require('path');
const P = require('./pipeline');
const { TYPO_KINDS } = require('./augment');
const ml = P.COACH_CONFIG && require('./node_env').require('lib/coach/ml');
if (ml) ml.setModel(require('./model/intent.json'));
const D = path.join(__dirname, 'data');
const load = (n) => fs.readFileSync(path.join(D, n + '.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const rowsOf = { val: load('val'), test: load('test') };
const C = P.COACH_CONFIG;

function macroF1(rows, key) {
  const labels = [...new Set(rows.map((r) => r.label))];
  let sum = 0;
  for (const l of labels) {
    let tp = 0; let fp = 0; let fn = 0;
    for (const r of rows) { const p = r[key]; if (p === l && r.label === l) tp++; else if (p === l) fp++; else if (r.label === l) fn++; }
    sum += tp === 0 ? 0 : (2 * tp) / (2 * tp + fp + fn);
  }
  return sum / labels.length;
}
const acc = (rows, key) => rows.filter((r) => r[key] === r.label).length / (rows.length || 1);
const kindOf = (r) => (!r.aug.length ? 'clean' : r.aug.some((k) => TYPO_KINDS.includes(k)) ? 'typo' : r.aug.length === 1 && r.aug[0] === 'mut' ? 'mutation' : 'colloquial');

function run(rows, cfg) {
  Object.assign(C, cfg);
  C.ml = true;
  for (const r of rows) {
    const o = P.routeLabel(r.text, { full: true });
    r.mlp = o.label; r.mlRoute = o.route.ml || null; r.mlText = o.text.join('|');
  }
}
function summary(rows) {
  const by = (f) => rows.filter(f);
  const sub = {};
  for (const k of ['clean', 'typo', 'colloquial', 'mutation']) { const s = by((r) => kindOf(r) === k); sub[k] = { n: s.length, rules: acc(s, 'rules'), rulesMl: acc(s, 'mlp') }; }
  for (const k of ['authored', 'catalog']) { const s = by((r) => (r.src === 'authored') === (k === 'authored')); sub[k] = { n: s.length, rules: acc(s, 'rules'), rulesMl: acc(s, 'mlp') }; }
  const changed = rows.filter((r) => r.mlRoute);
  const sens = rows.filter((r) => r.label.startsWith('sens_'));
  const nonSens = rows.filter((r) => !r.label.startsWith('sens_'));
  return {
    n: rows.length, rules: { acc: acc(rows, 'rules'), macroF1: macroF1(rows, 'rules') }, rulesMl: { acc: acc(rows, 'mlp'), macroF1: macroF1(rows, 'mlp') }, sub,
    mlFired: changed.length, mlFiredCorrect: changed.filter((r) => r.mlp === r.label).length, mlFiredWasRulesCorrect: changed.filter((r) => r.rules === r.label).length,
    regressions: rows.filter((r) => r.rules === r.label && r.mlp !== r.label).length, fixed: rows.filter((r) => r.rules !== r.label && r.mlp === r.label).length,
    sens: { n: sens.length, rulesRecall: sens.filter((r) => r.rules === r.label).length / (sens.length || 1), rulesMlRecall: sens.filter((r) => r.mlp === r.label).length / (sens.length || 1), rulesDetected: sens.filter((r) => r.rules.startsWith('sens_')).length / (sens.length || 1), rulesMlDetected: sens.filter((r) => r.mlp.startsWith('sens_')).length / (sens.length || 1) },
    nonSensFlaggedSensByMl: nonSens.filter((r) => r.mlp.startsWith('sens_') && !r.rules.startsWith('sens_')).length,
    // безопасность: если правила дали чувствительный маршрут, модель обязана дать тот же ответ (текст в точности)
    safetyChanged: rows.filter((r) => (r.rules.startsWith('sens_')) && (r.mlp !== r.rules)).length,
  };
}
function baseline(rows) {
  C.ml = false;
  for (const r of rows) { const o = P.routeLabel(r.text, { full: true }); r.rules = o.label; r.rulesText = o.text.join('|'); }
}
const out = {};
const cfgDefault = { mlMinProb: C.mlMinProb, mlMinMargin: C.mlMinMargin, mlSensProb: C.mlSensProb, mlSensMargin: C.mlSensMargin };
if (process.argv.includes('--sweep')) {
  const rows = rowsOf.val; baseline(rows);
  const sweep = [];
  for (const mp of [0.4, 0.5, 0.6, 0.7, 0.8]) for (const mg of [0.15, 0.3]) for (const sp of [0.3, 0.45, 0.6, 0.75]) for (const sm of [0.15, 0.3]) {
    run(rows, { mlMinProb: mp, mlMinMargin: mg, mlSensProb: sp, mlSensMargin: sm });
    const s = summary(rows);
    sweep.push({ mlMinProb: mp, mlMinMargin: mg, mlSensProb: sp, mlSensMargin: sm, acc: s.rulesMl.acc, fired: s.mlFired, firedCorrect: s.mlFiredCorrect, regressions: s.regressions, fixed: s.fixed, sensDet: s.sens.rulesMlDetected, nonSensFlag: s.nonSensFlaggedSensByMl });
  }
  fs.writeFileSync(path.join(D, 'sweep_val.json'), JSON.stringify(sweep, null, 1));
  for (const s of sweep.filter((x) => x.mlMinProb === 0.6 && x.mlMinMargin === 0.3)) console.log(JSON.stringify(s));
  Object.assign(C, cfgDefault);
}
for (const sp of ['val', 'test']) {
  const rows = rowsOf[sp]; baseline(rows); run(rows, cfgDefault);
  out[sp] = summary(rows);
  // идентичность ответов при срабатывании правил безопасности
  out[sp].safetyTextChanged = rows.filter((r) => r.rules.startsWith('sens_') && r.mlText !== r.rulesText).length;
  if (sp === 'test') {
    const conf = {};
    for (const r of rows) if (r.mlp !== r.label) { const k = r.label + ' -> ' + r.mlp; conf[k] = (conf[k] || 0) + 1; }
    out.confusions = Object.entries(conf).sort((a, b) => b[1] - a[1]).slice(0, 12);
    // метрики по меткам: где модель помогла/навредила
    const perLabel = {};
    for (const r of rows) { const p = (perLabel[r.label] = perLabel[r.label] || { n: 0, rules: 0, rulesMl: 0 }); p.n++; p.rules += r.rules === r.label; p.rulesMl += r.mlp === r.label; }
    out.perLabelGain = Object.entries(perLabel).map(([l, p]) => [l, p.n, p.rules / p.n, p.rulesMl / p.n]).sort((a, b) => (b[3] - b[2]) * b[1] - (a[3] - a[2]) * a[1]).slice(0, 8);
    out.perLabelLoss = Object.entries(perLabel).map(([l, p]) => [l, p.n, p.rules / p.n, p.rulesMl / p.n]).filter((x) => x[3] < x[2]).slice(0, 8);
    out.regressionExamples = rows.filter((r) => r.rules === r.label && r.mlp !== r.label).slice(0, 12).map((r) => [r.text, r.label, r.mlp]);
  }
}
// латентность и холодная загрузка (в этом же процессе: после прогрева)
const texts = rowsOf.test.map((r) => r.text);
C.ml = true;
const t0 = process.hrtime.bigint();
for (let i = 0; i < 3000; i++) ml.predict(texts[i % texts.length]);
out.latencyMs = { predictAvg: Number(process.hrtime.bigint() - t0) / 1e6 / 3000 };
out.config = cfgDefault;
fs.writeFileSync(path.join(D, 'metrics_js.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ val: { rules: out.val.rules, rulesMl: out.val.rulesMl }, test: { rules: out.test.rules, rulesMl: out.test.rulesMl, fired: out.test.mlFired, fixed: out.test.fixed, regressions: out.test.regressions, sens: out.test.sens, safetyChanged: out.test.safetyChanged, safetyTextChanged: out.test.safetyTextChanged, nonSens: out.test.nonSensFlaggedSensByMl }, latencyMs: out.latencyMs }, null, 1));
