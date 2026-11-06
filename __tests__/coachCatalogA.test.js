// Каталог коуча, группы 1–4: приветствие, план на сегодня, решение о тренировке, мотивация/сопротивление.
// Проверяем распознавание (позитивы, негативы, отрицания, разговорные формы, пересечения), продолжения,
// неповторяемость, отсутствие повторных вопросов об известном, мусор в тексте и согласованность рекомендаций.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));

import { setLang } from '../lib/i18n';
import { reply, setCoachWeather } from '../lib/coachBrain';
import { analyzeText } from '../lib/coach/nlu';
import { emptyMemory, advance } from '../lib/coach/memory';
import { SCENARIOS, BY_ID, checkCatalog } from '../lib/coach/scenarios';
import { GREETING } from '../lib/coach/scenarios/greeting';
import { PLAN } from '../lib/coach/scenarios/plan';
import { DECISION } from '../lib/coach/scenarios/trainDecision';
import { MOTIVATION } from '../lib/coach/scenarios/motivation';
import { visitKind } from '../lib/coach/scenarios/lexA';
import { assemble, validate, variantApplies } from '../lib/coach/assemble';
import { buildVars } from '../lib/coach/vars';

const MINE = [...GREETING, ...PLAN, ...DECISION, ...MOTIVATION];
const MINE_IDS = new Set(MINE.map((s) => s.id));
const CYR = /[А-Яа-яЁё]/;

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const withReadiness = (score) => ({
  chrono: 40, bio: 38, pace: 0.9,
  scores: {
    sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 },
    readiness: score == null ? { status: 'insufficient' } : { status: 'ok', score },
    recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' },
  },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
});
const FRESH = withReadiness(75); // state: fresh
const NORMAL = withReadiness(55); // state: normal
const TIRED = withReadiness(30); // state: tired
const UNKNOWN = withReadiness(null); // state: unknown (нет данных о готовности)

const T0 = new Date(2026, 10, 1, 10, 0, 0).getTime();
const DAY = 864e5;

beforeAll(() => { jest.useFakeTimers({ now: T0 }); });
afterAll(() => { jest.useRealTimers(); });
beforeEach(() => { setLang('ru'); jest.setSystemTime(T0); });
afterEach(() => { setLang('auto'); setCoachWeather(null); });

// Диалог: каждый ход получает память и историю прошлых ходов. -> массив ответов с lastScenario/lastVariant.
function chat(turns, o = {}) {
  let session = o.memory ? { memory: o.memory } : {};
  const history = o.history ? o.history.slice() : [];
  const out = [];
  for (const q of turns) {
    const r = reply(q, o.result === undefined ? FRESH : o.result, o.profile || {}, { history: history.slice(), session, tone: o.tone, now: Date.now() });
    session = r.session;
    history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId });
    jest.setSystemTime(Date.now() + 5000);
    out.push({ ...r, id: r.session.memory.lastScenario, variant: r.session.memory.lastVariant, mem: r.session.memory, q });
  }
  return out;
}
const one = (q, o) => chat([q], o)[0];
const j = (r) => r.text.join('\n');
const warm = () => advance(emptyMemory(), { now: T0 - 10 * 60000, topic: 'train' }); // говорили 10 минут назад
const ago = (days) => advance(emptyMemory(), { now: T0 - days * DAY, topic: 'train' });

