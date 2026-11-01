jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

import { tr, setLang, getLangMode, EN_DICT } from '../lib/i18n';
import * as i18n from '../lib/i18n';
import { reply, setCoachWeather } from '../lib/coachBrain';
import { recommend } from '../lib/recommend';
import { FACTS } from '../lib/knowledge';
import { workoutName } from '../lib/workouts';
import { CATALOG } from '../lib/humor/catalog';
import { detect } from '../lib/humor/context';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: {
    sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 },
    readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' },
  },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const CYR = /[А-Яа-яЁё]/;
const run = (q, o) => reply(q, RESULT, {}, o);
const text = (r) => r.text.join('\n');

afterEach(() => { setCoachWeather(null); jest.restoreAllMocks(); try { delete globalThis.navigator; } catch (e) { /* ignore */ } setLang('auto'); });

test('setLang переключает tr и язык ответов коуча на лету', () => {
  setLang('ru');
  expect(i18n.RU).toBe(true);
  expect(tr('Обзор')).toBe('Обзор');
  const ru = run('Как улучшить сон?');
  expect(CYR.test(text(ru))).toBe(true);
  setLang('en');
  expect(i18n.RU).toBe(false);
  expect(getLangMode()).toBe('en');
  expect(tr('Обзор')).toBe('Overview');
  const en = run('How do I sleep better?');
  expect(CYR.test(text(en))).toBe(false);
  setLang('ru');
  expect(tr('Обзор')).toBe('Обзор');
});

test('ленивые тексты (советы, факты, названия) следуют языку', () => {
  setLang('en');
  const rec = recommend(null, {});
  expect(CYR.test(rec.main.title + rec.main.area)).toBe(false);
  expect(CYR.test(FACTS.sleepNeed.text)).toBe(false);
  expect(workoutName(56)).toBe('Running');
  setLang('ru');
  expect(CYR.test(FACTS.sleepNeed.text)).toBe(true);
  expect(workoutName(56)).toBe('Бег');
});

test("'auto' следует системной локали", () => {
  const sys = (locale) => {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => ({ resolvedOptions: () => ({ locale }) }));
    Object.defineProperty(globalThis, 'navigator', { value: { language: locale }, configurable: true, writable: true });
  };
  sys('ru-RU');
  setLang('auto');
  expect(i18n.RU).toBe(true);
  jest.restoreAllMocks();
  sys('de-DE');
  setLang('auto');
  expect(i18n.RU).toBe(false);
  jest.restoreAllMocks();
  sys('en-GB');
  setLang('ru'); // явный выбор сильнее системы
  expect(i18n.RU).toBe(true);
  setLang('auto');
  expect(i18n.RU).toBe(false);
  setLang('мусор');
  expect(getLangMode()).toBe('auto');
});

// Все tr('...') в коде имеют английский перевод.
function sources() {
  const root = path.join(__dirname, '..');
  const out = [path.join(root, 'App.js')];
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const f = path.join(d, e.name);
    if (e.isDirectory()) walk(f); else if (f.endsWith('.js')) out.push(f);
  });
  walk(path.join(root, 'lib'));
  return out.filter((f) => !f.endsWith(path.join('lib', 'i18n.js')));
}

test('у каждого tr-литерала в коде есть английский перевод', () => {
  const missing = [];
  let total = 0;
  sources().forEach((f) => {
    const ast = parser.parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
      CallExpression(p) {
        const c = p.node.callee;
        if (c.type !== 'Identifier' || c.name !== 'tr') return;
        const a = p.node.arguments[0];
        if (a && a.type === 'StringLiteral' && CYR.test(a.value)) {
          total++;
          if (EN_DICT[a.value] === undefined) missing.push(path.basename(f) + ': ' + a.value.slice(0, 70));
        }
      },
    });
  });
  expect(total).toBeGreaterThan(300);
  expect(missing).toEqual([]);
});

test('английские значения словаря не содержат кириллицы', () => {
  const bad = Object.entries(EN_DICT).filter(([k, v]) => (CYR.test(v) && !k.includes('дата')) || !String(v).trim()).map(([k]) => k.slice(0, 60));
  expect(bad).toEqual([]);
});

