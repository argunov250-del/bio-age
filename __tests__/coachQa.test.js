// Вопросы кнопками: каталог, движок ответов и подсказок, экран без поля ввода (светлая и тёмная темы).
const React = require('react');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

jest.mock('../lib/health', () => ({}));
jest.mock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
['sleep', 'activity', 'heart', 'training', 'recovery', 'bodyage', 'nutrition', 'stress', 'cycle', 'app', 'chiron'].forEach((n) => {
  jest.doMock('../lib/coach/qa/' + n, () => ({ __esModule: true, default: require('./fixtures/qaFixture')[n] }));
});

const okM = (value) => ({ status: 'ok', value });
const win = (v) => ({ 7: okM(v), 14: okM(v), 30: okM(v) });
const FULL = {
  chrono: 40, bio: 38, pace: 0.9,
  scores: { sleep: { status: 'ok', score: 80, hours: 7.5, norm: 7.5 }, activity: { status: 'ok', score: 70 }, readiness: { status: 'ok', score: 75 }, recovery: { status: 'ok', score: 70, hrvDev: 2, nightHrDiff: 0 }, load: { level: 'normal' } },
  metrics: { steps: win(8000), sleepDuration: win(7.4), restingHr: win(60), hrv: win(50), activeMinutes: win(200), sleepRegularity: { 14: okM(80) }, exercise: { 7: okM(3), 30: okM(10) }, hrvBaseline: { value: 50 }, vo2max: okM(42) },
};
const POOR = { ...FULL, scores: { ...FULL.scores, sleep: { status: 'ok', score: 45, hours: 5.2, norm: 7.5 } }, metrics: { ...FULL.metrics, sleepDuration: win(5.3) } };

describe('каталог и поиск', () => {
  const idx = require('../lib/coach/qa');
  test('checkQA без ошибок; ловит дубли и битые follow', () => {
    expect(idx.checkQA()).toEqual([]);
    const bad = idx.checkQA([{ ...idx.QA[0] }, { ...idx.QA[0], follow: ['nope'] }]);
    expect(bad.join('|')).toMatch(/дубль id/); expect(bad.join('|')).toMatch(/follow -> нет nope/);
  });
  test('when(env) скрывает вопросы про цикл', () => {
    expect(idx.visible({ profile: {} }).some((x) => x.id === 'cycle_phase')).toBe(false);
    expect(idx.visible({ profile: { sex: 'f', showCycle: true } }).some((x) => x.id === 'cycle_phase')).toBe(true);
  });
  test('поиск по q и tags, ё/е, пустой — все', () => {
    const ids = (q) => idx.search(q, { profile: {} }, true).map((x) => x.id);
    expect(ids('недосып')).toEqual(['sleep_how_much', 'sleep_debt'].filter((x) => ids('недосып').includes(x)));
    expect(ids('недосып')).toContain('sleep_how_much');
    expect(ids('фазы')).toEqual(['sleep_phases']);
    expect(ids('ХИРОН')).toEqual(['chiron_who']);
    expect(ids('вариабельность')).toEqual(['heart_hrv']);
    expect(ids('zzzz')).toEqual([]);
    expect(ids('').length).toBe(idx.visible({ profile: {} }).length);
  });
});