describe('целостность каталога групп 1–4', () => {
  test('checkCatalog пуст, id уникальны во всём каталоге', () => {
    expect(checkCatalog(MINE, [])).toEqual([]);
    expect(checkCatalog(SCENARIOS, [])).toEqual([]);
    MINE.forEach((s) => expect(BY_ID[s.id]).toBe(s));
  });
  test('объём: у каждого ≥4 вариантов, у приветствия/плана дня/мотивации 8–12, есть вариант без юмора', () => {
    MINE.forEach((s) => {
      expect({ id: s.id, n: s.variants.length >= 4 }).toEqual({ id: s.id, n: true });
      expect({ id: s.id, noHumor: s.variants.some((v) => v.humorOk === false) || !s.humor }).toEqual({ id: s.id, noHumor: true });
    });
    ['greet_hello', 'plan_today', 'mot_lazy', 'mot_no_want'].forEach((id) => {
      expect(BY_ID[id].variants.length).toBeGreaterThanOrEqual(8);
      expect(BY_ID[id].variants.length).toBeLessThanOrEqual(16);
    });
    const greetTotal = GREETING.reduce((a, s) => a + s.variants.length, 0);
    expect(greetTotal).toBeGreaterThanOrEqual(8);
    expect(MINE.reduce((a, s) => a + s.variants.length, 0)).toBeGreaterThanOrEqual(100);
  });
  test('вариант не повторяет сам себя: основные блоки разных вариантов одного сценария различаются', () => {
    MINE.forEach((s) => {
      const heads = s.variants.map((v) => JSON.stringify(v.text || v.blocks));
      expect(new Set(heads).size).toBe(heads.length);
    });
  });
  test('все варианты собираются без мусора (RU и EN, полный и пустой набор переменных)', () => {
    const mkVars = (ru, full) => {
      const v = buildVars(full ? { steps7: 8000, steps30: 7500, stepGoal: 8000, sleepH: 7.5, sleepNorm: 7.5, sleep7: 6.5, readiness: 75, rhr7: 60, active7: 200, workouts7: 3 } : {}, { status: 'none' }, full ? { place: 'gym', activity: 'run' } : {}, {}, ru);
      ['baseTrain', 'askPlace', 'askActivity'].forEach((n) => { v[n] = { name: n, value: ru ? 'Лучше спокойное кардио 30–45 минут.' : 'Best: easy cardio for 30–45 minutes.', kind: 'text', available: full || n === 'baseTrain' }; });
      return v;
    };
    for (const ru of [true, false]) for (const full of [true, false]) {
      const vars = mkVars(ru, full);
      MINE.forEach((s) => s.variants.forEach((v) => {
        if (!variantApplies(v, vars, ru)) return;
        const p = assemble(v, { ru, vars }).paras;
        expect({ id: v.id, ru, full, ok: validate(p).ok }).toEqual({ id: v.id, ru, full, ok: true });
        if (!ru) expect(p.join(' ')).not.toMatch(CYR);
      }));
    }
  });
  test('нет «выдуманных» чисел: без готовности в данных в ответе нет /100', () => {
    ['Что мне делать сегодня?', 'Тренироваться сегодня?', 'Мне лень', 'Не хочу тренироваться', 'Привет', 'Хочу минимум', 'Выполнять план сегодня?'].forEach((q) => {
      for (const res of [UNKNOWN, null, {}]) {
        const rs = chat([q, q, q, q, q, q, q, q], { result: res });
        rs.forEach((r) => { expect(j(r)).not.toMatch(/\/100|NaN|undefined|null/); });
      }
    });
  });
});

