// Локальная модель намерений (lib/coach/ml.js): совпадение хэша с Python, загрузка, маршрутизация после правил, безопасность.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('../lib/i18n', () => ({ ...jest.requireActual('../lib/i18n'), RU: true }));

const fs = require('fs');
const path = require('path');
import { reply } from '../lib/coachBrain';
import { COACH_CONFIG } from '../lib/coach/config';
import { predict, featuresOf, probsOf, modelLabels, loadModel, describeRoute, isSensLabel } from '../lib/coach/ml';
import { normalize } from '../lib/coach/normalize';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { status: 'ok', score: 50 } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 } },
};
const once = (q, session) => reply(q, RESULT, {}, { history: [], session: session || {}, now: 1 });
const withMl = (on, fn) => { const was = COACH_CONFIG.ml; COACH_CONFIG.ml = on; try { return fn(); } finally { COACH_CONFIG.ml = was; } };
const rid = (r) => (r.route.kind === 'engine' ? r.route.control ? 'ctl_' + r.route.control : r.route.id : 'legacy:' + r.route.id);

const FX = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'intent_xcheck.json'), 'utf8'));

describe('ML 1. хэш и признаки совпадают с Python бит-в-бит', () => {
  test('нормализация приложения даёт ту же строку, что в датасете', () => {
    for (const c of FX.cases) expect(normalize(c.text)).toBe(c.norm);
  });
  test('индексы признаков идентичны, значения совпадают', () => {
    expect(FX.cases.length).toBeGreaterThan(50);
    for (const c of FX.cases) {
      const [idx, val] = featuresOf(c.norm, FX.bits);
      expect(idx).toEqual(c.idx);
      expect(val.length).toBe(c.val.length);
      val.forEach((v, i) => expect(Math.abs(v - c.val[i])).toBeLessThan(1e-9));
    }
  });
  test('вероятности по квантованной модели совпадают с numpy', () => {
    const labels = modelLabels();
    for (const c of FX.cases) {
      const p = probsOf(c.norm);
      for (const [l, pp] of c.top) expect(Math.abs(p[labels.indexOf(l)] - pp)).toBeLessThan(1e-4);
    }
  });
});

