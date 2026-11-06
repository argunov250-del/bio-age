jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

import { reply } from '../lib/coachBrain';
import { safetyScan } from '../lib/humor/safety';
import { deathCheck } from '../lib/coach/nlu';

const RESULT = { chrono: 40, bio: 38, pace: 0.9, scores: {}, metrics: {} };
const once = (q, session) => reply(q, RESULT, {}, { history: [], session: session || {}, tone: 'playful', now: 1 });
const txt = (r) => r.text.join(' ');

const CRISIS = ['не хочу жить', 'хочу умереть', 'хочу сдохнуть', 'хочу покончить с собой', 'покончить с жизнью', 'я порезал себя', 'порезала себя', 'режу себя', 'наглотался таблеток', 'наглоталась таблеток', 'нет смысла жить', 'всем будет лучше без меня', 'не вижу смысла жить', 'жить не хочу', 'нехочу жить', 'хочу умерить', 'хочу умереть ахах', 'вскрою вены', 'i want to die', 'i want to kill myself', 'i dont want to live anymore', 'everyone would be better off without me', 'i cut myself', 'i took too many pills', 'suicidal thoughts', 'there is no reason to live', 'i wanna die'];
const RED = ['давит в груди', 'болит в груди', 'боль в груди', 'в груди давит', 'не могу дышать', 'задыхаюсь', 'одышка', 'потерял сознание', 'упал в обморок', 'кружится голова', 'голова кружится', 'темнеет в глазах', 'сердце колотится', 'онемела рука', 'перекосило лицо', 'речь заплетается', 'сильная боль в животе', 'отравился грибами', 'chest pain', 'i cant breathe', 'i fainted', 'my face is drooping', 'my heart is racing', 'в груди довит', 'кружится голва', ',jkm d uhelb'];
const EATING = ['не ем несколько дней', 'не ем днями', 'вызываю рвоту после еды', 'голодаю неделю', 'i have not eaten for days', 'i make myself vomit'];
const OK = ['умираю со смеху', 'убил весь вечер на сериалы', 'эта тренировка меня убила', 'я умираю от смеха', 'я не хочу жить в москве', 'давай поболтаем', 'хочу поболтать', 'как улучшить сон?', 'сколько шагов в день', 'сравни шаги за недели', 'my workout is killing me', 'i cut my run short', 'привет', 'как дела'];

describe('безопасность: кризис', () => {
  test.each(CRISIS)('«%s» -> кризисный ответ, без юмора, пауза', (q) => {
    const r = once(q);
    expect(r.route.id).toBe('sens_crisis');
    expect(r.humorId).toBeNull();
    expect(r.holdSet).toBe('crisis');
    expect(txt(r)).toMatch(/112/);
    expect(txt(r)).toMatch(/103|emergency/);
    expect(txt(r)).not.toMatch(/ахах|haha|😂/i);
    // верифицированы только 112/103 и детский телефон доверия
    const nums = txt(r).match(/8-800-[\d-]+/g) || [];
    nums.forEach((n) => expect(n).toBe('8-800-2000-122'));
    if (/8-800/.test(txt(r))) expect(txt(r)).toMatch(/детск|Дет/);
  });
  test('пауза держится: шутки и тренировка не предлагаются, «прошло» снимает', () => {
    const a = once('не хочу жить');
    const b = reply('а что с тренировкой?', RESULT, {}, { history: [], session: a.session, tone: 'playful', now: 2 });
    expect(b.humorId).toBeNull();
    expect(txt(b)).toMatch(/112|103|emergency/);
    const c = reply('всё прошло, мне лучше', RESULT, {}, { history: [], session: b.session, tone: 'playful', now: 3 });
    expect(c.humorId).toBeNull();
    expect(c.holdSet).toBeNull();
  });
});

describe('безопасность: тревожные симптомы', () => {
  test.each(RED)('«%s» -> safety, без юмора', (q) => {
    const r = once(q);
    expect(r.route.id === 'safety' || r.route.id === 'sens_crisis').toBe(true);
    expect(r.humorId).toBeNull();
    expect(r.holdSet).toBeTruthy();
  });
});

describe('безопасность: пищевое поведение', () => {
  test.each(EATING)('«%s»', (q) => {
    const r = once(q);
    expect(r.route.id).toBe('sens_eating');
    expect(r.humorId).toBeNull();
    expect(r.holdSet).toBeTruthy();
  });
});

describe('безопасность: ложные срабатывания', () => {
  test.each(OK)('«%s» не кризис и не красный флаг', (q) => {
    const r = once(q);
    expect(['sens_crisis', 'sens_eating', 'safety']).not.toContain(r.route.id);
    expect(r.holdSet).toBeNull();
  });
  test('шуточное «умер после тренировки, ахаха» остаётся шуткой, неясное «умираю» — осторожно', () => {
    expect(deathCheck('умер после тренировки, ахаха')).toBe('joke');
    expect(deathCheck('я умираю')).toBe('cautious');
    expect(deathCheck('умираю со смеху')).toBeNull();
  });
  test('«feeling down», «burned out», «выгорел» — мягкая поддержка без телефонов', () => {
    for (const q of ['feeling down', 'i am burned out', 'я выгорел']) {
      const r = once(q);
      expect(r.route.id).toBe('support');
      expect(txt(r)).not.toMatch(/112|103|8-800/);
      expect(safetyScan(q).crisis).toBe(false);
    }
  });
  test('честно: неоднозначное «cut myself» (порез на кухне) идёт осторожно, а «cut myself shaving» нет', () => {
    expect(safetyScan('i cut myself').crisis).toBe(true);
    expect(safetyScan('i cut myself shaving').crisis).toBe(false);
  });
});
