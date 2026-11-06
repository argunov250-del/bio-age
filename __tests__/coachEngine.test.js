// Движок коуча lib/coach: нормализация, NLU, память, выбор вариантов, сборка, каталог, погода. Сеть мокается.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('../lib/i18n', () => ({ ...jest.requireActual('../lib/i18n'), RU: true }));

const fs = require('fs');
const path = require('path');
import { reply, setCoachWeather } from '../lib/coachBrain';
import { normalize } from '../lib/coach/normalize';
import { analyzeText, deathCheck, PRIORITY } from '../lib/coach/nlu';
import { emptyMemory, serialize, deserialize, advance, PENDING_TTL } from '../lib/coach/memory';
import { pickVariant } from '../lib/coach/select';
import { assemble, plural, withUnit, validate, fill } from '../lib/coach/assemble';
import { buildVars } from '../lib/coach/vars';
import { weatherState, WEATHER_TTL } from '../lib/coach/weatherCtx';
import { SCENARIOS, BY_ID, checkCatalog } from '../lib/coach/scenarios';
import { CATALOG } from '../lib/humor/catalog';

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const RESULT = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const TIRED = { ...RESULT, scores: { ...RESULT.scores, readiness: { status: 'ok', score: 30 } } };
const j = (r) => r.text.join('\n');
// Диалог: каждый ход получает память и сессию прошлого хода.
function chat(turns, o = {}) {
  let session = {};
  const out = [];
  const history = [];
  for (const q of turns) {
    const r = reply(q, o.result === undefined ? RESULT : o.result, o.profile || {}, { history: history.slice(), session, tone: o.tone, now: 1 });
    session = r.session;
    history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId });
    out.push(r);
  }
  return out;
}
const WX = (kind, temp, extra) => ({ kind, temp, day: true, at: Date.now() - 60000, place: 'Москва', ...(extra || {}) });
afterEach(() => { setCoachWeather(null); jest.restoreAllMocks(); });

describe('1. существующие сценарии сохранены', () => {
  test.each([['today', 'today'], ['train', 'train'], ['sleep', 'sleep'], ['Как улучшить сон?', 'sleep'], ['Что с пульсом и HRV?', 'heart'], ['Кто ты?', 'about'], ['Мне лень идти бегать', 'procrastination'], ['У меня 9980 шагов. Обязательно добить до 10000?', 'round_chase']])('%s -> %s', (q, topic) => {
    expect(reply(q, RESULT, {}).topic).toBe(topic);
  });
  test('about не обещает «без интернета»', () => { expect(j(reply('Кто ты?', RESULT, {}))).not.toMatch(/без интернета/); });
});

describe('2. нормализация', () => {
  test.each([['  ПАЧЕМУ??  ', 'почему'], ['Спс!', 'спасибо'], ['ёлка', 'елка'], ['Тренеровка сегодня', 'тренировка сегодня'], ['спасибооо', 'спасибо'], ['Каротко', 'короче'], ['щас норм', 'сейчас нормально'], ['10 000 шагов', '10 000 шагов']])('%s', (a, b) => { expect(normalize(a)).toBe(b); });
  test('приоритет задокументирован', () => { expect(PRIORITY[0]).toBe('sensitive_red'); expect(PRIORITY.indexOf('control')).toBeLessThan(PRIORITY.indexOf('capability')); });
});

describe('3. хочу / не хочу / нельзя / почему советуешь / вчера', () => {
  const a = (q) => analyzeText(q);
  test('признаки', () => {
    expect(a('хочу тренироваться').want).toBe('pos');
    expect(a('не хочу тренироваться').want).toBe('neg');
    expect(a('мне нельзя тренироваться?').modalQuestion).toBe(true);
    expect(a('мне нельзя тренироваться?').want).toBeNull();
    expect(a('почему ты советуешь тренироваться?').aboutPrev).toBe(true);
    expect(a('почему ты советуешь тренироваться?').cont).toBe('why');
    expect(a('вчера хотел тренироваться').past).toBe(true);
    expect(a('хочу тренироваться').past).toBe(false);
  });
  test('«не хочу бегать, предложи что-то дома» — альтернатива с местом, а не отказ', () => {
    const n = a('Не хочу бегать, предложи что-то дома');
    expect(n.avoid).toBe('run'); expect(n.place).toBe('home'); expect(n.cont).toBeNull();
    const r = reply('Не хочу бегать, предложи что-то дома', RESULT, {});
    expect(r.topic).toBe('train'); expect(j(r)).toMatch(/дома/i); expect(j(r)).not.toMatch(/\?/);
  });
  test('«на улице дождь» — не место занятия', () => { expect(a('На улице дождь. Тренироваться сегодня?').place).toBeNull(); expect(a('Хочу на улице потренироваться').place).toBe('outdoor'); });
  test('ограничения: время и тип', () => { const n = a('Есть 15 минут, хочу растяжку'); expect(n.timeLimited).toBe(true); expect(n.minutes).toBe(15); expect(n.activity).toBe('stretch'); });
  test('«я не лень» не срабатывает как команда', () => { expect(a('Нет данных о сне').cont).toBeNull(); expect(a('спасибо, а что с пульсом?').cont).toBeNull(); });
});

