// Реальный каталог вопросов Хирона (без подмен): целостность, покрытие разделов, достижимость, стиль «ты».
jest.mock('../lib/health', () => ({}));
const fs = require('fs');
const path = require('path');
const idx = require('../lib/coach/qa');

const ENVS = [{ profile: {} }, { profile: { sex: 'f', showCycle: true } }];

describe('реальный каталог', () => {
  test('ALL экспортируется и checkQA() пуст', () => {
    expect(idx.ALL).toBe(idx.QA);
    expect(idx.checkQA()).toEqual([]);
  });
  test('в каждом разделе не меньше 10 видимых вопросов (с учётом цикла)', () => {
    const env = ENVS[1];
    idx.SECTIONS.forEach((sec) => expect([sec.id, idx.questionsOf(sec.id, env).length]).toEqual([sec.id, expect.any(Number)]));
    idx.SECTIONS.forEach((sec) => expect(idx.questionsOf(sec.id, env).length).toBeGreaterThanOrEqual(10));
  });
  test('каждый вопрос достижим через «Все темы» (раздел -> список) и поиск', () => {
    ENVS.forEach((env) => {
      const vis = idx.visible(env);
      const inSections = new Set();
      idx.sectionsFor(env).forEach((sec) => idx.questionsOf(sec.id, env).forEach((q) => inSections.add(q.id)));
      vis.forEach((q) => { expect(inSections.has(q.id)).toBe(true); expect(idx.search(idx.qText(q, true), env, true).map((x) => x.id)).toContain(q.id); });
    });
  });
  test('Open-Meteo не упоминается в текстах каталога', () => {
    const dir = path.join(__dirname, '..', 'lib', 'coach', 'qa');
    fs.readdirSync(dir).forEach((f) => expect(fs.readFileSync(path.join(dir, f), 'utf8')).not.toMatch(/Open-Meteo/i));
  });
  test('русские тексты обращаются на «ты»: нет вы/вам/вас/ваш*', () => {
    const rx = /(^|[^А-Яа-яЁё])(вы|вам|вас|вами|ваш[а-яё]*)(?![А-Яа-яЁё])/i;
    idx.ALL.forEach((q) => {
      const ru = [q.q.ru, ...q.short.map((x) => x.ru), q.more.ru];
      ru.forEach((t) => expect([q.id, rx.test(t)]).toEqual([q.id, false]));
    });
  });
  test('«ты»: нет типичных форм «вы» (-ете/-итесь/-йте/-ьте)', () => {
    const rx = /(^|[^А-Яа-яЁё])[А-Яа-яЁё]+(йтесь|ьтесь|айте|яйте|уйте|ьте|аете|уете)(?![А-Яа-яЁё])/i;
    idx.ALL.forEach((q) => [q.q.ru, ...q.short.map((x) => x.ru), q.more.ru].forEach((t) => expect([q.id, rx.test(t)]).toEqual([q.id, false])));
  });
});
