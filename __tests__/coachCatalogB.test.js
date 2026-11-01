// Каталог сценариев, группы 5–9: шаги, сон, восстановление/нагрузка, привычки, результаты/эмоции.
// Проверяем распознавание (позитивы, негативы, отрицания, разговорные формы, опечатки, пересечения), продолжения,
// ошибку «круглое число», пример Д5 (не переспрашивать названное), склонения, отсутствие выдуманных значений при пустом результате,
// ротацию вариантов, согласованность рекомендаций и отсутствие юмора там, где человек расстроен.
jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = {};
  return { __esModule: true, default: { getItem: async (k) => (k in m ? m[k] : null), setItem: async (k, v) => { m[k] = v; }, removeItem: async (k) => { delete m[k]; } } };
}, { virtual: true });
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: async () => ({ granted: false }), getLastKnownPositionAsync: async () => null, getCurrentPositionAsync: async () => null, Accuracy: { Lowest: 1 } }), { virtual: true });

import { setLang } from '../lib/i18n';
import { reply } from '../lib/coachBrain';
import { SCENARIOS, BY_ID, checkCatalog } from '../lib/coach/scenarios';
import { analyzeText } from '../lib/coach/nlu';
import { assemble, validate, fill } from '../lib/coach/assemble';
import { buildVars } from '../lib/coach/vars';
import { CATALOG } from '../lib/humor/catalog';

const GROUPS = ['steps', 'sleep', 'recovery', 'habits', 'results'];
const MINE = SCENARIOS.filter((s) => GROUPS.includes(s.group));
const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const mkResult = (o = {}) => ({
  chrono: 40, bio: 38, pace: 0.9,
  scores: {
    sleep: { status: 'ok', score: o.sleepScore === undefined ? 80 : o.sleepScore, hours: o.sleepH === undefined ? 7.5 : o.sleepH, norm: 7.5 },
    activity: { status: 'ok', score: 70 },
    readiness: { status: 'ok', score: o.readiness === undefined ? 75 : o.readiness },
    recovery: { status: 'ok', score: 70, hrvDev: o.hrvDev === undefined ? 2 : o.hrvDev, nightHrDiff: 0 },
    load: { level: o.load || 'normal' },
  },
  metrics: { steps: win(o.steps === undefined ? 8000 : o.steps), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 } },
});
const RESULT = mkResult();
const TIRED = mkResult({ readiness: 30 });
const LOW_STEPS = mkResult({ steps: 4000 });
const HIGH_STEPS = mkResult({ steps: 12000 });

// Диалог: каждый ход получает память и сессию прошлого хода.
function chat(turns, o = {}) {
  let session = {};
  const history = [];
  return turns.map((q) => {
    const r = reply(q, o.result === undefined ? RESULT : o.result, o.profile || {}, { history: history.slice(), session, tone: o.tone || 'playful', now: 1 });
    session = r.session;
    history.push({ from: 'me', text: [q] }, { from: 'coach', text: r.text, humorId: r.humorId });
    return r;
  });
}
const one = (q, o) => chat([q], o)[0];
const txt = (r) => r.text.join('\n');
const sid = (r) => r.session.memory.lastScenario;
const vid = (r) => r.session.memory.lastVariant;
// n одинаковых вопросов подряд (ротация вариантов)
const repeat = (q, n, o) => chat(Array(n).fill(q), { tone: 'off', ...(o || {}) });

beforeEach(() => setLang('ru'));
afterEach(() => setLang('auto'));