describe('4. чувствительное важнее всего', () => {
  test('красный флаг против шутки', () => {
    expect(deathCheck('умер после тренировки, ахаха')).toBe('joke');
    expect(deathCheck('боюсь, что умираю, мне трудно дышать')).toBe('red');
    expect(deathCheck('я умираю')).toBe('cautious');
    expect(deathCheck('Как улучшить сон?')).toBeNull();
  });
  test('шуточное — нейтрально и без юмора; настоящее — 103/112', () => {
    const a = reply('умер после тренировки, ахаха', RESULT, {}, { tone: 'playful' });
    expect(a.topic).toBe('sensitive'); expect(a.humorId).toBeNull(); expect(j(a)).not.toMatch(/103|112|ахах/);
    const b = reply('боюсь, что умираю, мне трудно дышать', RESULT, {}, { tone: 'playful' });
    expect(b.topic).toBe('safety'); expect(j(b)).toMatch(/112/); expect(b.humorId).toBeNull();
    const c = reply('я умираю', RESULT, {}, { tone: 'playful' });
    expect(j(c)).toMatch(/103|112/); expect(c.humorId).toBeNull();
  });
  test('«спасибо» не перебивает боль', () => { expect(reply('Спасибо, но болит колено', RESULT, {}).topic).toBe('safety'); });
  test('безопасность не блокируется повторами', () => {
    const turns = Array(6).fill('Боль в груди и давит');
    chat(turns).forEach((r) => { expect(r.topic).toBe('safety'); expect(j(r)).toMatch(/112/); });
  });
});

describe('5. неизвестное, мусор, несколько тем', () => {
  test('неизвестный запрос — полезный ответ без перечисления всего', () => {
    const r = reply('неведомая абракадабра', RESULT, {});
    expect(r.topic).toBe('scope'); expect(r.humorId).toBeNull(); expect(j(r).length).toBeGreaterThan(40);
  });
  test.each(['фывапролдж', 'asdfghjkl', '???!!!', 'ыыыыыыы'])('мусор: %s', (q) => { expect(reply(q, RESULT, {}).text[0]).toMatch(/символ|слова|не разобрал|не похоже/i); });
  test('несколько тем — уточнение с темами, потом ответ по выбранной', () => {
    const [a, b] = chat(['Сплю мало, шагов мало, вес растёт и стресс на работе. С чего начать?', 'сон']);
    expect(j(a)).toMatch(/несколько|сразу|вопрос/i); expect(a.session.memory.pending.key).toBe('which_topic');
    expect(b.topic).toBe('sleep');
  });
  test('вне области', () => { expect(reply('какой курс доллара', RESULT, {}).text[0]).toMatch(/вне|область|не помощник|не лезть/i); });
  test('8–12 вариантов у unknown и благодарности', () => {
    expect(BY_ID.scope_unknown.variants.length).toBeGreaterThanOrEqual(8);
    expect(BY_ID.ctl_thanks.variants.length).toBeGreaterThanOrEqual(8);
    expect(BY_ID.ctl_thanks.variants.length).toBeLessThanOrEqual(16);
  });
});