describe('вид визита: приветствие', () => {
  const env = (mem, history, now) => ({ mem, history: history || [], now });
  test('первый контакт: нет памяти и нет сообщений пользователя', () => {
    expect(visitKind(env(emptyMemory(), [], T0))).toBe('first');
    expect(visitKind(env(emptyMemory(), [{ from: 'coach', text: ['Я Хирон'] }], T0))).toBe('first');
  });
  test('в тот же день, вчера, после перерыва — только по известному времени', () => {
    expect(visitKind(env(warm(), [], T0))).toBe('same');
    expect(visitKind(env(ago(1), [], T0))).toBe('regular');
    expect(visitKind(env(ago(2), [], T0))).toBe('regular');
    expect(visitKind(env(ago(3), [], T0))).toBe('break');
    expect(visitKind(env(ago(20), [], T0))).toBe('break');
  });
  test('время прошлого разговора неизвестно -> «давно не виделись» не говорим', () => {
    const noTime = { ...emptyMemory(), turn: 7, lastAt: null };
    const junk = { ...emptyMemory(), turn: 7, lastAt: 1 };
    expect(visitKind(env(noTime, [], T0))).toBe('regular');
    expect(visitKind(env(junk, [], T0))).toBe('regular');
    expect(one('Привет', { memory: noTime }).id).toBe('greet_hello');
    expect(one('Привет', { memory: junk }).id).toBe('greet_hello');
  });
  test('сценарии приветствия выбираются по виду визита', () => {
    expect(one('Привет').id).toBe('greet_first');
    expect(one('Привет', { memory: warm() }).id).toBe('greet_same_day');
    expect(one('Привет', { memory: ago(1) }).id).toBe('greet_hello');
    expect(one('Привет', { memory: ago(10) }).id).toBe('greet_break');
    const r = chat(['Привет', 'Привет']);
    expect(r[0].id).toBe('greet_first');
    expect(r[1].id).toBe('greet_same_day');
  });
  test('после перерыва нет вины и счёта пропущенных дней', () => {
    const rs = chat(['Привет', 'Привет', 'Привет', 'Привет'].slice(0, 1), { memory: ago(30) });
    expect(j(rs[0])).not.toMatch(/\d+ (дн|мес)|пропустил|должен|виноват/i);
    BY_ID.greet_break.variants.forEach((v) => expect(JSON.stringify(v)).not.toMatch(/\d+ (дн|мес)|должен|виноват/));
  });
  test('«как дела» — отвечаем и возвращаем вопрос человеку; на первом контакте — представление', () => {
    expect(one('Как дела?').id).toBe('greet_first');
    expect(one('Как дела?', { memory: warm() }).id).toBe('greet_howdo');
    expect(one('привет, как дела', { memory: ago(1) }).id).toBe('greet_howdo');
  });
  test('сообщение без запроса', () => {
    ['Есть минутка?', 'можно вопрос', 'у меня вопрос', 'я тут', 'Можно спросить?', 'got a minute', 'can I ask something'].forEach((q) => {
      expect({ q, id: one(q, { memory: ago(1) }).id }).toEqual({ q, id: 'greet_open' });
    });
    ['можно вопрос по сну', 'вопрос про шаги', 'можно ли тренироваться сегодня'].forEach((q) => {
      expect({ q, id: one(q, { memory: ago(1) }).id === 'greet_open' }).toEqual({ q, id: false });
    });
  });
  test('приветствие с вопросом по теме — ответ по теме, не приветствие', () => {
    ['Привет, как сон?', 'Привет, что с пульсом?', 'hi, how is my sleep'].forEach((q) => {
      const r = one(q, { memory: ago(1) });
      expect({ q, greet: /^greet_/.test(r.id || '') }).toEqual({ q, greet: false });
    });
    expect(one('Привет, что делать сегодня?', { memory: ago(1) }).id).toBe('plan_today');
  });
  test('время суток подбирается по часам, без противоречий', () => {
    const asks = (hour) => {
      jest.setSystemTime(new Date(2026, 10, 1, hour, 0, 0).getTime());
      return chat(Array(9).fill('Здравствуйте'), { memory: ago(1), result: FRESH }).map(j).join('\n');
    };
    const morning = asks(9);
    const evening = asks(21);
    expect(morning).not.toMatch(/Добрый вечер|Good evening/);
    expect(evening).not.toMatch(/Доброе утро|Good morning/);
  });
});

