// Вкладки «Нагрузка», «Тренды», «Журнал» (стекло): светлая/тёмная тема, ru/en, полные / частичные / пустые данные;
// отметка журнала сохраняется и меняет расчёт; влияние на восстановление; сетка активности с легендой.
const React = require('react');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };

const pad = (n) => (n < 10 ? '0' : '') + n;
const dayKey = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const startOfDay = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d; };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d; };
const NOW = new Date(2026, 5, 20, 14, 0, 0);
const today = startOfDay(NOW);
const keyAt = (i) => dayKey(addDays(today, i));

function build(nights, { hrv = true, workout = true } = {}) {
  const ds = { now: NOW, hr: {}, sleep: {}, nights: {}, rhr: {}, nightHr: {}, extra: { HeartRateVariabilityRmssd: [], RespiratoryRate: [], OxygenSaturation: [] }, workouts: [], hrToday: [] };
  for (let i = -nights + 1; i <= 0; i++) {
    const k = keyAt(i);
    const a = new Uint8Array(288); a.fill(1, 0, 90); ds.sleep[k] = a;
    ds.nights[k] = { start: addDays(today, i - 1).getTime() + 23 * 3600000, end: addDays(today, i).getTime() + 7 * 3600000, stages: { light: 250, deep: 90, rem: 100, awake: 30 } };
    ds.hr[k] = { z13: 60, z45: 0, cover: 900, load: 100 + (i % 3) * 40, rhrEst: 55 };
    ds.nightHr[k] = 52 + (i % 2);
    const t = addDays(today, i).getTime() + 3 * 3600000;
    if (hrv) ds.extra.HeartRateVariabilityRmssd.push({ t, v: 60 + (i % 3), night: true });
    ds.extra.RespiratoryRate.push({ t, v: 14, night: true });
    ds.extra.OxygenSaturation.push({ t, v: 0.96, night: true });
  }
  if (workout) ds.workouts.push({ start: today.getTime() + 8 * 3600000, end: today.getTime() + 9 * 3600000, type: 79, load: 140, activeMin: 50, hrAvg: 128, hrMax: 150 });
  return ds;
}
const P = { birth: '1990-01-01' };

async function setup(lang, theme, store = {}) {
  jest.resetModules();
  const gp = require('./growthUiHarness');
  const rn = gp.makeRN(lang, host);
  rn.AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(true);
  jest.doMock('react-native', () => rn, { virtual: true });
  jest.doMock('react-native-svg', () => gp.hostProxy(host), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async (k) => (k in store ? store[k] : null), setItem: async (k, v) => { store[k] = v; }, removeItem: async (k) => { delete store[k]; } } }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('expo-location', () => ({ __esModule: true, requestForegroundPermissionsAsync: async () => ({ granted: false }), getCurrentPositionAsync: async () => ({}), Accuracy: {} }), { virtual: true });
  jest.doMock('expo-notifications', () => ({ __esModule: true, setNotificationHandler() {}, getPermissionsAsync: async () => ({ granted: false }), AndroidImportance: {} }), { virtual: true });
  jest.doMock('react-native-health-connect', () => ({ __esModule: true }), { virtual: true });
  const errors = [];
  jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
  const TR = require('react-test-renderer');
  require(path.join(ROOT, 'lib/i18n')).setLang(lang);
  require(path.join(ROOT, 'lib/motion'));
  await Promise.resolve(); await Promise.resolve();
  const { THEMES } = require(path.join(ROOT, 'lib/theme'));
  const { ColorsContext } = require(path.join(ROOT, 'lib/colors'));
  const { computePerf } = require(path.join(ROOT, 'lib/perf/index'));
  const wrap = (el) => React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, el);
  const flush = async () => { await TR.act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); }); };
  const mount = async (el) => { let r; await TR.act(async () => { r = TR.create(wrap(el)); }); await flush(); return r; };
  const strings = (r) => {
    const out = [];
    const walk = (n) => { if (n == null) return; if (typeof n === 'string') { out.push(n); return; } if (Array.isArray(n)) { n.forEach(walk); return; } walk(n.children); };
    walk(r.toJSON());
    return out;
  };
  const byId = (r, id) => r.root.findAll((n) => n.props && n.props.testID === id);
  const press = async (r, id) => {
    const n = byId(r, id).find((x) => typeof x.props.onPress === 'function');
    expect(n).toBeTruthy();
    await TR.act(async () => { n.props.onPress(); });
    await flush();
  };
  const perfs = {
    full: computePerf(build(40), {}, P, NOW),
    partial: computePerf(build(5, { hrv: false, workout: false }), {}, P, NOW),
    empty: computePerf({}, {}, P, NOW),
  };
  return { TR, errors, mount, flush, strings, byId, press, perfs, store, computePerf, build, req: (m) => require(path.join(ROOT, m)), tr: require(path.join(ROOT, 'lib/i18n')).tr };
}

