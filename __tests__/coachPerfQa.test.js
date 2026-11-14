// Хирон — наставник с готовыми ответами, без модели. Восстановление, нагрузка и сон из lib/perf в вопросах Хирона.
jest.mock('../lib/health', () => ({}));
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const idx = require('../lib/coach/qa');
const E = require('../lib/coach/qaEngine');
const { emptyMemory } = require('../lib/coach/memory');
const perfQa = require('../lib/coach/qa/perf').default;

const PERF = {
  recovery: { pct: 72, zone: 'green' },
  strain: { day: 11.4 },
  strainTarget: { low: 10.2, high: 14.1 },
  sleep: { needH: 8.1, debtH: 1.4, performancePct: 87, efficiencyPct: 91, consistencyPct: 83, tonight: { needH: 8.5 } },
  healthMonitor: [{ id: 'rhr', status: 'in' }, { id: 'hrv', status: 'out' }, { id: 'resp', status: 'in' }, { id: 'spo2', status: 'nodata' }],
  weekly: { avgStrain: 9.8, avgRecovery: 64, avgSleepPerf: 86 },
};
const env = (perf, now) => ({ ...E.makeEnv({ result: null, profile: {}, tone: 'off', perf, now }), ru: true });
const ENV_EN = (perf) => ({ ...env(perf), ru: false });