describe('6. почему / проще / другой вариант', () => {
  test('почему — объяснение последней рекомендации по данным', () => {
    const [, why] = chat(['Тренироваться сегодня?', 'Почему?']);
    expect(j(why)).toMatch(/Готовность сегодня 75\/100/);
    const [, whyT] = chat(['Тренироваться сегодня?', 'а почему'], { result: TIRED });
    expect(j(whyT)).toMatch(/Причины|Готовность/);
  });
  test('без контекста — коротко уточняет, не угадывает', () => { const r = reply('Почему?', RESULT, {}); expect(j(r)).toMatch(/Про что|Уточни/); });
  test('попроще упрощает прошлый план', () => { const [, s] = chat(['Что мне делать сегодня?', 'А попроще?']); expect(j(s)).toMatch(/прогулк/i); });
  test('другой вариант — в той же теме', () => { const [, o] = chat(['Как улучшить сон?', 'Другой вариант']); expect(j(o)).toMatch(/кофе|свет|дневного|спальн|рычаг|режим/i); });
  test('«ты это уже говорил» признаёт повтор и даёт другое', () => { const [, n] = chat(['Как улучшить сон?', 'Ты это уже говорил']); expect(n.text[0]).toMatch(/повторился|уже было|подмечено/); expect(n.text.length).toBeGreaterThan(1); });
  test('повтори возвращает прошлый ответ', () => { const [a, b] = chat(['Как улучшить сон?', 'повтори']); a.text.forEach((p) => expect(j(b)).toContain(p)); });
  test('да/нет без контекста не угадывают', () => { expect(j(reply('да', RESULT, {}))).toMatch(/на что|тему/); expect(reply('нет', RESULT, {}).text.length).toBeGreaterThan(0); });
  test('короче/подробнее сохраняются как предпочтение', () => {
    const [a, , c] = chat(['короче', 'Как улучшить сон?', 'подробнее']);
    expect(a.session.memory.brevity).toBe('short'); expect(c.session.memory.brevity).toBe('detailed');
  });
});

describe('7–8. уточнения: срок жизни и отсутствие повторных вопросов', () => {
  test('Д1: простое → уточнение → ответ без повторного вопроса', () => {
    const [a, b] = chat(['Не хочу сегодня ничего сложного.', 'Тренировку.']);
    expect(j(a)).toMatch(/упростить тренировку или/); expect(a.session.memory.pending.key).toBe('simplify_what');
    expect(j(b)).toMatch(/необязательные части/); expect(j(b)).toMatch(/Какая тренировка/);
    const [, c] = chat(['Не хочу сегодня ничего сложного.', 'Растяжку.', ]);
    expect(c.session.memory.known.activity.v).toBe('stretch');
  });
  test('ожидание живёт PENDING_TTL ходов и сбрасывается сменой темы', () => {
    let m = advance(emptyMemory(), { topic: 'train', pending: { key: 'simplify_what', topic: 'mot_nothing_hard' } });
    for (let i = 0; i < PENDING_TTL; i++) m = advance(m, { topic: 'train' });
    expect(m.pending).toBeNull();
    let m2 = advance(emptyMemory(), { topic: 'train', pending: { key: 'place' } });
    m2 = advance(m2, { topic: 'sleep' });
    expect(m2.pending).toBeNull();
    const [, , c] = chat(['Не хочу сегодня ничего сложного.', 'Как улучшить сон?', 'Тренировку.']);
    expect(j(c)).not.toMatch(/необязательные части/);
  });
  test('место не переспрашивается, когда известно', () => {
    const q1 = reply('На улице дождь. Тренироваться сегодня?', RESULT, {});
    expect(j(q1)).toMatch(/улицу или зал/);
    const [a, b] = chat(['На улице дождь. Тренироваться сегодня?', 'в зале']);
    expect(a.session.memory.pending.key).toBe('place');
    expect(j(b)).toMatch(/не повод отменять/); expect(j(b)).not.toMatch(/\?/);
    const k = reply('Идёт дождь, я в зале. Тренироваться сегодня?', RESULT, {});
    expect(j(k)).not.toMatch(/улицу или зал/);
  });
  test('Д5-подобное: параметры помним ограниченное время', () => {
    let m = advance(emptyMemory(), { known: { place: 'gym' } });
    for (let i = 0; i < 8; i++) m = advance(m, {});
    expect(m.known.place).toBeUndefined();
  });
});

