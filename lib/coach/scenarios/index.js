// Каталог сценариев и проверка его целостности (используется тестами).
import { CONTROL } from './control';
import { SCOPE } from './scope';
import { CAPABILITIES } from './capabilities';
import { DATALIMITS } from './datalimits';
import { SENSITIVE } from './sensitive';
import { TRAINING } from './training';
import { MOTIVATION } from './motivation';
import { GREETING } from './greeting';
import { QUESTS_SC } from './quests';
import { PLAN } from './plan';
import { WEATHER } from './weather';
import { STEPS_SC } from './steps';
import { SLEEP_SC } from './sleep';
import { RECOVERY_SC } from './recovery';
import { HABITS_SC } from './habits';
import { RESULTS_SC } from './results';
import { FOLLOW } from './follow';
import { SMALLTALK } from './smalltalk';
import { WELLNESS } from './wellness';
import { APPHELP } from './apphelp';
import { enrich } from './enrich';
import { variantNeeds, hasEnglish, validate, assemble } from '../assemble';
import { VAR_NAMES } from '../vars';

// Переменные, которые подставляет движок (engine.js) помимо buildVars.
export const EXTRA_VARS = ['baseTrain', 'dangerWhy', 'wxCond', 'curCond', 'curCondCap', 'askPlace', 'askActivity', 'topicList', 'sleepTips', 'rankName', 'questTitle', 'questWhy', 'waterGoal', 'waterNote', 'curLevel', 'curRank'];

export const SCENARIOS = [...SENSITIVE, ...CONTROL, ...CAPABILITIES, ...DATALIMITS, ...WEATHER, ...TRAINING, ...MOTIVATION, ...SMALLTALK, ...GREETING, ...QUESTS_SC, ...APPHELP, ...WELLNESS, ...PLAN, ...STEPS_SC, ...SLEEP_SC, ...RECOVERY_SC, ...HABITS_SC, ...RESULTS_SC, ...FOLLOW, ...SCOPE];
enrich(SCENARIOS);
export const BY_ID = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));

const textsOf = (v, lang) => {
  if (v.text) return [].concat(v.text[lang] || []);
  return Object.values(v.blocks || {}).filter(Boolean).map((b) => (Array.isArray(b) ? b[lang === 'ru' ? 0 : 1] : b[lang]));
};

// -> массив строк-проблем (пустой = каталог целостный).
export function checkCatalog(scenarios = SCENARIOS, extraHumor = []) {
  const bad = [];
  const ids = new Set();
  const vids = new Set();
  const known = new Set([...VAR_NAMES, ...EXTRA_VARS]);
  const seenText = new Map();
  for (const sc of scenarios) {
    if (!sc.id || ids.has(sc.id)) bad.push('scenario id: ' + sc.id);
    ids.add(sc.id);
    if (!sc.group) bad.push('group: ' + sc.id);
    if (!Array.isArray(sc.positives) || !Array.isArray(sc.negatives)) bad.push('examples: ' + sc.id);
    if (sc.sensitive && sc.variants.some((v) => v.humorOk !== false)) bad.push('sensitive humor: ' + sc.id);
    if (!sc.variants.length) bad.push('no variants: ' + sc.id);
    for (const v of sc.variants) {
      if (!v.id || vids.has(v.id)) bad.push('variant id: ' + v.id);
      vids.add(v.id);
      if (!v.text && !v.blocks) bad.push('empty variant: ' + v.id);
      if (!hasEnglish(v)) bad.push('no english: ' + v.id);
      variantNeeds(v).forEach((n) => { if (!known.has(n)) bad.push('unknown var ' + n + ': ' + v.id); });
      for (const lang of ['ru', 'en']) {
        const ts = textsOf(v, lang);
        if (!ts.length || ts.some((t) => typeof t !== 'string' || !t.trim())) bad.push('blank ' + lang + ': ' + v.id);
        const key = lang + '|' + ts.join('¶');
        if (seenText.has(key)) bad.push('duplicate text: ' + v.id + ' = ' + seenText.get(key));
        seenText.set(key, v.id);
      }
      if (v.pending && !v.pending.key) bad.push('pending key: ' + v.id);
    }
  }
  extraHumor.forEach((h) => { if (h.rightsStatus === 'own' && !h.id) bad.push('humor id'); });
  return bad;
}

// Все тексты варианта в собранном виде (для проверки на мусор): подставляем заведомо доступные переменные.
export function renderAll(sc, vars) {
  return sc.variants.map((v) => assemble(v, { ru: true, vars }).paras).filter((p) => p.length).map((p) => validate(p));
}