const COMBOS = [['ru', 'light'], ['ru', 'dark'], ['en', 'light'], ['en', 'dark']];
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
const clean = (t, strs) => {
  const all = strs.join('|');
  expect(all).not.toMatch(/NaN|undefined|Infinity|\[object/);
  expect(t.errors).toEqual([]);
  if (t.tr('Тренды') === 'Trends') expect(all).not.toMatch(/[А-Яа-яЁё]{4,}/);
};

describe('perf.trends: ряды за 90 дней', () => {
  test('90 точек, нули там, где нет данных', async () => {
    const t = await setup('ru', 'light');
    const tr = t.perfs.full.trends;
    expect(tr.days).toBe(90);
    for (const k of ['recovery', 'strain', 'sleep', 'wellness']) expect(tr[k].length).toBe(90);
    expect(tr.recovery.filter((x) => x.v != null).length).toBeGreaterThan(20);
    expect(t.perfs.empty.trends.recovery.every((x) => x.v == null)).toBe(true);
  });
});

describe.each(COMBOS)('вкладки (%s, %s)', (lang, theme) => {
  test.each(['full', 'partial', 'empty', 'null'])('Нагрузка: %s', async (kind) => {
    const t = await setup(lang, theme);
    const { StrainScreen } = t.req('lib/screens/StrainScreen');
    const opened = [];
    const r = await t.mount(React.createElement(StrainScreen, { perf: kind === 'null' ? null : t.perfs[kind], onOpen: (k) => opened.push(k) }));
    const s = t.strings(r);
    clean(t, s);
    expect(t.byId(r, 'tick-gauge').length).toBeGreaterThan(0);
    if (kind === 'full') {
      expect(s.join('|')).toContain(t.tr('Тренировки сегодня'));
    } else {
      expect(s.join('|')).toContain(t.tr('Сегодня тренировок нет.'));
    }
    await t.press(r, 'strain-add-workout');
    await t.press(r, 'strain-chiron');
    expect(opened).toEqual(['log:workout', 'coach']);
    expect(s.join('|')).toContain(t.tr('Все тренировки'));
    expect(t.req('lib/chiron').takeChironTopic()).toBe('training');
  });

  test('Нагрузка поверх вкладок (onBack) без onOpen не падает', async () => {
    const t = await setup(lang, theme);
    const { StrainScreen } = t.req('lib/screens/StrainScreen');
    const r = await t.mount(React.createElement(StrainScreen, { perf: t.perfs.full, onBack: () => {} }));
    clean(t, t.strings(r));
  });

  test.each(['full', 'partial', 'empty', 'null'])('Тренды: %s, период 7/30/90', async (kind) => {
    const t = await setup(lang, theme);
    const { TrendsScreen } = t.req('lib/screens/TrendsScreen');
    const opened = [];
    const r = await t.mount(React.createElement(TrendsScreen, { result: null, perf: kind === 'null' ? null : t.perfs[kind], onOpen: (k) => opened.push(k) }));
    for (const n of [7, 30, 90]) {
      await t.press(r, 'trends-period-' + n);
      clean(t, t.strings(r));
    }
    const s = t.strings(r).join('|');
    expect(s).toContain(t.tr('Индекс самочувствия'));
    expect(s).toContain(t.tr('Итоги за 90 дней'));
    if (kind === 'empty' || kind === 'null') expect(s).toContain(t.tr('График появится, когда накопится хотя бы пара дней данных.'));
    await t.press(r, 'trends-all-metrics');
    expect(opened).toEqual(['metrics']);
  });

  test('Тренды: полные данные — графики и итоги', async () => {
    const t = await setup(lang, theme);
    const { TrendsScreen } = t.req('lib/screens/TrendsScreen');
    const r = await t.mount(React.createElement(TrendsScreen, { result: null, perf: t.perfs.full, onOpen: () => {} }));
    const s = t.strings(r).join('|');
    expect(s).not.toContain(t.tr('График появится, когда накопится хотя бы пара дней данных.'));
    expect(s).toContain(t.tr('Итоги месяца'));
    expect(JSON.stringify(r.toJSON())).toContain('Rect');
  });

  test.each(['full', 'partial', 'empty', 'null'])('Журнал: %s', async (kind) => {
    const t = await setup(lang, theme);
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const r = await t.mount(React.createElement(JournalScreen, { perf: kind === 'null' ? null : t.perfs[kind], growth: null, plan: null, activities: {}, achievements: [], onOpen: () => {} }));
    const s = t.strings(r);
    clean(t, s);
    expect(s.join('|')).toContain(t.tr('Влияние на восстановление'));
    expect(s.join('|')).toContain(t.tr('Отмечай привычки несколько недель, и я покажу, как они связаны с восстановлением на следующее утро.'));
    expect(s.join('|')).toContain(t.tr('Считаю прогресс…'));
  });
});

describe('журнал: отметка сохраняется и меняет расчёт', () => {
  test('переключатель пишет в хранилище, переключается обратно, счётчик алкоголя', async () => {
    const t = await setup('ru', 'dark');
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const r = await t.mount(React.createElement(JournalScreen, { perf: t.perfs.full, activities: {}, achievements: [], onOpen: () => {} }));
    const today = t.req('lib/journal').dayKey();
    await t.press(r, 'jr-lateMeal');
    expect(JSON.parse(t.store['journal.v1'])[today].lateMeal).toBe(true);
    await t.press(r, 'jr-alcohol');
    expect(t.byId(r, 'jr-alcohol-count').length).toBeGreaterThan(0);
    await t.press(r, 'jr-alcohol-plus');
    expect(JSON.parse(t.store['journal.v1'])[today].alcohol).toBe(2);
    await t.press(r, 'jr-lateMeal');
    expect(JSON.parse(t.store['journal.v1'])[today].lateMeal).toBe(false);
    // вчерашний день: свой ключ
    await t.press(r, 'journal-prev');
    await t.press(r, 'jr-sauna');
    const y = dayKey(new Date(Date.now() - 86400000));
    expect(JSON.parse(t.store['journal.v1'])[y].sauna).toBe(true);
    clean(t, t.strings(r));
  });

  test('подписка: экран подхватывает изменение журнала, сделанное снаружи', async () => {
    const t = await setup('ru', 'light');
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const J = t.req('lib/journal');
    const r = await t.mount(React.createElement(JournalScreen, { perf: t.perfs.full, activities: {}, achievements: [], onOpen: () => {} }));
    await t.TR.act(async () => { await J.addJournalNote('тест заметки'); });
    await t.flush();
    expect(t.strings(r).join('|')).toContain('тест заметки');
  });

  test('computePerf: журнал вечером меняет прогноз энергии', async () => {
    const t = await setup('ru', 'light');
    const ds = t.build(40);
    const base = t.computePerf(ds, {}, P, NOW, { journal: {}, activities: {} });
    const drunk = t.computePerf(ds, {}, P, NOW, { journal: { [dayKey(today)]: { alcohol: 2, lateMeal: true } }, activities: {} });
    expect(base.forecast).toBeTruthy();
    expect(drunk.forecast.pct).toBeLessThan(base.forecast.pct);
    expect(drunk.wellness.score).not.toBeNull();
    expect(base.activityGrid.weeks.length).toBe(6);
    expect(t.computePerf(ds, {}, P, NOW).activityGrid).toBeNull();
    expect(t.computePerf(ds, {}, P, NOW, { journal: {}, activities: {} }).trends.wellness.length).toBe(90);
  });
});

describe.each(COMBOS)('влияние и сетка (%s, %s)', (lang, theme) => {
  const rng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  test('инсайты со стрелками, дельтой и уверенностью; «нужно ещё N дней» для остальных', async () => {
    const r0 = rng(7);
    const J = {}, rec = [];
    const days = 60;
    for (let i = days - 1; i >= 0; i--) {
      const k = dayKey(addDays(startOfDay(Date.now()), -i));
      const al = r0() < 0.4;
      J[k] = { alcohol: al ? 2 : 0 };
      rec.push({ key: k, v: null });
    }
    // восстановление на следующее утро ниже после алкоголя
    const keys = rec.map((x) => x.key);
    keys.forEach((k, i) => { const prevAl = i > 0 && J[keys[i - 1]].alcohol > 0; rec[i].v = 75 - (prevAl ? 20 : 0) + (r0() - 0.5) * 8; });
    const t = await setup(lang, theme, { 'journal.v1': JSON.stringify(J) });
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const perf = { ...t.perfs.full, trends: { ...t.perfs.full.trends, recovery: rec } };
    const r = await t.mount(React.createElement(JournalScreen, { perf, activities: {}, achievements: [], onOpen: () => {} }));
    const s = t.strings(r);
    clean(t, s);
    const row = t.byId(r, 'impact-alcohol');
    expect(row.length).toBeGreaterThan(0);
    expect(s.join('|')).toContain('↓');
    expect(s.join('|')).toContain(t.tr('уверенность высокая'));
    expect(s.join('|')).toMatch(/−\d/);
    expect(s.join('|')).toContain(t.tr('п.п.'));
    expect(s.join('|')).toContain(t.tr('Нужно ещё'));
    // нейтральные формулировки: «связь», а не «из-за»/«вызывает»
    expect(s.join('|')).toContain(t.tr('Это связь на небольшой выборке, а не причина.'));
    expect(s.join('|')).not.toMatch(/вызывает|из-за|causes|because of/i);
  });

  test('сетка активности: точки трёх состояний и легенда', async () => {
    const act = {};
    const k0 = dayKey(startOfDay(Date.now()));
    const k1 = dayKey(addDays(startOfDay(Date.now()), -1));
    const k2 = dayKey(addDays(startOfDay(Date.now()), -2));
    act[k0] = { breathMin: 12, pauseMin: 0 }; act[k1] = { breathMin: 6, pauseMin: 0 }; act[k2] = { breathMin: 1 };
    const t = await setup(lang, theme);
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const r = await t.mount(React.createElement(JournalScreen, { perf: t.perfs.empty, activities: act, achievements: [], onOpen: () => {} }));
    const s = t.strings(r).join('|');
    for (const w of ['Цель достигнута', 'Частично', 'Нет']) expect(s).toContain(t.tr(w));
    expect(t.byId(r, 'grid-legend').length).toBeGreaterThan(0);
    const dots = r.root.findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('dot-') && typeof n.type === 'string');
    expect(dots.length).toBe(42);
    const kinds = new Set(dots.map((d) => d.props.testID));
    expect(kinds.has('dot-full')).toBe(true);
    expect(kinds.has('dot-partial')).toBe(true);
    expect(kinds.has('dot-none')).toBe(true);
    clean(t, t.strings(r));
  });

  test('Рост: уровень, ранг, задания; нажатие открывает полный экран', async () => {
    const t = await setup(lang, theme);
    const { JournalScreen } = t.req('lib/screens/JournalScreen');
    const growth = { level: 12, xp: 500, xpInLevel: 10, xpToNext: 30, progress: 0.25, maxed: false, rank: { index: 1, name: 'Rank', nextAt: 20 },
      today: { xp: 6, cap: 50, bonus: 0, sources: [{ id: 'steps', label: 'Steps', xp: 12, max: 12, got: 6, done: false }, { id: 'sleep', label: 'Sleep', xp: 12, max: 12, got: 12, done: true }, { id: 'vitamins', label: 'Vit', xp: 2, max: 2, got: 0, done: false, optional: true }] } };
    const opened = [];
    const r = await t.mount(React.createElement(JournalScreen, { perf: t.perfs.empty, growth, plan: null, activities: {}, achievements: [{ id: 'a', done: true }, { id: 'b', done: false }], onOpen: (k) => opened.push(k) }));
    const s = t.strings(r).join('|');
    expect(s).toContain('12 lvl');
    expect(s).toContain('Rank');
    expect(t.byId(r, 'quest-steps').length).toBeGreaterThan(0);
    expect(t.byId(r, 'quest-vitamins').length).toBe(0);
    await t.press(r, 'journal-growth');
    await t.press(r, 'journal-achievements');
    await t.press(r, 'journal-log');
    expect(opened).toEqual(['growth', 'achievements', 'log']);
    clean(t, t.strings(r));
  });
});