describe('9. склонения и единицы', () => {
  test.each([[1, 'шаг'], [2, 'шага'], [5, 'шагов'], [11, 'шагов'], [21, 'шаг'], [24, 'шага'], [112, 'шагов']])('шаг %i', (n, w) => { expect(plural(n, 'step')).toBe(w); });
  test('минуты и часы', () => {
    expect(plural(1, 'minute')).toBe('минута'); expect(plural(3, 'minute')).toBe('минуты'); expect(plural(15, 'minute')).toBe('минут');
    expect(plural(1, 'minuteAcc')).toBe('минуту'); expect(plural(2, 'hour')).toBe('часа'); expect(plural(5, 'hour')).toBe('часов'); expect(plural(21, 'hour')).toBe('час');
    expect(plural(1, 'step', false)).toBe('step'); expect(plural(2, 'step', false)).toBe('steps'); expect(withUnit(1, 'minuteAcc')).toBe('1 минуту');
  });
  test('шаблоны подставляют значение и единицу', () => {
    const v = buildVars({ steps7: 8000, stepGoal: 8000 }, { status: 'none' }, {}, {}, true);
    expect(fill('{steps7|full}', v)).toMatch(/8\D?000 шагов/);
    expect(fill('{sleepH}', v)).toBe('{sleepH}'); // нет данных — останется плейсхолдером и вариант отклонится
  });
});

describe('10–11. никакого мусора и выдуманных показателей', () => {
  const INPUTS = ['Привет', 'спасибо', 'ладно', 'почему', 'проще', 'другой вариант', 'повтори', 'Без шуток', 'повеселее', 'Ты настоящий ИИ?', 'Работаешь без интернета?', 'нет данных', 'шаги не обновились', 'Какая погода?', 'Тренироваться? Дождь', 'Как там погода для прогулки?', 'я спал 5 часов', 'abracadabra', '🙏', ''];
  const RES = [undefined, null, {}, { scores: {} }, RESULT, TIRED];
  test('нет undefined/null/NaN/плейсхолдеров/служебных id', () => {
    for (const res of RES) for (const q of INPUTS) {
      const r = reply(q, res, {}, { tone: 'playful' });
      const v = validate(r.text);
      expect({ q, ok: v.ok, p: v.problems }).toEqual({ q, ok: true, p: [] });
    }
  });
  test('нет данных — нет цифр: неизвестное не заменяется нулём', () => {
    const [, why] = chat(['Тренироваться сегодня?', 'почему'], { result: null });
    expect(j(why)).not.toMatch(/\/100|\b0\b/);
    expect(j(reply('Тренироваться? погода хорошая', null, {}))).not.toMatch(/undefined|NaN/);
  });
  test('«я спал 5 часов» принимается как слова пользователя, оценки не меняются', () => {
    const r = reply('Я спал 5 часов', RESULT, {});
    expect(j(r)).toMatch(/5 ч/); expect(j(r)).toMatch(/не пересчитываю/);
  });
});

describe('12. сборка блоков', () => {
  const v = { id: 'x', blocks: { reaction: ['Понял.', 'Ok.'], main: ['Делай так.', 'Do this.'], explain: ['Потому что.', 'Because.'], action: ['Шаг один.', 'One step.'], clarify: ['Где?', 'Where?'] } };
  test('по умолчанию без объяснения, вопрос последним', () => { expect(assemble(v, { ru: true, vars: {} }).paras).toEqual(['Понял.', 'Делай так.', 'Шаг один.', 'Где?']); });
  test('коротко: главное и уточнение; подробно: с объяснением', () => {
    expect(assemble(v, { ru: true, vars: {}, brevity: 'short' }).paras).toEqual(['Делай так.', 'Где?']);
    expect(assemble(v, { ru: true, vars: {}, brevity: 'detailed' }).paras).toContain('Потому что.');
  });
  test('вопрос в главном блоке убирает уточнение; одинаковые блоки не дублируются', () => {
    const w = { id: 'y', blocks: { main: ['Где?', 'Where?'], clarify: ['Где?', 'Where?'], action: ['Где?', 'Where?'] } };
    expect(assemble(w, { ru: true, vars: {} }).paras).toEqual(['Где?']);
  });
  test('шутка: не больше одной, не перед опасным, не в коротком, не в sensitive-варианте', () => {
    const joke = { text: 'Шутка.', placement: 'lead' };
    const a = assemble(v, { ru: true, vars: {}, joke });
    expect(a.paras.filter((p) => p === 'Шутка.').length).toBe(1); expect(a.paras[0]).toBe('Шутка.');
    expect(assemble(v, { ru: true, vars: {}, joke, danger: true }).paras[0]).not.toBe('Шутка.');
    expect(assemble(v, { ru: true, vars: {}, joke, brevity: 'short' }).jokeUsed).toBe(false);
    expect(assemble({ ...v, humorOk: false }, { ru: true, vars: {}, joke }).jokeUsed).toBe(false);
  });
  test('необязательный блок без данных пропускается', () => {
    const w = { id: 'z', blocks: { main: ['Ок.', 'Ok.'], extra: ['Шагов {steps7|full}.', 'x', ['steps7']] } };
    expect(assemble(w, { ru: true, vars: buildVars({}, { status: 'none' }, {}, {}) }).paras).toEqual(['Ок.']);
  });
});