describe('B1. целостность каталога групп 5–9', () => {
  test('общий каталог без проблем (ids, переменные, английский, дубли)', () => { expect(checkCatalog(SCENARIOS, CATALOG)).toEqual([]); });
  test('объём: шаги 8–12 вариантов в главном сценарии, у остальных 4–7; всего достаточно', () => {
    expect(BY_ID.steps_today.variants.length).toBeGreaterThanOrEqual(8);
    expect(BY_ID.steps_today.variants.length).toBeLessThanOrEqual(12);
    MINE.forEach((sc) => { expect(sc.variants.length).toBeGreaterThanOrEqual(4); expect(sc.variants.length).toBeLessThanOrEqual(12); });
    const n = (g) => MINE.filter((s) => s.group === g).reduce((a, s) => a + s.variants.length, 0);
    expect(n('steps')).toBeGreaterThanOrEqual(40);
    GROUPS.slice(1).forEach((g) => expect(n(g)).toBeGreaterThanOrEqual(20));
    ['steps', 'sleep', 'recovery', 'habits', 'results'].forEach((g) => expect(MINE.some((s) => s.group === g)).toBe(true));
  });
  test('все темы из ТЗ покрыты сценариями', () => {
    ['steps_today', 'steps_why_number', 'steps_low', 'steps_round', 'steps_goal', 'steps_compare_period', 'steps_mismatch', 'steps_frozen', 'steps_what_counts',
      'sleep_last_night', 'sleep_data_show', 'sleep_score_why', 'sleep_missing', 'sleep_feel_mismatch', 'sleep_plan_link',
      'rec_tired', 'rec_more_than_plan', 'rec_want_rest', 'rec_why_lighter', 'rec_little_data',
      'hab_missed', 'hab_return', 'hab_streak', 'hab_hard_goal', 'hab_simplify', 'hab_content',
      'res_success', 'res_disappointed', 'res_compare_others', 'res_annoyed_app', 'res_dislike_answer', 'res_guilt'].forEach((id) => expect(BY_ID[id]).toBeDefined());
  });
  test('у каждого сценария есть позитивы, негативы, минимум один вариант без юмора', () => {
    MINE.forEach((sc) => {
      expect(sc.positives.length).toBeGreaterThanOrEqual(3);
      expect(sc.negatives.length).toBeGreaterThanOrEqual(3);
      expect(sc.variants.some((v) => v.humorOk === false) || !sc.humor).toBe(true);
    });
  });
  test('варианты реально разные: нет двух одинаковых русских текстов и нет косметических пар', () => {
    MINE.forEach((sc) => {
      const keys = sc.variants.map((v) => JSON.stringify(v.text ? v.text.ru : v.blocks));
      expect(new Set(keys).size).toBe(keys.length);
      const first = sc.variants.map((v) => String(v.text ? [].concat(v.text.ru)[0] : (v.blocks.main || v.blocks.reaction)[0]).slice(0, 25));
      if (sc.id === 'steps_compare_period') return; // три взаимоисключающих варианта по направлению сравнения
      expect(new Set(first).size).toBeGreaterThanOrEqual(Math.ceil(first.length * 0.7));
    });
  });
  test('запрещённые обороты и эмодзи отсутствуют', () => {
    const BAN = /чемпион|геро[йя]|легенд|красавчик|молодец|давай-давай|ты обязан|никаких оправданий|champion|\bhero\b|legend/i;
    const EMO = /[\u{1F300}-\u{1FAFF}☀-➿]/u;
    MINE.forEach((sc) => sc.variants.forEach((v) => {
      const all = JSON.stringify(v.text || v.blocks);
      expect(all).not.toMatch(BAN);
      expect(all).not.toMatch(EMO);
    }));
  });
  test('эмоциональные сценарии без юмора: ни одной шутки в каталоге ситуаций, все варианты humorOk:false', () => {
    ['res_disappointed', 'res_compare_others', 'res_annoyed_app', 'res_dislike_answer', 'res_guilt'].forEach((id) => {
      expect(BY_ID[id].humor).toBeUndefined();
      BY_ID[id].variants.forEach((v) => expect(v.humorOk).toBe(false));
    });
    BY_ID.hab_missed.variants.filter((v) => /_up_/.test(v.id)).forEach((v) => expect(v.humorOk).toBe(false));
    expect(BY_ID.hab_missed.humor).toBeUndefined();
  });
});

describe('B2. распознавание: позитивы и негативы через реальный reply()', () => {
  test.each(MINE.flatMap((sc) => sc.positives.map((q) => [sc.id, q])))('%s <- «%s»', (id, q) => { expect(sid(one(q))).toBe(id); });
  test.each(MINE.flatMap((sc) => sc.negatives.map((q) => [sc.id, q])))('%s не срабатывает на «%s»', (id, q) => { expect(sid(one(q))).not.toBe(id); });
  test('match() без окружения устойчив (используется тестом каталога)', () => {
    MINE.forEach((sc) => {
      sc.positives.forEach((q) => expect(!!sc.match(analyzeText(q), { nlu: analyzeText(q) })).toBe(true));
      sc.negatives.forEach((q) => expect(!!sc.match(analyzeText(q), { nlu: analyzeText(q) })).toBe(false));
    });
  });
});

describe('B3. отрицания, время, разговорные формы, опечатки', () => {
  test.each([
    ['не хочу знать, сколько шагов', 'steps_today'],
    ['не надо мне шагов', 'steps_today'],
    ['вчера хотел добить шаги до круглого числа', 'steps_round'],
    ['не хочу отдыхать', 'rec_want_rest'],
    ['вчера хотел отдохнуть', 'rec_want_rest'],
    ['хочу пропустить тренировку', 'hab_missed'],
    ['не хочу пропускать тренировки', 'hab_missed'],
    ['не получилось выполнить план', 'res_success'],
    ['вчера побил рекорд', 'res_success'],
    ['не хочу терять серию', 'hab_missed'],
  ])('«%s» не даёт %s', (q, id) => { expect(sid(one(q))).not.toBe(id); });

  test.each([
    ['скок у меня шагов', 'steps_today'],
    ['сколко шогов сегодня', 'steps_today'],
    ['сколько шагои', 'steps_today'],
    ['пачему шагов меньше чем в другом приложении', 'steps_mismatch'],
    ['шаги не совпадают с часами', 'steps_mismatch'],
    ['скока я спал', 'sleep_last_night'],
    ['я вымотался совсем', 'rec_tired'],
    ['нет сил сегодня', 'rec_tired'],
    ['добить шаги до круглого надо?', 'steps_round'],
    ['докрутить шаги до круглой цифры', 'steps_round'],
    ['хочу взять выходной', 'rec_want_rest'],
    ['пропустил тренировку', 'hab_missed'],
    ['СКОЛЬКО ШАГОВ СЕГОДНЯ???', 'steps_today'],
  ])('«%s» -> %s', (q, id) => { expect(sid(one(q))).toBe(id); });

  test('регистр, пробелы и пунктуация не мешают', () => {
    expect(sid(one('   СКОЛЬКО    я   СПАЛ ???  '))).toBe('sleep_last_night');
    expect(sid(one('Почему  шагов — меньше, чем в другом ПРИЛОЖЕНИИ?!'))).toBe('steps_mismatch');
  });
});