describe('распознавание: позитивы, негативы, отрицания, разговорные формы', () => {
  const ID = (q, o) => one(q, o).id;
  test.each([
    ['Что мне делать сегодня?', 'plan_today'],
    ['что делать', 'plan_today'],
    ['составь мне план на день', 'plan_today'],
    ['С чего начать?', 'plan_start'],
    ['где начать', 'plan_start'],
    ['Дай простой план на сегодня', 'plan_simple'],
    ['план попроще', 'plan_simple'],
    ['Мало времени, что можно успеть?', 'plan_short_time'],
    ['у меня всего 15 минут, что делать', 'plan_short_time'],
    ['Слишком много дел, что делать?', 'plan_too_many'],
    ['столько задач, не успеваю', 'plan_too_many'],
    ['Дай один шаг', 'plan_one_step'],
    ['какой первый шаг?', 'plan_one_step'],
    ['Тренироваться сегодня?', 'train_today'],
    ['стоит ли сегодня тренироваться', 'train_today'],
    ['идти ли в зал', 'train_today'],
    ['Выполнять план сегодня?', 'train_follow_plan'],
    ['надо ли идти по плану', 'train_follow_plan'],
    ['Облегчи тренировку', 'train_lighten'],
    ['хочу полегче сегодня на тренировке', 'train_lighten'],
    ['Чем заменить тренировку?', 'train_alternative'],
    ['что можно вместо бега', 'train_alternative'],
    ['Не хочу сегодня тренироваться', 'mot_no_want'],
    ['не хочу идти в зал', 'mot_no_want'],
    ['Мне лень', 'mot_lazy'],
    ['неохота сегодня', 'mot_lazy'],
    ['Мне трудно начать', 'mot_hard_start'],
    ['никак не раскачаться', 'mot_hard_start'],
    ['Боюсь снова бросить', 'mot_fear_quit'],
    ['я всегда бросаю', 'mot_fear_quit'],
    ['Хочу минимум на сегодня', 'mot_minimum'],
    ['хоть что-нибудь сделать', 'mot_minimum'],
    ['Начал, хочу закончить', 'mot_finish'],
    ['хочу довести до конца', 'mot_finish'],
    ['Только без мотивационных речей', 'mot_no_speeches'],
    ['не мотивируй меня', 'mot_no_speeches'],
  ])('%s -> %s', (q, id) => { expect(ID(q, { memory: ago(1) })).toBe(id); });

  test('хочу / не хочу / можно / нельзя / вчера / почему советуешь', () => {
    const o = { memory: ago(1) };
    expect(ID('хочу тренироваться', o)).toBe('train_today');
    expect(ID('не хочу тренироваться', o)).toBe('mot_no_want');
    expect(ID('мне нельзя тренироваться?', o)).toBe('train_forbidden_q');
    expect(ID('можно ли потренироваться', o)).toBe('train_today');
    ['вчера хотел тренироваться', 'вчера не хотел тренироваться', 'вчера мне было лень', 'раньше всегда было трудно начать тренироваться'].forEach((q) => {
      const r = one(q, o);
      expect({ q, mine: MINE_IDS.has(r.id) }).toEqual({ q, mine: false });
    });
    const why = chat(['Тренироваться сегодня?', 'почему ты советуешь тренироваться?']);
    expect(why[1].id).toBe('train_today'); // не новый ответ: объяснение последней рекомендации
    expect(j(why[1])).toMatch(/Готовность сегодня 75\/100/);
  });
  test('«нельзя»: не выдаём запретов и не диагностируем, даём рекомендацию на сегодня', () => {
    const rs = chat(Array(5).fill('Мне нельзя тренироваться?'), { result: TIRED });
    rs.forEach((r) => {
      expect(j(r)).toMatch(/Сегодня — нет|без тяжёлой|не диагностир|врач|рекомендаци/i);
      expect(j(r)).not.toMatch(/нельзя вам|(?<!не )запрещаю|у вас (болезнь|диагноз)/i);
    });
  });
  test('разговорные формы и опечатки', () => {
    const o = { memory: ago(1) };
    expect(ID('тренероваться сегодня?', o)).toBe('train_today');
    expect(ID('сегодня тренироваться?', o)).toBe('train_today');
    expect(ID('шо делать сегодня', o)).toBe('plan_today');
    expect(ID('приветик', o)).toBe('greet_hello');
    expect(ID('Здрасьте', o)).toBe('greet_hello');
    expect(ID('хачу тренироваться', o)).toBe('train_today');
    expect(ID('не хачу тренироваться', o)).toBe('mot_no_want');
    expect(ID('мне лееень', o)).toBe('mot_lazy');
    expect(ID('ЛЕНЬ!!!', o)).toBe('mot_lazy');
    expect(ID('мне чето лень идти бегать', o)).toBe('mot_lazy');
  });
  test('пересечения с прежними сценариями и друг с другом', () => {
    const o = { memory: ago(1) };
    expect(ID('Не хочу бегать, предложи что-то дома', o)).toBe('train_alt_place');
    expect(ID('без бега, что можно в зале?', o)).toBe('train_alt_place');
    expect(ID('Не хочу сегодня ничего сложного', o)).toBe('mot_nothing_hard');
    expect(ID('мало времени, что делать', o)).toBe('plan_short_time');
    expect(ID('слишком много дел, с чего начать', o)).toBe('plan_too_many');
    expect(ID('Передумал тренироваться', o)).not.toBe('train_today');
    expect(ID('Передумал, не хочу тренироваться', o)).not.toBe('mot_no_want');
    expect(one('Мне лень идти бегать', o).mem.lastTopic).toBe('procrastination');
    expect(ID('Составил план: бег, силовая, растяжка и ещё вечером велосипед', o)).not.toBe('plan_today');
  });
  test('чувствительное остаётся приоритетным', () => {
    const o = { memory: ago(1) };
    ['Мне лень, болит колено', 'Хочу тренироваться, а в груди давит', 'боюсь снова бросить, мне очень плохо', 'Мне нельзя тренироваться, у меня травма'].forEach((q) => {
      const r = one(q, o);
      expect({ q, mine: MINE_IDS.has(r.id) }).toEqual({ q, mine: false });
    });
  });
  test('английские формулировки', () => {
    setLang('en');
    const o = { memory: ago(1) };
    expect(ID('Should I train today?', o)).toBe('train_today');
    expect(ID('I do not want to work out', o)).toBe('mot_no_want');
    expect(ID('I can\'t be bothered', o)).toBe('mot_lazy');
    expect(ID('What should I do today?', o)).toBe('plan_today');
    expect(ID('Where should I start?', o)).toBe('plan_start');
    expect(ID('one small step', o)).toBe('plan_one_step');
    expect(ID('I always quit', o)).toBe('mot_fear_quit');
    expect(ID('just the facts', o)).toBe('mot_no_speeches');
    expect(ID('Hello', o)).toBe('greet_hello');
    expect(ID('what can I do instead of a workout', o)).toBe('train_alternative');
    expect(ID('make the workout lighter', o)).toBe('train_lighten');
    expect(ID('yesterday I wanted to work out', o) && MINE_IDS.has(ID('yesterday I wanted to work out', o))).toBe(false);
  });
});