describe('13. защита от повторов', () => {
  test('LRU: давно не использованный, стабильный порядок, после исчерпания самый давний', () => {
    const c = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(pickVariant(c, []).id).toBe('a');
    expect(pickVariant(c, ['a']).id).toBe('b');
    expect(pickVariant(c, ['a', 'b']).id).toBe('c');
    expect(pickVariant(c, ['a', 'b', 'c']).id).toBe('a');
    expect(pickVariant(c, ['b', 'c', 'a']).id).toBe('b');
    expect(pickVariant(c, [], { exclude: ['a'] }).id).toBe('b');
    expect(pickVariant([{ id: 'a' }], ['a'], { exclude: ['a'] }).id).toBe('a');
  });
  test('«спасибо» подряд не повторяется до исчерпания и возвращается к самому давнему', () => {
    const n = BY_ID.ctl_thanks.variants.length;
    const rs = chat(Array(n + 1).fill('спасибо'));
    const first = rs.slice(0, n).map((r) => j(r));
    expect(new Set(first).size).toBe(n);
    expect(j(rs[n])).toBe(first[0]);
  });
  test('id шуток и ответов хранятся отдельно', () => {
    const r = reply('У меня 9980 шагов. Обязательно добить до 10000?', RESULT, {});
    expect(r.humorId).toBeTruthy(); expect(r.session.memory.recent).not.toContain(r.humorId);
  });
});

describe('14–15. режим без шуток и реакция на негатив', () => {
  test('«Без шуток» — ответ по делу, юмор выключен дальше', () => {
    const rs = chat(['Без шуток, пожалуйста.', 'У меня 9980 шагов. Обязательно добить до 10000?'], { tone: 'playful' });
    expect(rs[0].text).toEqual(['Понял, дальше по делу.']); expect(rs[0].session.dampened).toBe(true); expect(rs[0].session.memory.humorMode).toBe('off');
    expect(rs[1].humorId).toBeNull();
  });
  test('«не смешно» — признание без оправданий', () => { const r = reply('не смешно', RESULT, {}, { tone: 'playful' }); expect(r.text.length).toBe(1); expect(r.humorId).toBeNull(); expect(j(r)).not.toMatch(/извини|прости/i); });
  test('«повеселее» включает юмор, если не выключен в профиле', () => {
    const [, b] = chat(['без шуток', 'повеселее'], { tone: 'balanced' });
    expect(b.session.dampened).toBe(false); expect(b.session.memory.humorMode).toBe('playful');
    expect(j(reply('повеселее', RESULT, {}, { tone: 'off' }))).toMatch(/Профил/);
  });
  test('память об отказе от шуток переживает новую сессию', () => {
    const m = deserialize(serialize(chat(['без шуток'])[0].session.memory), { newSession: true });
    expect(m.humorMode).toBe('off');
    expect(reply('У меня 9980 шагов. Обязательно добить до 10000?', RESULT, {}, { tone: 'playful', memory: m }).humorId).toBeNull();
  });
});