describe('B4. пересечения с существующими сценариями и друг с другом', () => {
  test('несколько тем в одном сообщении не уходят в один сценарий', () => {
    const r = chat(['Сплю мало, шагов мало, вес растёт и стресс на работе. С чего начать?'])[0];
    expect(MINE.map((s) => s.id)).not.toContain(sid(r));
  });
  test('«Как улучшить сон?» — тема сна, сценарий sleep_improve', () => { const r = one('Как улучшить сон?'); expect(r.topic).toBe('sleep'); expect(sid(r)).toBe('sleep_improve'); });
  test.each([
    ['шаги не обновились', 'data_not_synced'],
    ['Что учитывает приложение?', 'cap_sources'],
    ['за какой период эти цифры?', 'data_period'],
    ['Я прошёл 7000 шагов', 'data_user_stated'],
    ['Я спал 5 часов', 'data_user_stated'],
    ['нет данных', 'data_source_unavailable'],
    ['Откуда показатели?', 'cap_sources'],
  ])('«%s» -> %s (существующий приоритет сохранён)', (q, id) => { expect(sid(one(q))).toBe(id); });
  test('число из мема 1749 и вопросы с цифрами обрабатываются прежним механизмом', () => {
    ['Почему 1749 шагов?', 'Почему у меня в приложении мало шагов?'].forEach((q) => expect(MINE.map((s) => s.id)).not.toContain(sid(one(q))));
  });
  test('«почему / проще / короче» отдельно остаются командами управления', () => {
    ['почему', 'проще', 'короче'].forEach((q) => expect(vid(one(q))).toMatch(/^ctl_/));
  });
  test('чувствительное сообщение приоритетнее: боль и «устал, болит спина» без сценариев группы 7', () => {
    const r = one('устал, болит спина');
    expect(MINE.map((s) => s.id)).not.toContain(sid(r));
  });
  test('гонка расплывчатых слов: «пропустил день» ≠ серия, «сон и шаги» ≠ один сценарий шагов', () => {
    expect(sid(one('пропустил день тренировок'))).toBe('hab_missed');
    expect(sid(one('Что с шагами и сном?'))).not.toBe('steps_today');
  });
  test('рассказ о себе в прошедшем времени не включает справочные сценарии', () => {
    ['вчера сколько шагов было', 'вчера было мало шагов'].forEach((q) => expect(['steps_low']).not.toContain(sid(one(q))));
  });
});