describe('движок ответов', () => {
  const E = require('../lib/coach/qaEngine');
  const { emptyMemory } = require('../lib/coach/memory');
  const env = (result, profile) => ({ ...E.makeEnv({ result, profile: profile || {}, tone: 'balanced' }), ru: true });
  test('ответ: короткий текст с данными, more, источники resolved, follow', () => {
    const a = E.answerQuestion('sleep_how_much', env(FULL), emptyMemory());
    expect(a.text.join(' ')).toMatch(/7 ч 24 мин/);
    expect(a.more).toContain('Подробный разбор');
    expect(a.sources[0]).toEqual(expect.objectContaining({ text: expect.stringMatching(/7–9/), source: expect.any(String) }));
    expect(a.sources[1]).toEqual({ title: 'WHO: Physical activity guidelines', year: 2020 });
    expect(a.follow).toEqual(['sleep_debt', 'sleep_phases']);
    expect(E.answerQuestion('nope', env(FULL), emptyMemory())).toBeNull();
  });
  test('нет данных: переменная опускается, чисто и без нулей', () => {
    const a = E.answerQuestion('sleep_how_much', env(null), emptyMemory());
    const t = a.text.join(' ');
    expect(t).not.toMatch(/\{|undefined|NaN| 0 ч/);
    expect(t.trim()).toBe(t);
    const vars = E.buildQaVars(env(null));
    expect(vars.sleepAvgLine).toBeUndefined();
    expect(vars.stepGoal).toBe('8 000');
    expect(E.fill('А {x} Б {sleepAvgLine}.', {})).toBe('А Б.');
  });
  test('ротация вариантов: LRU через память', () => {
    let m = emptyMemory();
    const seen = [];
    for (let i = 0; i < 4; i++) { const a = E.answerQuestion('sleep_how_much', env(FULL), m); m = a.memory; seen.push(a.text.join(' ').startsWith('Второй') ? 2 : 1); }
    expect(seen).toEqual([1, 2, 1, 2]);
    expect(m.qaAsked).toEqual(['sleep_how_much']);
  });
  test('юмор: никогда при выключенном режиме, защитной паузе и humorOk=false', () => {
    const CAT = [{ id: 'h1', variants: ['Шутка'], variantsEn: ['Joke'], priority: 10, matchingIntents: ['sleep_how_much', 'chiron_who'], contextualTriggers: [], blockedContexts: [], cooldownAssistantMessages: 1 }];
    jest.isolateModules(() => {
      jest.doMock('../lib/humor/catalog', () => ({ CATALOG: CAT, MEMES: CAT, JABS: [] }));
      const E2 = require('../lib/coach/qaEngine');
      const mem = require('../lib/coach/memory');
      const e = (tone) => ({ ...E2.makeEnv({ result: FULL, profile: {}, tone }), ru: true });
      expect(E2.answerQuestion('sleep_how_much', e('playful'), mem.emptyMemory()).humorId).toBe('h1');
      expect(E2.answerQuestion('sleep_how_much', e('off'), mem.emptyMemory()).humorId).toBeNull();
      expect(E2.answerQuestion('sleep_how_much', e('playful'), { ...mem.emptyMemory(), hold: { kind: 'red', turn: 0 } }).humorId).toBeNull();
      expect(E2.answerQuestion('chiron_who', e('playful'), mem.emptyMemory()).humorId).toBeNull();
    });
  });
  test('подсказки: по данным (плохой сон -> сон), без повторов, 4–6, продолжения последнего', () => {
    const e = env(POOR);
    const a = E.suggestions(e, emptyMemory(), null);
    expect(a.length).toBeGreaterThanOrEqual(4); expect(a.length).toBeLessThanOrEqual(6);
    expect(new Set(a).size).toBe(a.length);
    expect(a.slice(0, 2).every((id) => id.startsWith('sleep_'))).toBe(true);
    expect(a).not.toContain('cycle_phase');
    expect(a.every((id) => id !== 'sleep_phases')).toBe(true); // pro только после pro-вопроса
    let m = emptyMemory();
    m = E.answerQuestion('sleep_how_much', e, m).memory;
    const b = E.suggestions(e, m, 'sleep_how_much');
    expect(b).not.toContain('sleep_how_much');
    expect(b[0]).toBe('sleep_debt');
    m = E.answerQuestion('sleep_phases', e, m).memory; // спросил pro
    const c = E.suggestions(e, m, 'sleep_phases');
    expect(c).not.toContain('sleep_phases'); expect(c).not.toContain('sleep_how_much');
    expect(c.some((id) => id === 'heart_hrv')).toBe(true); // один pro предлагается
  });
});

async function setup(lang, theme) {
  jest.resetModules();
  const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
  const gp = require('./growthUiHarness');
  jest.doMock('react-native', () => gp.makeRN(lang, host), { virtual: true });
  jest.doMock('react-native-svg', () => gp.hostProxy(host), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  const mem = {};
  jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async (k) => (k in mem ? mem[k] : null), setItem: async (k, v) => { mem[k] = String(v); }, removeItem: async (k) => { delete mem[k]; } } }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('react-native-health-connect', () => ({ __esModule: true }), { virtual: true });
  // Модель в тестах не грузится: копия «уже в документах», completion отдаёт ответ со скрытым <think>.
  const FS = require('expo-file-system/legacy');
  FS.documentDirectory = 'file:///mock-docs/';
  FS.getInfoAsync.mockReset();
  FS.getInfoAsync.mockImplementation(async (uri) => ({ exists: uri === 'file:///mock-docs/qwen3-4b-q5_k_m.gguf', isDirectory: false, size: 2800000000 }));
  const llama = require('llama.rn');
  llama.initLlama.mockReset();
  llama.initLlama.mockImplementation(async () => ({ completion: async () => ({ text: '<think>скрыто</think>Ложись и вставай в одно время. За час до сна убери экраны.' }) }));
  const errors = [];
  jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
  const TR = require('react-test-renderer');
  const i18n = require(path.join(ROOT, 'lib/i18n'));
  i18n.setLang(lang);
  const { THEMES } = require(path.join(ROOT, 'lib/theme'));
  const { ColorsContext } = require(path.join(ROOT, 'lib/colors'));
  const { CoachScreen } = require(path.join(ROOT, 'lib/screens/CoachScreen'));
  const { QA_BY_ID } = require(path.join(ROOT, 'lib/coach/qa'));
  const el = React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, React.createElement(CoachScreen, { result: POOR, profile: { coachTone: 'off' }, tabbed: true }));
  let r;
  await TR.act(async () => { r = TR.create(el); });
  await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
  const text = () => JSON.stringify(r.toJSON());
  const findText = (label) => r.root.findAll((n) => n.type === 'Text' && [].concat(n.props.children).join('') === label)[0];
  const pressText = async (label) => {
    let b = findText(label);
    expect(b).toBeTruthy();
    while (b && !b.props.onPress) b = b.parent;
    expect(b).toBeTruthy();
    await TR.act(async () => { b.props.onPress(); });
  };
  const wait = async (ms) => { await TR.act(async () => { await new Promise((res) => setTimeout(res, ms)); }); };
  return { TR, r, text, pressText, findText, wait, errors, tr: i18n.tr, q: (id) => (lang === 'ru' ? QA_BY_ID[id].q.ru : QA_BY_ID[id].q.en), QA_BY_ID, lang };
}