describe('16–17. офлайн и отсутствие сетевых зависимостей', () => {
  test('коуч не вызывает fetch / XMLHttpRequest', () => {
    const f = jest.fn(() => { throw new Error('network'); });
    const oldF = global.fetch; const oldX = global.XMLHttpRequest;
    global.fetch = f; global.XMLHttpRequest = f;
    try {
      setCoachWeather(WX('rain', 8));
      ['Привет', 'Какая погода?', 'Тренироваться? дождь', 'Ты настоящий ИИ?', 'нет данных', 'повтори', 'asdfgh', 'Боль в груди'].forEach((q) => reply(q, RESULT, {}));
    } finally { global.fetch = oldF; global.XMLHttpRequest = oldX; }
    expect(f).not.toHaveBeenCalled();
  });
  test('модули lib/coach не содержат сетевых вызовов и внешних сервисов', () => {
    const dir = path.join(__dirname, '..', 'lib', 'coach');
    const files = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : files.push(path.join(d, e.name))));
    walk(dir);
    files.filter((f) => f.endsWith('.js')).forEach((f) => {
      const src = fs.readFileSync(f, 'utf8').replace(/\/\/.*$/gm, '');
      expect(src).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|open-meteo|openai|anthropic|axios|expo-location/i);
      expect(src).not.toMatch(/from '(\.\.\/)+weather'/);
    });
  });
  test('фраза про сеть', () => { expect(j(reply('Ты работаешь без интернета?', RESULT, {}))).toBe('Ответы коуча формируются локально. Для погоды приложение обращается к погодному сервису.'); });
  test('честность о возможностях', () => {
    expect(j(reply('Ты настоящий искусственный интеллект?', RESULT, {}))).toMatch(/локальный коуч со сценариями и правилами, без языковой модели/);
    expect(j(reply('Как отключить юмор?', RESULT, {}))).toMatch(/Профиль → Юмор Хирона/);
    expect(j(reply('Ты умеешь ставить диагноз?', RESULT, {}))).toMatch(/Нет/);
    expect(j(reply('Куда уходят мои сообщения?', RESULT, {}))).toMatch(/0,1°/);
  });
});

describe('18. интерфейс не изменён вне необходимости', () => {
  test('чат и профиль сохранили ключевые элементы', () => {
    const chatSrc = fs.readFileSync(path.join(__dirname, '..', 'lib', 'screens', 'CoachScreen.js'), 'utf8');
    ['function Bubble', 'KineticText', 'GAUGE.typingMs', 'coach/store', 'coach/qaEngine'].forEach((m) => expect(chatSrc).toContain(m));
    const prof = fs.readFileSync(path.join(__dirname, '..', 'lib', 'screens', 'ProfileScreen.js'), 'utf8');
    expect(prof).toContain('Юмор Хирона'); expect(prof).toContain('Очистить память Хирона'); expect(prof).not.toMatch(/Health ?Connect.*clear/i);
  });
  test('reply сохраняет прежний контракт полей', () => { expect(Object.keys(reply('Привет', RESULT, {})).sort()).toEqual(['consumed', 'fact', 'holdSet', 'humorId', 'next', 'session', 'text', 'topic']); });
});

describe('20. согласованность рекомендаций между вариантами', () => {
  test('при тех же фактах рекомендация одна и та же', () => {
    const outs = [];
    let mem;
    for (let i = 0; i < 4; i++) { const r = reply('Идёт гроза. Хочу пробежаться.', RESULT, {}, { memory: mem, tone: 'off' }); mem = r.session.memory; outs.push(j(r)); setCoachWeather(null); }
    expect(new Set(outs).size).toBeGreaterThan(1);
    outs.forEach((o) => expect(o).toMatch(/перенести|отложить/));
    expect(BY_ID.wx_train_danger_outdoor.variants.every((v) => JSON.stringify(v.blocks).match(/дома|помещени/))).toBe(true);
  });
  test('и память сериализуется без текстов сообщений', () => {
    const r = chat(['Мой секретный вопрос про сон zzqq'])[0];
    const s = serialize(r.session.memory);
    expect(s).not.toMatch(/zzqq|секретн/); expect(deserialize(s).lastTopic).toBe('sleep');
    expect(deserialize('{broken')).toEqual(emptyMemory()); expect(deserialize({ v: 2 })).toEqual(emptyMemory());
  });
});