describe('английский: безопасность', () => {
  beforeEach(() => setLang('en'));
  const RED = [
    'I have chest pain', 'My chest feels tight when I run', 'I am short of breath and dizzy', 'I almost fainted after the run',
    'I felt heart palpitations tonight', 'my heart is racing and I feel faint', 'I passed out yesterday', "I can't breathe properly",
    'I have numbness in my arm', 'I feel nauseous and lightheaded',
  ];
  test.each(RED)('красный флаг: %s', (q) => {
    ['playful', 'balanced'].forEach((tone) => {
      const r = run(q, { tone });
      expect(r.topic).toBe('safety');
      expect(text(r)).toMatch(/112/);
      expect(r.humorId).toBeNull();
      expect(CYR.test(text(r))).toBe(false);
    });
  });
  test.each(['My knee hurts when I run', 'I think I sprained my ankle', 'I have a sharp pain in my back', 'I injured my shoulder'])('боль и травма: %s', (q) => {
    const r = run(q, { tone: 'playful' });
    expect(r.topic).toBe('safety');
    expect(r.humorId).toBeNull();
  });
  test.each(['I feel really depressed lately', "I'm so anxious and I hate myself", 'I feel guilty and ashamed'])('тяжёлое состояние: %s', (q) => {
    const r = run(q, { tone: 'playful' });
    expect(r.topic).toBe('support');
    expect(r.humorId).toBeNull();
  });
  test('лекарства и «без шуток», негативная реакция', () => {
    expect(run('What dose of ibuprofen should I take?', { tone: 'playful' }).topic).toBe('treatment');
    const r = run('No jokes please, I have 9980 steps. Should I hit 10000?', { tone: 'playful' });
    expect(r.humorId).toBeNull();
    expect(r.session.dampened).toBe(true);
    const n = run("That's not funny", { tone: 'playful' });
    expect(n.session.dampened).toBe(true);
    // после тяжёлой реплики юмора нет и в следующей
    const first = run('My knee hurts', { tone: 'playful' });
    const second = run('I have 9980 steps. Should I hit 10000?', { tone: 'playful', history: [{ from: 'me', text: 'My knee hurts' }, { from: 'coach', text: first.text, humorId: null }] });
    expect(second.humorId).toBeNull();
  });
  test('detect: флаги на английском', () => {
    expect(detect('chest pain').sensitive.symptoms).toBe(true);
    expect(detect('my hamstring hurts').sensitive.pain).toBe(true);
    expect(detect('I feel hopeless').sensitive.distress).toBe(true);
    expect(detect('stop joking').sensitive.noJokes).toBe(true);
    expect(detect('I broke my personal best, 5 km').sensitive.pain).toBe(false);
  });
});

describe('английский: юмор', () => {
  beforeEach(() => setLang('en'));
  const EN_TEXTS = CATALOG.flatMap((m) => m.variantsEn);
  test('шутка появляется для подходящего случая и это английский текст', () => {
    const r = run('I have 9980 steps, should I hit 10000?');
    expect(['mozhno_a_zachem', 'jab_round']).toContain(r.humorId);
    expect(r.text.some((p) => EN_TEXTS.includes(p))).toBe(true);
    expect(CYR.test(text(r))).toBe(false);
  });
  test('нет шутки без английского варианта', () => {
    const r = run('Why do I have 1749 steps in the app?');
    expect(r.humorId).toBeNull();
    expect(CYR.test(text(r))).toBe(false);
  });
  test('основные ситуации распознаются', () => {
    const sit = (q) => detect(q).situations;
    expect(sit('I have 9980 steps, should I hit 10000?')).toContain('round_chase');
    expect(sit('Planned a run, strength, stretching and also biking tonight. I rarely work out.')).toContain('overloaded_plan');
    expect(sit("I'm a beginner, planning a marathon every day")).toContain('beginner_heavy');
    expect(sit('Maybe just a short walk instead of a workout?')).toContain('simplify');
    expect(sit('I changed my mind, I will skip it')).toContain('plan_change');
    expect(sit("I don't feel like going for a run")).toContain('procrastination');
    expect(sit('It is thunder outside, should I go for a run?')).toContain('danger_weather_outdoor');
  });
  test('каталог: шутки с variantsEn — непустые строки, pochemu_1749 без EN', () => {
    CATALOG.filter((m) => m.id !== 'pochemu_1749').forEach((m) => expect(m.variantsEn.length).toBeGreaterThan(0));
    expect(CATALOG.find((m) => m.id === 'pochemu_1749').variantsEn).toEqual([]);
    CATALOG.forEach((m) => m.variantsEn.forEach((v) => expect(CYR.test(v)).toBe(false)));
  });
});