describe.each([['ru', 'light'], ['ru', 'dark'], ['en', 'light'], ['en', 'dark']])('экран Хирона (%s, %s)', (lang, theme) => {
  afterEach(() => { jest.restoreAllMocks(); });
  test('нет TextInput в чате; подсказки и «Все темы» на месте, кнопки «Мне плохо» нет', async () => {
    const t = await setup(lang, theme);
    expect(t.r.root.findAll((n) => n.type === 'TextInput')).toHaveLength(0);
    expect(t.findText(t.tr('Все темы'))).toBeTruthy();
    expect(t.text()).not.toMatch(/Мне плохо|I feel unwell/);
    expect(t.text()).toContain(t.tr('Хирон даёт общие советы и не заменяет врача.'));
    expect(t.findText(t.q('sleep_how_much'))).toBeTruthy();
    expect(t.errors).toEqual([]);
  });
  test('чип -> пузырь вопроса и ответ; «Подробнее» раскрывает разбор и источники', async () => {
    const t = await setup(lang, theme);
    await t.pressText(t.q('sleep_how_much'));
    await t.wait(1200);
    const x = t.text();
    expect(x).toContain(t.q('sleep_how_much'));
    // Кинетический текст режет фразу по словам, поэтому сверяем слова ответа модели, не каталога.
    expect(x).toContain('Ложись');
    expect(x).toContain('экраны');
    expect(x).not.toContain('скрыто');
    expect(x).not.toContain('<think>');
    expect(x).not.toMatch(/Подробный разбор|Detailed breakdown/);
    await t.pressText(t.tr('Подробнее'));
    const y = t.text();
    expect(y).toMatch(/Подробный разбор|Detailed breakdown/);
    expect(y).toContain('WHO: Physical activity guidelines, 2020');
    expect(y).toContain('AASM');
    expect(t.errors).toEqual([]);
  });
  test('«Все темы»: разделы -> вопросы; поиск только фильтрует список; выбор вопроса отвечает', async () => {
    const t = await setup(lang, theme);
    const inChips = (id) => t.r.root.findAll((n) => n.type === 'Text' && n.props.children === t.q(id)).length;
    const chipCount = inChips('app_score');
    await t.pressText(t.tr('Все темы'));
    expect(t.r.root.findAll((n) => n.type === 'TextInput')).toHaveLength(1);
    expect(t.text()).toContain(lang === 'ru' ? 'Шаги и активность' : 'Steps and activity');
    expect(t.text()).not.toContain('cycle');
    // у каждого раздела есть число вопросов
    const secCount = t.r.root.findAll((n) => n.type === 'Text' && /^\d+$/.test(String(n.props.children)));
    expect(secCount.length).toBeGreaterThanOrEqual(5);
    const input = t.r.root.findAll((n) => n.type === 'TextInput')[0];
    await t.TR.act(async () => { input.props.onChangeText(lang === 'ru' ? 'фазы' : 'stages'); });
    expect(t.findText(t.q('sleep_phases'))).toBeTruthy();
    expect(t.findText('PRO')).toBeTruthy();
    expect(inChips('app_score')).toBe(chipCount); // в списке окна его нет (остался только чип под чатом, если он там был)
    await t.TR.act(async () => { input.props.onChangeText('qqqq'); });
    expect(t.text()).toContain(t.tr('Ничего не найдено'));
    await t.TR.act(async () => { input.props.onChangeText(lang === 'ru' ? 'недосып' : 'sleep debt'); });
    await t.pressText(t.q('sleep_debt'));
    await t.wait(1200);
    expect(t.r.root.findAll((n) => n.type === 'TextInput')).toHaveLength(0); // окно закрыто
    expect(t.text()).toContain(t.q('sleep_debt'));
  });
});

test('сбой модели: серая строка под пузырём с причиной', async () => {
  const t = await setup('ru', 'light');
  const FS = require('expo-file-system/legacy');
  FS.getInfoAsync.mockImplementation(async () => ({ exists: false, isDirectory: false, size: 0 }));
  const picker = require('expo-document-picker');
  picker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: [] });
  await t.pressText(t.q('sleep_how_much'));
  await t.wait(1200);
  const x = t.text();
  expect(x).toContain('Попробуй');
  expect(x).toContain('Нет файла');
  expect(x).toContain('qwen3-4b-q5_k_m.gguf');
});