describe('целостность каталога', () => {
  test('проверка каталога пуста', () => { expect(checkCatalog(SCENARIOS, CATALOG)).toEqual([]); });
  test('проверка ловит дубли и пустые варианты', () => {
    const bad = [{ id: 'a', group: 'g', positives: [], negatives: [], variants: [{ id: 'v', text: { ru: ['x'], en: ['x'] } }, { id: 'v', text: { ru: [''], en: ['y'] } }] }, { id: 'a', group: 'g', positives: [], negatives: [], variants: [] }];
    const r = checkCatalog(bad);
    expect(r.join('|')).toMatch(/variant id: v/); expect(r.join('|')).toMatch(/blank ru/); expect(r.join('|')).toMatch(/scenario id: a/); expect(r.join('|')).toMatch(/no variants/);
  });
  test('все варианты собираются без мусора при полном наборе переменных', () => {
    const full = buildVars({ steps7: 8000, steps30: 7500, stepGoal: 8000, sleepH: 7.5, sleepNorm: 7.5, sleepScore: 80, sleep7: 7.4, readiness: 75, rhr7: 60, active7: 200, workouts7: 3 }, { status: 'current', kind: 'rain', temp: 8, cond: 'rain', level: 'inconvenient', place: 'Москва', ageMin: 5, at: 1 }, { place: 'gym', activity: 'run' }, { sleep: 5, steps: 7000 }, true);
    ['savedLabel', 'savedAgo'].forEach((n) => { full[n] = { name: n, value: 'дождь', kind: 'text', available: true }; });
    ['baseTrain', 'dangerWhy', 'wxCond', 'curCond', 'curCondCap', 'askPlace', 'askActivity', 'topicList', 'sleepTips', 'rankName', 'questTitle', 'questWhy', 'waterGoal', 'waterNote', 'curLevel', 'curRank'].forEach((n) => { full[n] = { name: n, value: 'текст', kind: 'text', available: true }; });
    SCENARIOS.forEach((sc) => sc.variants.forEach((v) => {
      const p = assemble(v, { ru: true, vars: full }).paras;
      expect({ id: v.id, ok: validate(p).ok }).toEqual({ id: v.id, ok: true });
    }));
  });
  test('позитивные и негативные примеры', () => {
    SCENARIOS.filter((sc) => sc.match && sc.positives.length).forEach((sc) => {
      sc.positives.forEach((q) => { if (/wx_|sens_/.test(sc.id)) return; expect({ id: sc.id, q, m: !!sc.match(analyzeText(q), { nlu: analyzeText(q) }) }).toEqual({ id: sc.id, q, m: true }); });
      sc.negatives.forEach((q) => expect({ id: sc.id, q, m: !!sc.match(analyzeText(q), { nlu: analyzeText(q) }) }).toEqual({ id: sc.id, q, m: false }));
    });
  });
  test('объём каталога', () => {
    const n = SCENARIOS.length; const v = SCENARIOS.reduce((a, s) => a + s.variants.length, 0);
    expect(n).toBeGreaterThanOrEqual(40); expect(v).toBeGreaterThanOrEqual(110);
  });
});