describe('склейка с общим конвейером: продолжения', () => {
  test('«почему?» после решения о тренировке и плане дня объясняет по данным', () => {
    const [, why] = chat(['Тренироваться сегодня?', 'Почему?']);
    expect(j(why)).toMatch(/Готовность сегодня 75\/100/);
    const [, whyPlan] = chat(['Что мне делать сегодня?', 'а почему']);
    expect(j(whyPlan)).toMatch(/Готовность сегодня 75\/100/);
    const [, whyTired] = chat(['Тренироваться сегодня?', 'Почему?'], { result: TIRED });
    expect(j(whyTired)).toMatch(/Причины|Готовность/);
  });
  test('«почему» без данных не выдумывает число', () => {
    const [, why] = chat(['Тренироваться сегодня?', 'почему'], { result: UNKNOWN });
    expect(j(why)).not.toMatch(/\/100/);
  });
  test('«попроще» упрощает план дня, а «другой вариант» даёт другой вариант того же сценария с той же рекомендацией', () => {
    const [, simp] = chat(['Что мне делать сегодня?', 'А попроще?']);
    expect(j(simp)).toMatch(/прогулк/i);
    const [a, b] = chat(['Тренироваться сегодня?', 'Другой вариант']);
    expect(b.mem.lastScenario).toBe('train_today');
    expect(b.variant === a.variant).toBe(false);
    expect(j(b)).toMatch(/Да!|подойдёт/i); // fresh: рекомендация та же (интервальная/силовая)
  });
  test('«ты это уже говорил» признаёт повтор и не повторяет вариант', () => {
    const rs = chat(['Мне лень', 'Ты это уже говорил']);
    expect(rs[1].text.length).toBeGreaterThan(1);
    expect(rs[1].text.join(' ')).not.toBe(rs[0].text.join(' '));
  });
  test('«облегчи» -> уточнение «что облегчить» -> ответ уводит в существующий сценарий упрощения', () => {
    const rs = chat(Array(4).fill('Облегчи тренировку'));
    expect(rs[3].mem.pending && rs[3].mem.pending.key).toBe('simplify_what');
    const next = chat(['Облегчи тренировку', 'Облегчи тренировку', 'Облегчи тренировку', 'Облегчи тренировку', 'тренировку']);
    expect(next[4].id).toBe('mot_simplify_workout');
  });
  test('ответ на «где удобнее» запоминается и вопрос не повторяется', () => {
    const rs = chat(['Чем заменить тренировку?', 'Чем заменить тренировку?', 'в зале', 'Чем заменить тренировку?'], { result: TIRED });
    expect(rs[1].mem.pending && rs[1].mem.pending.key).toBe('place');
    expect(j(rs[2])).toMatch(/В зале/);
    expect(j(rs[2])).not.toMatch(/Где удобнее/);
    expect(j(rs[3])).not.toMatch(/Где удобнее/);
  });
  test('смена темы сбрасывает ожидаемое уточнение', () => {
    const rs = chat(['Чем заменить тренировку?', 'Чем заменить тренировку?', 'как улучшить сон', 'в зале'], { result: TIRED });
    expect(rs[2].id === 'train_alternative').toBe(false);
    expect(rs[3].mem.pending).toBeNull();
  });
  test('короче: в ответе остаётся главное', () => {
    const rs = chat(['короче', 'Что мне делать сегодня?'], { result: TIRED });
    expect(rs[1].text.length).toBeLessThanOrEqual(2);
  });
  test('без шуток: после просьбы юмор не появляется ни в одном из сценариев групп', () => {
    const qs = ['Мне лень', 'Хочу минимум', 'Дай простой план', 'Слишком много дел', 'Трудно начать', 'Мало времени, что делать?'];
    const rs = chat(['Без шуток', ...qs], { tone: 'playful' });
    rs.slice(1).forEach((r) => expect(r.humorId).toBeNull());
  });
});