describe('ML 2. модель', () => {
  test('загружается один раз, размер в пределах 3 МБ, метки согласованы', () => {
    const m = loadModel();
    expect(loadModel()).toBe(m);
    expect(fs.statSync(path.join(__dirname, '..', 'lib', 'coach', 'model', 'intent.json')).size).toBeLessThan(3 * 1024 * 1024);
    expect(m.Q.length).toBe(m.dim * m.labels.length);
    for (const l of ['other', 'sens_safety', 'sens_treatment', 'sens_support', 'ctl_short', 'cap_ai', 'legacy_sleep']) expect(m.labels).toContain(l);
    expect(Math.abs(Array.from(probsOf('как улучшить сон')).reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-9);
  });
  test('предсказание детерминировано, пустой текст -> null', () => {
    const a = predict('слушай а как мне лучше спать', 3);
    expect(predict('слушай а как мне лучше спать', 3)).toEqual(a);
    expect(a.top).toHaveLength(3);
    expect(a.top[0].p).toBeGreaterThanOrEqual(a.top[1].p);
    expect(predict('')).toBeNull();
    expect(predict('   ')).toBeNull();
  });
  test('задержка: < 5 мс на реплику (node, с запасом)', () => {
    predict('прогрев');
    const t = Date.now();
    for (let i = 0; i < 200; i++) predict('как улучшить сон, слушай, а то совсем плохо сплю ' + i);
    expect((Date.now() - t) / 200).toBeLessThan(5);
  });
  test('describeRoute: неоднозначные/служебные метки не маршрутизируются', () => {
    for (const l of ['other', 'ctl_yes', 'ctl_no', 'ctl_ok', 'wx_geo_denied', 'data_user_stated']) expect(describeRoute(l)).toBeNull();
    expect(describeRoute('sens_safety').kind).toBe('sens');
    expect(isSensLabel('sens_support')).toBe(true);
    expect(describeRoute('legacy_sleep')).toEqual({ kind: 'legacy', topic: 'sleep', label: 'legacy_sleep' });
  });
});

describe('ML 3. опечатки и разговорные формы после правил', () => {
  test.each([
    ['ты бат?', 'cap_ai'],
    ['нужин ли интернет', 'cap_offline'],
    ['спс бро', 'ctl_thanks'],
  ])('«%s» -> %s (правила одни не справлялись)', (q, id) => {
    expect(rid(withMl(false, () => once(q)))).not.toBe(id);
    const r = withMl(true, () => once(q));
    expect(rid(r)).toBe(id);
    expect(r.route.ml).toBeTruthy();
  });
  test('выключатель: при ml:false модель не вызывается', () => {
    expect(withMl(false, () => once('ты бат?')).route.ml).toBeNull();
  });
  test('если правила уверены, модель не вмешивается', () => {
    for (const q of ['как улучшить сон', 'тренироваться сегодня?', 'Привет', 'какая сейчас погода?']) {
      const a = withMl(true, () => once(q)); const b = withMl(false, () => once(q));
      expect(a.route.ml).toBeNull();
      expect(a.text).toEqual(b.text);
    }
  });
  test('бессмыслица остаётся «неизвестным»', () => {
    for (const q of ['фывапролдж', 'asdfgh', 'ъъъ ыыы', 'qwerty uiop', 'бла бла бла абракадабра', 'сколько звезд на луне', '???']) {
      const r = withMl(true, () => once(q));
      expect(r.route.ml).toBeNull();
      expect(['scope_unknown', 'scope_gibberish', 'scope_ambiguous']).toContain(r.route.id);
    }
  });
  test('детерминизм: одинаковый ответ на одинаковую реплику', () => {
    const a = withMl(true, () => once('кружица голова и тимнеет в глазах'));
    const b = withMl(true, () => once('кружица голова и тимнеет в глазах'));
    expect(a.text).toEqual(b.text);
    expect(a.route).toEqual(b.route);
  });
});

describe('ML 4. безопасность: модель ничего не отменяет и не смягчает', () => {
  const RULE_SENSITIVE = ['болит в груди', 'я умираю', 'не могу дышать', 'умер после тренировки, ахаха', 'колено болит после бега', 'принимаю антибиотики можно тренироваться', 'у меня депрессия', 'мне стыдно что пропустил тренировку', 'потерял сознание после пробежки', 'сердце давит и трудно дышать'];
  test.each(RULE_SENSITIVE)('«%s»: ответ с моделью и без неё совпадает дословно', (q) => {
    const a = withMl(true, () => once(q)); const b = withMl(false, () => once(q));
    expect(a.text).toEqual(b.text);
    expect(a.holdSet).toEqual(b.holdSet);
    expect(a.humorId).toBeNull();
    expect(a.route.ml).toBeNull();
  });
  test('модель распознаёт чувствительное, которое правила пропустили, и отвечает осторожно, без юмора', () => {
    for (const [q, kind] of [['кружица голова и тимнеет в глазах', 'sens_unsure'], ['мне оч тревожна', 'legacy:support']]) {
      const r = withMl(true, () => once(q));
      expect(rid(r)).toBe(kind);
      expect(r.humorId).toBeNull();
      expect(r.route.ml).toMatch(/^sens_/);
    }
    const t = withMl(true, () => once('принимаю антибиотыки можно бегать'));
    expect(rid(t)).toBe('legacy:treatment');
  });
  test('защитная пауза: после тревожного симптома модель не используется', () => {
    const first = withMl(true, () => once('болит в груди'));
    expect(first.holdSet).toBeTruthy();
    for (const q of ['ты бат?', 'спс бро', 'нужин ли интернет']) {
      const r = withMl(true, () => reply(q, RESULT, {}, { history: [], session: first.session, now: 2 }));
      expect(r.route.ml).toBeNull();
      const off = withMl(false, () => reply(q, RESULT, {}, { history: [], session: first.session, now: 2 }));
      expect(r.text).toEqual(off.text);
    }
  });
  test('модель не может отправить в тренировку или юмор из чувствительного маршрута', () => {
    const r = withMl(true, () => once('кружица голова и тимнеет в глазах'));
    expect(r.route.id).toBe('sens_unsure');
    expect(r.text.join(' ')).toMatch(/103|112/);
  });
});