describe('вопросы про восстановление, нагрузку и сон', () => {
  test('18 вопросов, 6 из них pro, в трёх разделах, checkQA чист', () => {
    expect(idx.checkQA()).toEqual([]);
    expect(perfQa).toHaveLength(18);
    expect(perfQa.filter((q) => q.level === 'pro')).toHaveLength(6);
    expect(new Set(perfQa.map((q) => q.section))).toEqual(new Set(['recovery', 'training', 'sleep']));
    perfQa.forEach((q) => expect(idx.QA_BY_ID[q.id]).toBe(q));
    ['recovery_pct_zones', 'recovery_red_zone', 'training_strain_scale', 'training_strain_target', 'training_strain_low_walk', 'sleep_need_today', 'recovery_health_monitor', 'recovery_week']
      .forEach((id) => expect(idx.QA_BY_ID[id]).toBeTruthy());
  });
  test('схема: 2–4 коротких варианта, 2–4 продолжения, теги, RU и EN, короткие ответы до трёх фраз', () => {
    const sentences = (s) => s.replace(/\{[a-zA-Z]+\}/g, '').split(/[.!?…]+(?:\s|$)/).map((x) => x.trim()).filter(Boolean);
    perfQa.forEach((q) => {
      expect(q.short.length).toBeGreaterThanOrEqual(2); expect(q.short.length).toBeLessThanOrEqual(4);
      expect(q.follow.length).toBeGreaterThanOrEqual(2); expect(q.follow.length).toBeLessThanOrEqual(4);
      expect(q.tags.length).toBeGreaterThan(0);
      [q.q, ...q.short, q.more].forEach((o) => { expect(/[а-яё]/i.test(o.ru)).toBe(true); expect(/[а-яё]/i.test(o.en)).toBe(false); });
      q.short.forEach((s) => { expect(sentences(s.ru).length).toBeLessThanOrEqual(3); expect(sentences(s.en).length).toBeLessThanOrEqual(3); });
      if (q.level === 'pro') expect(q.sources.length).toBeGreaterThan(0);
    });
  });
  test('на «ты»: нет вы/вам/ваш и форм -ете/-йте; нет обрывков слов и «undefined»', () => {
    const vy = /(^|[^А-Яа-яЁё])(вы|вам|вас|вами|ваш[а-яё]*)(?![А-Яа-яЁё])/i;
    const imp = /(^|[^А-Яа-яЁё])[А-Яа-яЁё]+(йтесь|ьтесь|айте|яйте|уйте|ьте|аете|уете)(?![А-Яа-яЁё])/i;
    perfQa.forEach((q) => [q.q.ru, ...q.short.map((x) => x.ru), q.more.ru].forEach((t) => {
      expect([q.id, vy.test(t) || imp.test(t)]).toEqual([q.id, false]);
      expect(/undefined|NaN|\bnull\b|\[object|\s-\s|[а-яё]-\s|\s-[а-яё]/i.test(t)).toBe(false);
    }));
  });
  test('без шкал-«лекарств»: нет диагнозов и доз, при отклонениях монитор отсылает к врачу', () => {
    const mon = idx.QA_BY_ID.recovery_health_monitor;
    expect(/не диагноз/.test(mon.short[0].ru)).toBe(true);
    expect(/врач/.test(mon.short[1].ru + mon.more.ru)).toBe(true);
    expect(/not a diagnosis/.test(mon.short[0].en)).toBe(true);
    expect(/собственн/.test(idx.QA_BY_ID.recovery_pct_calc.short[0].ru)).toBe(true);
  });
  test('все вопросы находятся поиском по своему тексту', () => {
    perfQa.forEach((q) => expect(idx.search(idx.qText(q, true), { profile: {} }, true).map((x) => x.id)).toContain(q.id));
  });
});

describe('переменные восстановления, нагрузки и сна', () => {
  test('строки с данными, RU и EN', () => {
    const v = E.buildQaVars(env(PERF));
    expect(v.recoveryLine).toBe('Восстановление сегодня — 72 %, зелёная зона.');
    expect(v.strainLine).toBe('Нагрузка за день — 11,4 из 21.');
    expect(v.strainTargetLine).toBe('Цель на сегодня — 10,2–14,1.');
    expect(v.sleepNeedLine).toBe('Сегодня ночью тебе нужно примерно 8 ч 30 мин сна.');
    expect(v.sleepPerfLine).toMatch(/87 %/);
    expect(v.sleepDebtLine).toMatch(/1 ч 24 мин/);
    expect(v.sleepEffLine).toMatch(/91 %/);
    expect(v.sleepConsLine).toMatch(/83 %/);
    expect(v.monitorLine).toBe('Показателей вне личной нормы сегодня: 1 из 3.');
    expect(v.weekLine).toBe('За неделю в среднем: восстановление 64 %, нагрузка 9,8, сон 86 % от потребности.');
    const en = E.buildQaVars(ENV_EN(PERF));
    expect(en.recoveryLine).toBe('Recovery today is 72%, green zone.');
    expect(en.strainLine).toBe('Strain today is 11.4 out of 21.');
    expect(en.strainTargetLine).toBe("Today's target is 10.2–14.1.");
    expect(/[а-яё]/i.test(Object.values(en).join(' '))).toBe(false);
  });
  test('нет данных — строка опускается, без нулей и мусора', () => {
    expect(E.buildQaVars(env(null)).recoveryLine).toBeUndefined();
    const part = E.buildQaVars(env({ recovery: null, strain: { day: null }, strainTarget: { low: null, high: null }, sleep: { needH: null, debtH: 0, performancePct: null }, healthMonitor: [{ status: 'nodata' }], weekly: {} }));
    ['recoveryLine', 'strainLine', 'strainTargetLine', 'sleepNeedLine', 'sleepPerfLine', 'sleepDebtLine', 'monitorLine', 'weekLine'].forEach((k) => expect([k, part[k]]).toEqual([k, undefined]));
    perfQa.forEach((q) => {
      const a = E.answerQuestion(q.id, env(null), emptyMemory());
      const t = a.text.join(' ') + a.more;
      expect(t).not.toMatch(/\{|undefined|NaN/);
      expect(a.text.join(' ').trim().length).toBeGreaterThan(20);
    });
  });
  test('ответ вставляет цифры человека и считает уровни зон', () => {
    const a = E.answerQuestion('recovery_pct_zones', env(PERF), emptyMemory());
    expect(a.text.join(' ')).toContain('72 %');
    const b = E.answerQuestion('training_strain_target', env(PERF), emptyMemory());
    expect(b.text.join(' ')).toMatch(/10,2–14,1/);
    expect(E.buildQaVars(env({ recovery: { pct: 20, zone: 'red' } })).recoveryLine).toBe('Восстановление сегодня — 20 %, красная зона.');
  });
});

describe('подсказки по данным perf', () => {
  const sug = (perf, now) => E.suggestions(env(perf, now), emptyMemory(), null);
  const EVE = new Date(2026, 10, 5, 20, 0).getTime();
  const NOON = new Date(2026, 10, 5, 12, 0).getTime();
  test('красное восстановление — вопросы о восстановлении первыми', () => {
    expect(sug({ recovery: { pct: 20, zone: 'red' } }, NOON).slice(0, 2)).toEqual(['recovery_red_zone', 'recovery_pct_zones']);
    expect(sug({ recovery: { pct: 80, zone: 'green' } }, NOON)).not.toContain('recovery_red_zone');
    expect(sug(null, NOON)).not.toContain('recovery_red_zone');
  });
  test('нагрузка заметно ниже цели вечером — вопрос о цели нагрузки', () => {
    const p = { strain: { day: 3 }, strainTarget: { low: 10, high: 14 } };
    expect(sug(p, EVE)[0]).toBe('training_strain_target');
    expect(sug(p, NOON)).not.toContain('training_strain_target');
    expect(sug({ strain: { day: 9 }, strainTarget: { low: 10, high: 14 } }, EVE)).not.toContain('training_strain_target');
    expect(sug({ strain: { day: null }, strainTarget: { low: 10, high: 14 } }, EVE)).not.toContain('training_strain_target');
  });
  test('большой недосып — вопрос о потребности во сне', () => {
    expect(sug({ sleep: { debtH: 2 } }, NOON)[0]).toBe('sleep_need_today');
    expect(sug({ sleep: { debtH: 0.3 } }, NOON)).not.toContain('sleep_need_today');
  });
  test('4–6 подсказок без повторов даже при всех сигналах', () => {
    const a = sug({ recovery: { pct: 10, zone: 'red' }, strain: { day: 1 }, strainTarget: { low: 9, high: 13 }, sleep: { debtH: 3 } }, EVE);
    expect(a.length).toBeGreaterThanOrEqual(4); expect(a.length).toBeLessThanOrEqual(6);
    expect(new Set(a).size).toBe(a.length);
  });
});

describe('умные квесты и красная зона', () => {
  test('красная зона восстановления даёт сценарий D, зелёная — нет', () => {
    const { buildContext, planQuests } = require('../lib/coach/quests');
    const base = { result: null, profile: {}, weather: null, now: new Date(2026, 10, 5, 12).getTime(), lang: 'ru' };
    expect(planQuests(buildContext({ ...base, perf: { recovery: { pct: 20, zone: 'red' } } })).scenario).toBe('D');
    expect(planQuests(buildContext({ ...base, perf: { recovery: { pct: 80, zone: 'green' } } })).scenario).toBeNull();
    expect(planQuests(buildContext({ ...base })).scenario).toBeNull();
  });
});

describe('Хирон без модели', () => {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.name === 'node_modules' || d.name === '.git' ? [] : d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
  const AI = /llama|from ['"][./]+\/llm['"]|require\(['"][./]+\/llm['"]\)|chironConfig|askChiron|prepareChiron|CHIRON_URL|\.gguf|GGUF/;
  test('ни один файл приложения не подключает llm/llama и не знает про модель', () => {
    const files = [...walk(path.join(ROOT, 'lib')), ...walk(path.join(ROOT, 'plugins')), path.join(ROOT, 'App.js'), path.join(ROOT, 'package.json')].filter((f) => /\.(js|json)$/.test(f));
    expect(files.length).toBeGreaterThan(50);
    files.forEach((f) => expect([path.relative(ROOT, f), AI.test(fs.readFileSync(f, 'utf8'))]).toEqual([path.relative(ROOT, f), false]));
    expect(fs.existsSync(path.join(ROOT, 'lib/llm.js'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'lib/chironConfig.js'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'chiron-server'))).toBe(false);
  });
  test('экран Хирона: нет TextInput вне окна поиска «Все темы», нет вызовов модели', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/screens/CoachScreen.js'), 'utf8');
    expect(src.match(/<TextInput/g)).toHaveLength(1); // поле поиска внутри TopicsSheet
    expect(src.indexOf('<TextInput')).toBeGreaterThan(src.indexOf('function TopicsSheet'));
    expect(src.indexOf('<TextInput')).toBeLessThan(src.indexOf('export function CoachScreen'));
    expect(src).not.toMatch(/fetch\(|askChiron|Keyboard/);
  });
  test('CI: нет шагов llama.rn, ссылок на модель и секретов Хирона; подпись и публикация остались', () => {
    const y = fs.readFileSync(path.join(ROOT, '.github/workflows/build-apk.yml'), 'utf8');
    expect(y).not.toMatch(/llama|gguf|huggingface|CHIRON|chiron|largeHeap|LargeHeap|rnllama|expo-network|newArchEnabled/i);
    expect(y).toContain('apply-release-signing.js');
    expect(y).toContain('epimely-release.keystore');
    expect(y).toContain('Publish APK to android-latest');
  });
  test('профиль без раздела про скачивание модели', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/screens/ProfileScreen.js'), 'utf8');
    expect(src).not.toMatch(/ChironOffline|expo-network|downloadChiron/);
  });
});