describe('неповторяемость', () => {
  const QS = [
    'Что мне делать сегодня?', 'С чего начать?', 'Дай простой план', 'Мало времени, что можно успеть?', 'Слишком много дел, что делать?', 'Дай один шаг',
    'Тренироваться сегодня?', 'Выполнять план сегодня?', 'Облегчи тренировку', 'Чем заменить тренировку?', 'Мне нельзя тренироваться?',
    'Мне лень', 'Не хочу тренироваться', 'Мне трудно начать', 'Боюсь снова бросить', 'Хочу минимум', 'Начал, хочу закончить', 'Только без мотивационных речей',
  ];
  test.each(QS)('один и тот же вопрос 4 раза даёт разные варианты: %s', (q) => {
    for (const result of [FRESH, TIRED, UNKNOWN]) {
      const rs = chat([q, q, q, q], { result, memory: ago(1) });
      const ids = rs.map((r) => r.variant);
      expect({ q, same: new Set(ids).size }).toEqual({ q, same: 4 });
      expect(new Set(rs.map((r) => r.id)).size).toBe(1); // сценарий тот же, меняется подача
    }
  });
  test('разные варианты не противоречат: при одних фактах рекомендация одна', () => {
    // усталый день: никакой интенсивной нагрузки ни в одном варианте
    const FRESH_ONLY = /Да! |интервал|рабочими весами|можно нагружаться|для нагрузки|идти по плану|позволяет/i;
    // свежий/обычный день: усталых формулировок нет
    const TIRED_ONLY = /Сегодня — нет|бережн|без тяжёлой тренировки|восстановление (сегодня )?(не лучшее|невысокое)|лечь на 30–45 минут раньше|просит бережного|лучше дать себе восстановиться|организм и сам просит/i;
    for (const q of QS) {
      const tired = chat(Array(12).fill(q), { result: TIRED, memory: ago(1) }).map(j).join('\n');
      expect({ q, hard: FRESH_ONLY.test(tired) }).toEqual({ q, hard: false });
      for (const res of [FRESH, NORMAL]) {
        const ok = chat(Array(12).fill(q), { result: res, memory: ago(1) }).map(j).join('\n');
        expect({ q, tiredWords: TIRED_ONLY.test(ok) }).toEqual({ q, tiredWords: false });
      }
    }
  });
  test('приветствие: 4 подряд — разные варианты (сценарий может меняться, текст — нет)', () => {
    const rs = chat(['Привет', 'Привет', 'Привет', 'Привет']);
    expect(new Set(rs.map((r) => r.variant)).size).toBe(4);
    expect(new Set(rs.map((r) => j(r))).size).toBe(4);
  });
  test('одна шутка максимум и юмор не в серьёзных сценариях', () => {
    for (const q of ['Боюсь снова бросить', 'Только без мотивационных речей', 'Привет', 'Мне нельзя тренироваться?', 'Тренироваться сегодня?']) {
      const rs = chat(Array(6).fill(q), { tone: 'playful', memory: ago(1) });
      rs.forEach((r) => expect({ q, h: r.humorId }).toEqual({ q, h: null }));
    }
    const lazy = chat(['Мне лень идти бегать'], { tone: 'playful', result: NORMAL })[0];
    expect(lazy.text.filter((p) => /Кроссовки готовы/.test(p)).length).toBeLessThanOrEqual(1);
    expect(validate(lazy.text, { jokeCount: lazy.humorId ? 1 : 0 }).ok).toBe(true);
  });
});