describe('погода', () => {
  test('W1–2: используется существующая интеграция, второго клиента нет', () => {
    const root = path.join(__dirname, '..', 'lib');
    const hits = [];
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f); else if (f.endsWith('.js') && /https?:\/\/[a-z.-]*open-meteo/i.test(fs.readFileSync(f, 'utf8'))) hits.push(path.basename(f));
    });
    walk(root);
    expect(hits).toEqual(['weather.js']);
    expect(fs.readFileSync(path.join(root, 'weather.js'), 'utf8')).toMatch(/const TTL = (\d+) \* 60000/);
    expect(Number(fs.readFileSync(path.join(root, 'weather.js'), 'utf8').match(/const TTL = (\d+) \* 60000/)[1]) * 60000).toBe(WEATHER_TTL);
  });
  test('W4: свежая погода называется «по последним данным»', () => {
    setCoachWeather(WX('rain', 8));
    const r = reply('Какая сейчас погода?', RESULT, {});
    expect(j(r)).toMatch(/По последним данным.*Москва.*дождь.*\+8°/); expect(j(r)).toMatch(/Обновлено 1 минуту назад/);
  });
  test('W5: устаревшая и сохранённая никогда не текущая', () => {
    [WX('rain', 8, { at: Date.now() - 3 * 3600000 }), WX('rain', 8, { stale: true })].forEach((w) => {
      setCoachWeather(w);
      const r = reply('Какая сейчас погода?', RESULT, {});
      expect(j(r)).toMatch(/Свежих данных о погоде у меня нет/); expect(j(r)).toMatch(/Последнее сохранённое/); expect(j(r)).not.toMatch(/По последним данным/);
      const t = reply('Идти бегать на улице? Как там погода?', RESULT, {});
      expect(j(t)).toMatch(/не знаю|не вижу/); expect(j(t)).not.toMatch(/последним данным/);
    });
    expect(weatherState({ kind: 'rain', temp: 1, at: Date.now() + 3600000 }).status).toBe('stale');
  });
  test('W6: погода другого места не используется как местная', () => {
    setCoachWeather(WX('rain', 8, { place: 'Москва' }));
    expect(j(reply('Какая погода в Париже?', RESULT, {}))).toMatch(/другом месте/);
    expect(j(reply('Какая погода в Москве?', RESULT, {}))).toMatch(/дождь/);
  });
  test('W7: текущие условия — не прогноз', () => {
    setCoachWeather(WX('clear', 18));
    const r = reply('Какая погода будет завтра вечером?', RESULT, {});
    expect(j(r)).toMatch(/Прогноза у меня нет/); expect(j(r)).toMatch(/не прогноз/);
    expect(j(reply('Какой ветер сегодня?', RESULT, {}))).toMatch(/Ветер.*не получает/);
  });
  test('W8: дождь не отменяет занятие в помещении, гроза — только улицу', () => {
    setCoachWeather(WX('rain', 8));
    const r = reply('Что за окном? Пойду в зал, тренироваться?', RESULT, {});
    expect(j(r)).toMatch(/не повод отменять/); expect(j(r)).not.toMatch(/перенес/);
    setCoachWeather(WX('storm', 18));
    expect(j(reply('Хочу пробежаться', RESULT, {}))).toMatch(/перенести/);
    expect(j(reply('Что за окном? Я в зале, тренироваться?', RESULT, {}))).toMatch(/В помещении заниматься можно/);
    expect(j(reply('Я в зале, тренироваться?', RESULT, {}))).not.toMatch(/гроз/); // погода не влияет — не упоминаем
  });
  test('W9: вопрос о месте — только при нужде и не дважды', () => {
    setCoachWeather(WX('rain', 8));
    expect(j(reply('Тренироваться сегодня? Что там за окном?', RESULT, {}))).toMatch(/улицу или зал/);
    expect(j(reply('Хочу пробежаться, что за окном?', RESULT, {}))).not.toMatch(/\?/);
    expect(j(reply('Тренироваться дома? Что за окном?', RESULT, {}))).not.toMatch(/улицу или зал/);
  });
  test('W10: отказ от геолокации не ломает коуча', () => {
    expect(j(reply('Я не дал геолокацию, что с погодой?', RESULT, {}))).toMatch(/Без геолокации|Отказ от геолокации/);
    expect(reply('Привет', RESULT, {}).text.length).toBeGreaterThan(0);
    expect(j(reply('Какая погода?', RESULT, {}))).toMatch(/Местной погоды у меня сейчас нет/);
  });
  test('W12: в чувствительном нет погодной шутки', () => {
    setCoachWeather(WX('rain', 8));
    const r = reply('Болит колено, на улице дождь, идти бегать?', RESULT, {}, { tone: 'playful' });
    expect(r.topic).toBe('safety'); expect(r.humorId).toBeNull(); expect(j(r)).not.toMatch(/спецэффект/);
  });
  test('W13: хорошая погода не перекрывает ограничения', () => {
    setCoachWeather(WX('clear', 20));
    const r = reply('Тренироваться сегодня? Погода хорошая', TIRED, {});
    expect(j(r)).toMatch(/не отменяет|Сегодня — нет/); expect(j(r)).not.toMatch(/отличный день/);
    const w = reply('Как там погода для прогулки?', TIRED, {});
    expect(j(w)).toMatch(/спокойной и недолгой/);
  });
  test('шутка про спецэффекты — только когда спрашиваем место, в обычной погоде', () => {
    const r = reply('На улице дождь. Тренироваться сегодня?', RESULT, {}, { tone: 'playful' });
    expect(r.text).toContain('Погода решила добавить спецэффектов.'); expect(r.humorId).toBe('jab_spetseffekty');
    const s = reply('На улице гроза. Пойти на пробежку?', RESULT, {}, { tone: 'playful' });
    expect(s.text[0]).not.toMatch(/Можно, а зачем/); expect(s.text[0]).toMatch(/перенести/);
  });
});