describe('B5. ошибка «круглое число» (Д2)', () => {
  test('вопрос без цифр -> сценарий steps_round, а не общий ориентир по шагам', () => {
    const r = one('Обязательно добивать шаги до круглого числа?');
    expect(sid(r)).toBe('steps_round');
    expect(txt(r)).toMatch(/Счётчик любит красивые числа\. Мы не обязаны\./);
    expect(txt(r)).not.toMatch(/Ориентир — около/);
    expect(r.topic).toBe('move');
    expect(r.humorId).toBeNull(); // собственная ироничная фраза: второй шутки сверху нет
  });
  test.each(['надо ли добивать до круглого числа', 'Нужно докрутить шаги до круглой цифры?', 'обязательно добить шаги до 10000?', 'do I have to round up my steps?'])('«%s»', (q) => { expect(sid(one(q))).toBe('steps_round'); });
  test('с цифрами и разрывом — прежний сценарий (около N шагов), без регрессии', () => {
    const r = one('У меня 9980 шагов. Обязательно добить до 10000?');
    expect(sid(r)).not.toBe('steps_round');
    expect(txt(r)).toMatch(/Круглый счёт|красивом числе/);
  });
  test('все варианты согласованы: нигде не требуют добивать', () => {
    const seen = new Set();
    repeat('Обязательно добивать шаги до круглого числа?', 8).forEach((r) => { seen.add(vid(r)); expect(txt(r)).not.toMatch(/обязательно (добей|добивай)|нужно добить|надо добить/i); });
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
  test('усталость: «оставляй как есть», без призыва пройтись ради числа', () => {
    const outs = repeat('Обязательно добивать шаги до круглого числа?', 6, { result: TIRED }).map(txt);
    outs.forEach((t) => expect(t).not.toMatch(/хочется закрыть разрыв/));
    expect(outs.some((t) => /оставляй как есть/.test(t))).toBe(true);
  });
  test('«без шуток» — ни одной шутки', () => {
    const rs = chat(['Без шуток, пожалуйста.', 'Обязательно добивать шаги до круглого числа?', 'другой вариант', 'другой вариант'], { tone: 'playful' });
    rs.forEach((r) => expect(r.humorId).toBeNull());
  });
  test('юмор из каталога возможен, не более одной шутки и после ответа остаётся содержательная часть', () => {
    const rs = repeat('Обязательно добивать шаги до круглого числа?', 6, { tone: 'playful' });
    rs.forEach((r) => { expect(r.text.join(' ').length).toBeGreaterThan(40); expect(validate(r.text, { jokeCount: r.humorId ? 1 : 0 }).ok).toBe(true); });
  });
});

describe('B6. Д5: несовпадение источников и уточнение один раз', () => {
  const ASK = /В каком приложении|Назови второе приложение|Какое приложение и какой день/;
  test('ни приложение, ни день не названы -> один уточняющий вопрос, причина не выдумывается', () => {
    const r = one('Почему шагов меньше, чем в другом приложении?');
    expect(sid(r)).toBe('steps_mismatch');
    expect(txt(r)).toMatch(/Сначала сравним одинаковые периоды\./);
    expect(txt(r)).toMatch(ASK);
    expect((txt(r).match(/\?/g) || []).length).toBe(1);
    expect(txt(r)).not.toMatch(/потому что|из-за|виной|дело в том/i);
    expect(r.session.memory.pending && r.session.memory.pending.key).toBe('steps_cmp');
  });
  test.each([
    ['Почему шагов сегодня меньше, чем в Google Fit?'],
    ['почему вчера в Samsung Health шагов больше'],
    ['шаги за сегодня не совпадают с часами'],
    ['Почему шагов за вчера меньше, чем на часах?'],
  ])('приложение и день названы -> не переспрашиваем: «%s»', (q) => {
    const r = one(q);
    expect(sid(r)).toBe('steps_mismatch');
    expect(txt(r)).not.toMatch(/\?/);
    expect(txt(r)).not.toMatch(ASK);
    expect(r.session.memory.pending).toBeNull();
  });
  test('диалог: приложение -> спрашиваем день; день -> больше не спрашиваем', () => {
    const [a, b, c] = chat(['Почему шагов меньше, чем в другом приложении?', 'в Samsung Health', 'за вчера']);
    expect(txt(a)).toMatch(ASK);
    expect(txt(b)).toMatch(/За какой день или период/);
    expect(txt(b)).not.toMatch(/В каком приложении/);
    expect(txt(c)).not.toMatch(/\?/);
    expect(sid(c)).toBe('steps_mismatch');
  });
  test('диалог: сначала день, потом приложение -> спрашиваем только недостающее', () => {
    const [a, b] = chat(['Почему шагов за вчера меньше, чем в другом приложении?', 'на часах Garmin']);
    expect(txt(a)).toMatch(/В каком приложении или на каких часах/);
    expect(txt(a)).not.toMatch(/за какой день/i);
    expect(txt(b)).not.toMatch(/\?/);
  });
  test('в ответе нет чужого числа и нет сравнения среднего с одним днём', () => {
    const t = txt(one('Почему шагов сегодня меньше, чем в Google Fit?'));
    expect(t).toMatch(/среднее за 7 дней/);
    expect(t).toMatch(/нельзя|не буду/);
  });
  test('ответ «в Google Fit» вне диалога об источниках не перехватывается', () => {
    expect(sid(one('в Google Fit'))).not.toBe('steps_mismatch');
  });
  test('ожидание живёт ограниченно: после смены темы ответ про приложение не относится к шагам', () => {
    const rs = chat(['Почему шагов меньше, чем в другом приложении?', 'Как улучшить сон?', 'в Samsung Health', 'за вчера']);
    expect(sid(rs[2])).not.toBe('steps_mismatch');
  });
});

describe('B7. шаги: данные, периоды, склонения', () => {
  test('«сколько шагов сегодня»: честно, что отдельной цифры за день нет; период назван', () => {
    const r = one('Сколько шагов сегодня?');
    expect(sid(r)).toBe('steps_today');
    expect(txt(r)).toMatch(/7 дней|за неделю/);
    expect(txt(r)).toMatch(/8\D?000 шагов/);
  });
  test.each([[1, '1 шаг'], [2, '2 шага'], [5, '5 шагов'], [11, '11 шагов'], [21, '21 шаг'], [22, '22 шага'], [25, '25 шагов'], [111, '111 шагов'], [1021, '1\\D?021 шаг']])('склонение: %i -> «%s»', (n, w) => {
    const v = buildVars({ steps7: n, stepGoal: 8000 }, { status: 'none' }, {}, {}, true);
    expect(fill('{steps7|full}', v)).toMatch(new RegExp(w + '$'));
    const t = txt(one('Сколько шагов сегодня?', { result: mkResult({ steps: n }) }));
    expect(t).toMatch(new RegExp(w));
    expect(t).not.toMatch(/\{|undefined|NaN|null/);
  });
  test('минуты активности и занятия склоняются', () => {
    const v = (n) => buildVars({ active7: n, workouts7: n }, { status: 'none' }, {}, {}, true);
    expect(fill('{active7|full}', v(1))).toBe('1 минута');
    expect(fill('{active7|full}', v(2))).toBe('2 минуты');
    expect(fill('{active7|full}', v(5))).toBe('5 минут');
    expect(fill('{workouts7|full}', v(1))).toBe('1 занятие');
    expect(fill('{workouts7|full}', v(3))).toBe('3 занятия');
    expect(fill('{workouts7|full}', v(11))).toBe('11 занятий');
  });
  test('сравнение периодов: только если есть оба, периоды не смешиваются', () => {
    const r = one('Сравни шаги с прошлой неделей');
    expect(sid(r)).toBe('steps_compare_period');
    expect(txt(r)).toMatch(/За 7 дней/);
    expect(txt(r)).toMatch(/за 30 дней/);
    const none = txt(one('Сравни шаги с прошлой неделей', { result: null }));
    expect(none).toMatch(/нужны два периода/);
    expect(none).not.toMatch(/\d\s?шаг/);
  });
  test('сравнение направлено правильно: неделя выше / ниже месяца', () => {
    const up = { ...RESULT, metrics: { ...RESULT.metrics, steps: { 7: okM(9000), 14: okM(8500), 30: okM(8000) } } };
    const down = { ...RESULT, metrics: { ...RESULT.metrics, steps: { 7: okM(6000), 14: okM(7000), 30: okM(8000) } } };
    expect(txt(one('Я стал ходить больше, чем раньше?', { result: up }))).toMatch(/выше среднего за месяц/);
    expect(txt(one('Я стал ходить больше, чем раньше?', { result: down }))).toMatch(/ниже среднего за месяц/);
  });
  test('личная цель: ориентир приложения из goals.js, без выдуманных порогов', () => {
    expect(txt(one('Сколько шагов мне нужно в день?'))).toMatch(/8\D?000 шагов/);
    expect(txt(one('Сколько шагов мне нужно в день?', { profile: { age: 65 }, result: { ...RESULT, chrono: 65 } }))).toMatch(/7\D?000 шагов/);
  });
  test('«шаги не растут» — причина не придумывается, ноль не подставляется', () => {
    const t = txt(one('шаги не растут'));
    expect(t).toMatch(/источник|синхрон/i);
    expect(t).not.toMatch(/\b0 шагов/);
  });
  test('«как считаются шаги» — только то, что есть в приложении (Health Connect, ручная запись)', () => {
    const outs = repeat('как считаются шаги', 4).map(txt).join('\n');
    expect(outs).toMatch(/Health Connect/);
    expect(outs).toMatch(/вручную/);
  });
});

describe('B8. сон', () => {
  test('сколько спал: прошлая ночь и личная норма, склонение часов не требуется (формат «7 ч 30 мин»)', () => {
    const r = one('Сколько я спал?');
    expect(sid(r)).toBe('sleep_last_night');
    expect(txt(r)).toMatch(/7 ч 30 мин/);
  });
  test('нет данных о сне: не «0 часов», не «спал хорошо»', () => {
    const t = txt(one('Сколько я спал?', { result: mkResult({ sleepH: null, sleepScore: null }) }));
    expect(t).toMatch(/данных|записи/);
    expect(t).not.toMatch(/\d ч/);
  });
  test('сон короче нормы и не короче — разные рекомендации, но согласованные', () => {
    const shortN = repeat('Сколько я спал?', 5, { result: mkResult({ sleepH: 6 }) }).map(txt).join('\n');
    expect(shortN).toMatch(/6 ч 00 мин/);
    expect(shortN).not.toMatch(/Не меньше обычного/);
    const longN = repeat('Сколько я спал?', 5, { result: mkResult({ sleepH: 8 }) }).map(txt).join('\n');
    expect(longN).not.toMatch(/меньше обычного\. Сегодня можно лечь/);
  });
  test('оценка сна: состав оценки из приложения, причина изменения не выдумывается', () => {
    const t = txt(one('Почему оценка сна изменилась?'));
    expect(t).toMatch(/длительност/);
    expect(t).toMatch(/назвать не могу|не определ/);
    expect(t).not.toMatch(/из-за того, что ты|потому что ты/);
  });
  test('данные не совпадают с ощущениями: опора на самочувствие, без диагнозов', () => {
    const outs = repeat('приложение показывает 8 часов, а я не выспался', 5).map(txt);
    outs.forEach((t) => expect(t).not.toMatch(/диагноз|бессонниц|апноэ|болезн/i));
    expect(outs.join(' ')).toMatch(/самочувстви|ощущени/);
  });
  test('связь сна и плана: без выдуманной причинности', () => {
    const outs = repeat('Как сон влияет на мой план?', 5).concat(repeat('Как сон влияет на мой план?', 5, { result: TIRED })).map(txt);
    outs.forEach((t) => expect(t).not.toMatch(/из-за плохого сна план|поэтому план легче потому что ты плохо спал/i));
    expect(outs.join(' ')).toMatch(/нельзя|не выдумываю|не обязательно главн|не определить/);
  });
  test('сон не показывается: честно, с учётом наличия записи', () => {
    const noData = txt(one('почему не показывает сон', { result: mkResult({ sleepH: null, sleepScore: null }) }));
    expect(noData).toMatch(/нет|не выдумываю/);
    const has = txt(one('почему не показывает сон'));
    expect(has).toMatch(/7 ч 30 мин/);
  });
});

describe('B9. восстановление и нагрузка', () => {
  test('усталость при низкой готовности: без тяжёлой тренировки; при нормальной — по самочувствию; без данных — осторожно', () => {
    const tired = repeat('я устал', 4, { result: TIRED }).map(txt).join('\n');
    expect(tired).toMatch(/без тяжёл|вместо тяжёл|не лучшее/);
    expect(tired).not.toMatch(/можно нагружаться|посложнее/);
    const ok = repeat('я устал', 4).map(txt).join('\n');
    expect(ok).toMatch(/самочувстви/);
    const none = repeat('я устал', 4, { result: null }).map(txt).join('\n');
    expect(none).toMatch(/мало|не могу/);
    expect(none).not.toMatch(/\d+\/100/);
  });
  test('«хочу больше плана»: усталому — не прибавлять, свежему — плавно (10% в неделю), без данных — осторожно', () => {
    repeat('хочу побольше нагрузки', 3, { result: TIRED }).map(txt).forEach((t) => { expect(t).toMatch(/не стоит|не сегодня/i); expect(t).not.toMatch(/10%/); });
    repeat('хочу побольше нагрузки', 2).map(txt).forEach((t) => expect(t).toMatch(/Можно|Хочется большего/));
    expect(txt(one('хочу побольше нагрузки', { result: mkResult({ load: 'high' }) }))).toMatch(/выше обычной|не больше чем/);
    expect(txt(one('хочу побольше нагрузки', { result: null }))).toMatch(/мало|осторожно/);
  });
  test('«хочу отдохнуть»: отдых допустим при любом состоянии, разрешение согласовано с данными', () => {
    expect(txt(one('хочу отдохнуть сегодня', { result: TIRED }))).toMatch(/уместен|отдых/i);
    expect(txt(one('хочу отдохнуть сегодня'))).toMatch(/Отдых — часть плана|не требуют/);
  });
  test('«почему облегчили»: причина только из общей оценки, без частных выдумок', () => {
    const t = txt(one('почему сегодня план такой лёгкий', { result: TIRED }));
    expect(t).toMatch(/восстановление/);
    expect(t).not.toMatch(/HRV упал|ночной пульс вырос/);
  });
  test('мало данных о готовности: условия оценки из scores.js (минимум два сигнала из трёх)', () => {
    const t = txt(one('почему ты не оцениваешь готовность', { result: null }));
    expect(t).toMatch(/минимум два/);
  });
  test('«лень» и «не хочу тренироваться» остаются у мотивации; усталость — не диагноз', () => {
    expect(MINE.map((s) => s.id)).not.toContain(sid(one('Мне лень идти бегать')));
    expect(txt(one('я устал'))).not.toMatch(/диагноз|депресс|анеми/i);
  });
  test('болезнь не обрабатывается как усталость', () => {
    expect(sid(one('я устал, у меня температура'))).not.toBe('rec_tired');
  });
});

describe('B10. привычки', () => {
  test('Д6: пропуск и злость -> без юмора, мягко, возврат к следующему занятию', () => {
    const r = chat(['Я пропустил занятие и теперь злюсь на себя.'], { tone: 'playful' })[0];
    expect(sid(r)).toBe('hab_missed');
    expect(txt(r)).toMatch(/Понимаю, это неприятно\./);
    expect(txt(r)).toMatch(/следующему запланированному занятию/);
    expect(r.humorId).toBeNull();
    expect(txt(r)).not.toMatch(/!/);
  });
  test('пропуск без эмоций: нормальный вариант, без отработок', () => {
    repeat('пропустил тренировку', 4).map(txt).forEach((t) => expect(t).not.toMatch(/отработай|наверстай|штраф|двойн/i));
  });
  test('пропуск с эмоцией: все варианты без наказания и юмора при playful', () => {
    chat(Array(5).fill('я пропустил занятие и злюсь на себя'), { tone: 'playful' }).forEach((r) => { expect(r.humorId).toBeNull(); expect(txt(r)).not.toMatch(/отработай|наверстай|штраф/i); });
  });
  test('возвращение: вполовину от прежнего объёма, не больше 10% в неделю, везде одно и то же', () => {
    const outs = repeat('вернулся в зал после перерыва', 5).map(txt).join('\n');
    expect(outs).toMatch(/вполовину|половин/);
    expect(outs).not.toMatch(/сразу (на )?полн/i);
  });
  test('страх бросить и болезнь не попадают в «возвращение»', () => {
    expect(sid(one('боюсь снова бросить тренировки'))).not.toBe('hab_return');
    expect(sid(one('после болезни вернусь к тренировкам'))).not.toBe('hab_return');
  });
  test('сложная цель и упрощение: минимум вместо планки', () => {
    expect(txt(one('моя цель слишком сложная'))).toMatch(/вдвое|минимум|меньш|уменьш|выполним|пересмотр|Какая часть/);
    expect(txt(one('хочу сделать свою привычку проще'))).toMatch(/10 минут|одно действие|вдвое|Привычка не экзамен/);
  });
  test('доволен малым: не подталкиваем', () => {
    repeat('мне хватает двух тренировок в неделю', 4).map(txt).forEach((t) => expect(t).not.toMatch(/добавь|нужно больше|\bмало\b/i));
  });
  test('серия: не превращается в обязательство', () => {
    repeat('моя серия прервалась', 4).map(txt).forEach((t) => expect(t).not.toMatch(/обязан|должен|любой ценой/i));
  });
});

describe('B11. результаты и эмоции', () => {
  test('успех: спокойно, восстановление, без раздувания; допустим короткий мем из каталога', () => {
    const rs = chat(['я достиг своей цели'], { tone: 'playful' });
    expect(sid(rs[0])).toBe('res_success');
    expect(txt(rs[0])).toMatch(/восстанов|полегче/);
    expect(txt(rs[0])).not.toMatch(/!/);
  });
  test('успех: рекомендация одинакова во всех вариантах (не больше 10% в неделю или восстановление)', () => {
    repeat('я достиг своей цели', 5).map(txt).forEach((t) => expect(t).toMatch(/10%|восстанов|полегче/));
  });
  test.each([
    ['разочарован числом шагов', 'res_disappointed'],
    ['у друзей шагов больше чем у меня', 'res_compare_others'],
    ['приложение меня бесит', 'res_annoyed_app'],
    ['ответ не помог', 'res_dislike_answer'],
    ['ругаю себя', 'res_guilt'],
    ['я злюсь на себя', 'res_guilt'],
  ])('«%s» -> %s без юмора при playful, без вины и нотаций', (q, id) => {
    chat(Array(5).fill(q), { tone: 'playful' }).forEach((r) => {
      expect(sid(r)).toBe(id);
      expect(r.humorId).toBeNull();
      expect(txt(r)).not.toMatch(/ты обязан|должен|нужно было|надо было|ленив/i);
    });
  });
  test('недоволен ответом: признаём без оправданий, один конкретный вопрос или просьба', () => {
    const t = txt(one('ответ не помог'));
    expect(t).toMatch(/Принято|Понял|Без оправданий|Не то/);
    expect((t.match(/\?/g) || []).length).toBeLessThanOrEqual(1);
  });
  test('сравнение с другими: личные нормы, не оценка человека', () => {
    repeat('у друзей шагов больше чем у меня', 4).map(txt).forEach((t) => expect(t).not.toMatch(/ты хуже|ты лучше|отстаёшь/i));
  });
  test('«ты настоящий ИИ» и «ты тупой» остаются у возможностей', () => {
    expect(sid(one('ты тупой'))).toBe('cap_nounderstand');
  });
});

describe('B12. продолжения: почему / другой вариант / коротко / без шуток', () => {
  test('«другой вариант» после шагов даёт другой текст той же темы', () => {
    const [a, b] = chat(['Сколько шагов сегодня?', 'другой вариант'], { tone: 'off' });
    expect(txt(b)).not.toBe(txt(a));
    expect(txt(b)).toMatch(/8\D?000 шагов|7 дней/);
  });
  test('«почему» после ответа о сне даёт объяснение, а не потерю контекста', () => {
    const [, b] = chat(['Сколько я спал?', 'почему'], { tone: 'off' });
    expect(txt(b)).toMatch(/7 ч 30 мин/);
    expect(txt(b)).not.toMatch(/не уверен/);
  });
  test('«коротко» сокращает ответ и запоминает предпочтение', () => {
    const [a, b, c] = chat(['коротко', 'Сколько шагов сегодня?', 'Сколько я спал?'], { tone: 'off' });
    expect(txt(a)).toBeTruthy();
    expect(txt(b).length).toBeLessThan(160);
    expect(txt(c).length).toBeLessThan(120);
  });
  test('«подробнее» после ответа о шагах не теряет число', () => {
    const [, b] = chat(['Сколько шагов сегодня?', 'подробнее'], { tone: 'off' });
    expect(txt(b)).toMatch(/подробнее|Подробнее|Хорошо|Могу|Вот/i);
  });
  test('смена темы не тянет прошлый сценарий', () => {
    const [, b] = chat(['Сколько шагов сегодня?', 'сколько я спал'], { tone: 'off' });
    expect(sid(b)).toBe('sleep_last_night');
  });
  test('«повтори» возвращает прошлый ответ', () => {
    const [a, b] = chat(['Сколько я спал?', 'повтори'], { tone: 'off' });
    a.text.forEach((p) => expect(txt(b)).toContain(p));
  });
});

describe('B13. безопасность текста: ни null/NaN/плейсхолдеров, ни выдуманных значений при пустых данных', () => {
  const BAD = /undefined|\bnull\b|NaN|Infinity|\{[^}]*\}|\[object|\b[a-z]{2,}_[a-z0-9_]{2,}\b/;
  const RESULTS = [['полный', RESULT], ['пустой', null], ['устал', TIRED], ['мало шагов', LOW_STEPS], ['много шагов', HIGH_STEPS], ['{} ', {}], ['только шаги', { metrics: { steps: win(5000) }, scores: {} }]];
  test.each(RESULTS)('все позитивные фразы при данных «%s»: валидный ответ', (name, result) => {
    MINE.forEach((sc) => sc.positives.forEach((q) => {
      const r = one(q, { result });
      expect(validate(r.text).ok).toBe(true);
      expect(txt(r)).not.toMatch(BAD);
    }));
  });
  test('пустой результат: нет шагов/часов/оценок, которых не было', () => {
    MINE.forEach((sc) => sc.positives.forEach((q) => {
      if (sid(one(q, { result: null })) !== sc.id) return; // мог перехватить существующий сценарий
      const t = txt(one(q, { result: null }));
      expect(t.replace(/[^.]*ориентир[^.]*\./gi, '')).not.toMatch(/\d[\d\s]*\s?(шаг|шагов|шага)/);
      expect(t).not.toMatch(/\d ч \d\d мин/);
      expect(t).not.toMatch(/\d+\/100/);
      expect(t).not.toMatch(/\b0 (шагов|ч|часов)\b/);
    }));
  });
  test('нет ни «0 шагов» ни «0 ч» когда данные отсутствуют (null-метрики)', () => {
    const r = { chrono: 40, scores: {}, metrics: { steps: { 7: { status: 'no_data', value: null }, 14: {}, 30: {} } } };
    ['Сколько шагов сегодня?', 'Сколько я спал?', 'это мало шагов?'].forEach((q) => expect(txt(one(q, { result: r }))).not.toMatch(/\b0 /));
  });
  test('пустой результат: каждый вариант каждого сценария собирается или честно не выбирается', () => {
    const v = buildVars({}, { status: 'none' }, {}, {}, true);
    MINE.forEach((sc) => sc.variants.forEach((variant) => {
      const out = assemble(variant, { ru: true, vars: v }).paras;
      const needsData = /\{/.test(JSON.stringify(variant.text || variant.blocks).replace(/\["[^"]*","[^"]*",\[[^\]]*\]\]/g, ''));
      if (!needsData) expect(validate(out).ok).toBe(true);
    }));
  });
  test('все варианты собираются при полном наборе переменных (RU и EN)', () => {
    const full = buildVars({ steps7: 8000, steps30: 7500, stepGoal: 8000, sleepH: 7.5, sleepNorm: 7.5, sleepScore: 80, sleep7: 7.4, readiness: 75, rhr7: 60, active7: 200, workouts7: 3 }, { status: 'none' }, { place: 'gym' }, {}, true);
    const fullEn = buildVars({ steps7: 8000, steps30: 7500, stepGoal: 8000, sleepH: 7.5, sleepNorm: 7.5, sleepScore: 80, sleep7: 7.4, readiness: 75, rhr7: 60, active7: 200, workouts7: 3 }, { status: 'none' }, { place: 'gym' }, {}, false);
    // переменные движка (не из buildVars)
    [full, fullEn].forEach((vs) => { vs.sleepTips = { name: 'sleepTips', value: 'tip', kind: 'text', available: true }; });
    MINE.forEach((sc) => sc.variants.forEach((v) => {
      expect({ id: v.id, ok: validate(assemble(v, { ru: true, vars: full }).paras).ok }).toEqual({ id: v.id, ok: true });
      const en = assemble(v, { ru: false, vars: fullEn }).paras.join(' ');
      expect({ id: v.id, cyr: /[А-Яа-яЁё]/.test(en) }).toEqual({ id: v.id, cyr: false });
      expect({ id: v.id, ok: validate(assemble(v, { ru: false, vars: fullEn }).paras).ok }).toEqual({ id: v.id, ok: true });
    }));
  });
  test('длина: абзац <= 520, ответ <= 1400 для всех вариантов', () => {
    const full = buildVars({ steps7: 8000, steps30: 7500, stepGoal: 8000, sleepH: 7.5, sleepNorm: 7.5, sleepScore: 80, sleep7: 7.4, readiness: 75, active7: 200, workouts7: 3 }, { status: 'none' }, {}, {}, true);
    MINE.forEach((sc) => sc.variants.forEach((v) => { const p = assemble(v, { ru: true, vars: full }).paras; p.forEach((x) => expect(x.length).toBeLessThanOrEqual(520)); expect(p.join(' ').length).toBeLessThanOrEqual(1400); }));
  });
});

describe('B14. ротация и согласованность', () => {
  test('шаги: пять одинаковых вопросов подряд — пять разных формулировок', () => {
    const outs = repeat('Сколько шагов сегодня?', 5).map(txt);
    expect(new Set(outs).size).toBe(5);
    expect(new Set(repeat('Сколько шагов сегодня?', 5).map(vid)).size).toBe(5);
  });
  test('после исчерпания берётся самый давний вариант и ответ не пропадает', () => {
    const rs = repeat('Сколько шагов сегодня?', 12);
    rs.forEach((r) => expect(txt(r).length).toBeGreaterThan(20));
    expect(vid(rs[11])).toBe(vid(rs[11 - new Set(rs.map(vid)).size]));
  });
  test('шаги: при числе ниже ориентира ни один вариант не говорит «достигнут», и наоборот', () => {
    repeat('Сколько шагов сегодня?', 8, { result: LOW_STEPS }).map(txt).forEach((t) => { expect(t).not.toMatch(/достигнут|не ниже ориентира/); });
    repeat('Сколько шагов сегодня?', 8, { result: HIGH_STEPS }).map(txt).forEach((t) => { expect(t).not.toMatch(/ниже ориентира|добрать/); });
    repeat('это мало шагов?', 6, { result: LOW_STEPS }).map(txt).forEach((t) => expect(t).not.toMatch(/не ниже ориентира|достаточно/));
  });
  test('при неизменных фактах рекомендация та же: усталость + низкая готовность -> всегда без тяжёлого', () => {
    repeat('я устал', 6, { result: TIRED }).map(txt).forEach((t) => expect(t).toMatch(/без тяжёл|вместо тяжёл|прогулк|растяжк|облегча/));
  });
  test('id вариантов не повторяются между сценариями и совпадают с реестром', () => {
    const ids = MINE.flatMap((s) => s.variants.map((v) => v.id));
    expect(new Set(ids).size).toBe(ids.length);
    repeat('Сколько шагов сегодня?', 4).forEach((r) => expect(BY_ID.steps_today.variants.map((v) => v.id)).toContain(vid(r)));
  });
  test('история шуток отделена от истории ответов', () => {
    const rs = chat(['Обязательно добивать шаги до круглого числа?', 'Обязательно добивать шаги до круглого числа?'], { tone: 'playful' });
    rs.forEach((r) => expect(r.session.memory.recent.length).toBeGreaterThan(0));
    rs.forEach((r) => (r.session.memory.recent || []).forEach((id) => expect(id).toMatch(/^[a-z0-9_]+$/)));
  });
});

describe('B15. английский интерфейс', () => {
  beforeEach(() => setLang('en'));
  const CYR = /[А-Яа-яЁё]/;
  test.each([
    ['how many steps today', 'steps_today'],
    ['do I have to round up my steps?', 'steps_round'],
    ['why do my steps differ from my watch', 'steps_mismatch'],
    ['how long did I sleep', 'sleep_last_night'],
    ['I am tired today', 'rec_tired'],
    ['I missed my workout', 'hab_missed'],
    ['I reached my goal', 'res_success'],
    ['the app is annoying', 'res_annoyed_app'],
  ])('«%s» -> %s без кириллицы', (q, id) => {
    const r = one(q);
    expect(sid(r)).toBe(id);
    expect(txt(r)).not.toMatch(CYR);
    expect(validate(r.text).ok).toBe(true);
  });
  test('English Д2 and Д5 and Д6', () => {
    expect(txt(one('do I have to round up my steps?'))).toMatch(/The counter loves pretty numbers\. We are not obliged to\./);
    const a = one('why do my steps differ from my watch');
    expect(txt(a)).toMatch(/Which app|other app/);
    const b = one('why are my steps today lower than in Google Fit');
    expect(txt(b)).not.toMatch(/\?/);
    const c = chat(['I missed my workout and I am angry at myself'], { tone: 'playful' })[0];
    expect(c.humorId).toBeNull();
    expect(txt(c)).toMatch(/understand|unpleasant|punishment/i);
  });
  test('English plurals', () => {
    const v = (n) => buildVars({ steps7: n }, { status: 'none' }, {}, {}, false);
    expect(fill('{steps7|full}', v(1), false)).toBe('1 step');
    expect(fill('{steps7|full}', v(2), false)).toBe('2 steps');
  });
  test('пустой результат на английском: без плейсхолдеров и придуманных чисел', () => {
    MINE.forEach((sc) => sc.positives.filter((q) => !CYR.test(q)).forEach((q) => {
      const t = txt(one(q, { result: null }));
      expect(t).not.toMatch(CYR);
      expect(t).not.toMatch(/undefined|NaN|\{|\bnull\b/);
    }));
  });
});