describe('известные параметры не спрашиваем повторно', () => {
  const ASKS = /дома, в зале или на улице|Где (было бы приятнее|будешь|планируешь|удобнее)|Что (стоит в плане|хотел|собираешься делать)|Бег, силовая, прогулка/;
  test('место названо в сообщении', () => {
    for (const q of ['Тренироваться дома сегодня?', 'Чем заменить тренировку дома?', 'не хочу тренироваться в зале']) {
      for (const res of [FRESH, TIRED, UNKNOWN]) {
        const rs = chat(Array(8).fill(q), { result: res, memory: ago(1) });
        rs.forEach((r) => expect({ q, ask: ASKS.test(j(r)) && /дома, в зале или на улице|Где/.test(j(r)) }).toEqual({ q, ask: false }));
      }
    }
  });
  test('вид занятия назван в сообщении', () => {
    for (const q of ['Выполнять план сегодня? Планировался бег', 'Мне трудно начать пробежку', 'тренироваться сегодня, хочу силовую']) {
      for (const res of [FRESH, UNKNOWN]) {
        const rs = chat(Array(8).fill(q), { result: res, memory: ago(1) });
        rs.forEach((r) => expect({ q, ask: /Что (стоит в плане|хотел|собираешься делать)|Бег, силовая, прогулка/.test(j(r)) }).toEqual({ q, ask: false }));
      }
    }
  });
  test('место и занятие, названные раньше в диалоге, помнятся несколько ходов', () => {
    const rs = chat(['Тренироваться дома? Хочу растяжку', 'Тренироваться сегодня?', 'Тренироваться сегодня?', 'Тренироваться сегодня?'], { result: UNKNOWN, memory: ago(1) });
    rs.slice(1).forEach((r) => expect(j(r)).not.toMatch(/дома, в зале или на улице|Что (хотел|собираешься делать)/));
  });
  test('вопрос о месте задаётся только когда оно неизвестно и сценарий действительно его спрашивает', () => {
    const asked = chat(Array(6).fill('Тренироваться сегодня?'), { result: FRESH, memory: ago(1) }).filter((r) => /дома, в зале или на улице/.test(j(r)));
    expect(asked.length).toBeLessThanOrEqual(1);
    asked.forEach((r) => expect(r.mem.pending && r.mem.pending.key).toBe('place'));
  });
});

describe('«важные условия неизвестны» и отсутствие данных', () => {
  test('без данных о готовности: честное «оценить не могу», не «норма»', () => {
    const rs = chat(Array(6).fill('Тренироваться сегодня?'), { result: UNKNOWN, memory: ago(1) });
    rs.forEach((r) => { expect(r.id).toBe('train_unknown'); expect(j(r)).not.toMatch(/в норме|всё хорошо|готовность высок/i); });
    expect(rs.map(j).join(' ')).toMatch(/не могу|нет данных|данных/i);
  });
  test('готовность не выводится из одних шагов', () => {
    const stepsOnly = { chrono: 40, bio: 38, pace: 0.9, scores: {}, metrics: { steps: win(14000) } };
    const rs = chat(Array(6).fill('Тренироваться сегодня?'), { result: stepsOnly, memory: ago(1) });
    rs.forEach((r) => { expect(r.id).toBe('train_unknown'); expect(j(r)).not.toMatch(/\/100|высок|отлично восстановил/i); });
  });
  test('нет результата вообще (null): ответ осмысленный и без мусора', () => {
    for (const q of ['Привет', 'Что мне делать сегодня?', 'Мне лень', 'Тренироваться сегодня?', 'Не хочу тренироваться', 'С чего начать?']) {
      const r = one(q, { result: null, memory: ago(1) });
      expect(validate(r.text).ok).toBe(true);
      expect(r.text.length).toBeGreaterThan(0);
    }
  });
});

describe('английские ответы: без кириллицы и мусора', () => {
  test('ответы по всем сценариям групп 1–4', () => {
    setLang('en');
    const qs = ['Hello', 'Should I train today?', 'What should I do today?', 'Where should I start?', 'one small step', 'I can\'t be bothered', 'I do not want to work out',
      'hard to get started', 'I always quit', 'the bare minimum', 'I started and want to finish', 'just the facts', 'follow the plan today?', 'make the workout lighter',
      'what can I do instead of a workout', 'am I allowed to train', 'too many tasks today', 'short on time, what can I do', 'simple plan please', 'got a minute'];
    for (const res of [FRESH, TIRED, UNKNOWN]) {
      for (const q of qs) {
        const rs = chat([q, q, q, q, q], { result: res, memory: ago(1) });
        rs.forEach((r) => { expect(CYR.test(j(r))).toBe(false); expect(validate(r.text).ok).toBe(true); });
      }
    }
  });
});

describe('вычисления и текст не смешаны, сети нет', () => {
  test('файлы групп 1–4 не содержат сетевых вызовов', () => {
    const fs = require('fs');
    const path = require('path');
    ['greeting', 'plan', 'trainDecision', 'motivation', 'lexA', 'training'].forEach((f) => {
      const src = fs.readFileSync(path.join(__dirname, '../lib/coach/scenarios', f + '.js'), 'utf8');
      expect({ f, net: /fetch\(|XMLHttpRequest|axios|WebSocket|openai|anthropic/i.test(src) }).toEqual({ f, net: false });
    });
  });
  test('сценарии с контекстным применением объявляют phrase/applies/blocked, positives доступны без памяти', () => {
    MINE.forEach((s) => {
      expect(typeof s.match).toBe('function');
      expect(Array.isArray(s.positives)).toBe(true);
      expect(Array.isArray(s.negatives)).toBe(true);
    });
    // позитивы без контекста памяти и состояния дня должны срабатывать у каждого сценария, где они заданы
    MINE.filter((s) => s.positives.length).forEach((s) => s.positives.forEach((q) => {
      const n = analyzeText(q);
      expect({ id: s.id, q, m: !!s.match(n, { nlu: n }) }).toEqual({ id: s.id, q, m: true });
    }));
    MINE.forEach((s) => s.negatives.forEach((q) => {
      const n = analyzeText(q);
      expect({ id: s.id, q, m: !!s.match(n, { nlu: n }) }).toEqual({ id: s.id, q, m: false });
    }));
  });
  test('контекстные сценарии проверяются с контекстом', () => {
    [['greet_break', ago(10)], ['greet_same_day', warm()]].forEach(([id, mem]) => {
      (BY_ID[id].phrasings || []).forEach((q) => {
        const n = analyzeText(q);
        expect({ id, q, m: !!BY_ID[id].match(n, { nlu: n, mem, history: [], now: T0 }) }).toEqual({ id, q, m: true });
      });
      (BY_ID[id].notFor || []).forEach((q) => {
        const n = analyzeText(q);
        expect({ id, q, m: !!BY_ID[id].match(n, { nlu: n, mem, history: [], now: T0 }) }).toEqual({ id, q, m: false });
      });
    });
    (BY_ID.train_unknown.phrasings || []).forEach((q) => {
      const n = analyzeText(q);
      expect({ q, m: !!BY_ID.train_unknown.match(n, { nlu: n, s: { state: 'unknown' } }) }).toEqual({ q, m: true });
      expect({ q, m: !!BY_ID.train_unknown.match(n, { nlu: n, s: { state: 'fresh' } }) }).toEqual({ q, m: false });
    });
    (BY_ID.train_unknown.notFor || []).forEach((q) => {
      const n = analyzeText(q);
      expect({ q, m: !!BY_ID.train_unknown.match(n, { nlu: n, s: { state: 'unknown' } }) }).toEqual({ q, m: false });
    });
  });
});
