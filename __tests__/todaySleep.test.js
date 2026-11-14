// Экраны «Восстановление / Нагрузка / Сон», кольца на главной, монитор здоровья и итоги недели:
// светлая и тёмная темы, ru и en, полные / частичные / пустые данные; в тексте нет NaN и undefined.
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

async function setup(lang, theme) {
  jest.resetModules();
  const gp = require('./growthUiHarness');
  const rn = gp.makeRN(lang, host);
  rn.AccessibilityInfo.isReduceMotionEnabled = () => Promise.resolve(true); // без анимации: числа и кольца сразу на месте
  jest.doMock('react-native', () => rn, { virtual: true });
  jest.doMock('react-native-svg', () => gp.hostProxy(host), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } }), { virtual: true });
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
  const mount = async (el) => { let r; await TR.act(async () => { r = TR.create(wrap(el)); }); await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); }); return r; };
  const strings = (r) => {
    const out = [];
    const walk = (n) => { if (n == null) return; if (typeof n === 'string') { out.push(n); return; } if (Array.isArray(n)) { n.forEach(walk); return; } walk(n.children); };
    walk(r.toJSON());
    return out;
  };
  const perfs = {
    full: computePerf(build(20), {}, P, NOW),
    partial: computePerf(build(5, { hrv: false, workout: false }), {}, P, NOW),
    empty: computePerf({}, {}, P, NOW),
  };
  return { TR, errors, mount, strings, perfs, req: (m) => require(path.join(ROOT, m)), tr: require(path.join(ROOT, 'lib/i18n')).tr };
}


const COMBOS = [['ru', 'light'], ['ru', 'dark'], ['en', 'light'], ['en', 'dark']];
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
const clean = (t, strs) => {
  const all = strs.join('|');
  expect(all).not.toMatch(/NaN|undefined|Infinity|\[object/);
  expect(t.errors).toEqual([]);
  if (t.tr('Сон') === 'Sleep') expect(all).not.toMatch(/[А-Яа-яЁё]{4,}/);
};
const byId = (r, id) => r.root.findAll((n) => n.props && n.props.testID === id && typeof n.props.onPress === 'function')[0];
const has = (r, id) => r.root.findAll((n) => n.props && n.props.testID === id).length > 0;
const RES = { bio: 38, chrono: 40 };

describe.each(COMBOS)('Сегодня (%s, %s)', (lang, theme) => {
  test.each(['full', 'partial', 'empty', 'null'])('HomeScreen рисуется: %s', async (kind) => {
    const t = await setup(lang, theme);
    const { HomeScreen } = t.req('lib/screens/HomeScreen');
    const perf = kind === 'null' ? null : t.perfs[kind];
    const r = await t.mount(React.createElement(HomeScreen, { result: kind === 'null' ? null : RES, profile: P, perf, onOpen: () => {}, onRefresh: () => {}, achievements: [], growth: { level: 12, tier: { index: 1 } } }));
    const s = t.strings(r);
    clean(t, s);
    const all = s.join('|');
    expect(all).toContain(t.tr('Индекс самочувствия'));
    expect(all).toContain(t.tr('Восстановление'));
    expect(all).toContain(t.tr('Пульс покоя'));
    if (kind === 'full') {
      expect(all).toContain(t.tr('Прогноз энергии'));
      expect(all).toContain(t.tr('Ляжешь в '));
    }
    if (kind === 'empty') expect(all).toContain('—');
    expect(has(r, 'week-selector')).toBe(true);
    expect(has(r, 'chiron-card')).toBe(true);
    await t.TR.act(async () => { r.unmount(); });
  });

  test('подписи на герое ведут на экраны', async () => {
    const t = await setup(lang, theme);
    const { HomeScreen } = t.req('lib/screens/HomeScreen');
    const opened = [];
    const r = await t.mount(React.createElement(HomeScreen, { result: RES, profile: P, perf: t.perfs.full, onOpen: (k) => opened.push(k) }));
    await t.TR.act(async () => { byId(r, 'hotspot-recovery').props.onPress(); byId(r, 'hotspot-strain').props.onPress(); byId(r, 'hotspot-sleep').props.onPress(); });
    expect(opened).toEqual(['perf:recovery', 'perf:strain', 'perf:sleep']);
    clean(t, t.strings(r));
  });

  test('Хирон: открывает чат', async () => {
    const t = await setup(lang, theme);
    const { HomeScreen } = t.req('lib/screens/HomeScreen');
    const opened = [];
    const r = await t.mount(React.createElement(HomeScreen, { result: RES, profile: P, perf: t.perfs.full, onOpen: (k) => opened.push(k) }));
    await t.TR.act(async () => { byId(r, 'chiron-card').props.onPress(); });
    expect(opened).toEqual(['coach']);
  });

  test('выбор дня недели переключает показанный день (с пересчётом и без dataset)', async () => {
    for (const dataset of [build(20), undefined]) {
      const t = await setup(lang, theme);
      const { HomeScreen } = t.req('lib/screens/HomeScreen');
      const r = await t.mount(React.createElement(HomeScreen, { result: RES, profile: P, perf: t.perfs.full, dataset, onOpen: () => {} }));
      expect(has(r, 'forecast-card')).toBe(true);
      expect(has(r, 'back-today')).toBe(false);
      const prev = keyAt(-1);
      await t.TR.act(async () => { byId(r, 'day-' + prev).props.onPress(); });
      expect(has(r, 'back-today')).toBe(true);
      expect(has(r, 'forecast-card')).toBe(false);
      clean(t, t.strings(r));
      await t.TR.act(async () => { byId(r, 'back-today').props.onPress(); });
      expect(has(r, 'forecast-card')).toBe(true);
      await t.TR.act(async () => { r.unmount(); });
    }
  });
});

describe.each(COMBOS)('Сон (%s, %s)', (lang, theme) => {
  test.each(['full', 'partial', 'empty', 'null'])('SleepScreen вкладкой: %s', async (kind) => {
    const t = await setup(lang, theme);
    const { SleepScreen } = t.req('lib/screens/SleepScreen');
    const opened = [];
    const r = await t.mount(React.createElement(SleepScreen, { perf: kind === 'null' ? null : t.perfs[kind], profile: { ...P, sleepPlan: { on: true, bed: '23:00', wake: '07:00' } }, onOpen: (k) => opened.push(k) }));
    const s = t.strings(r);
    clean(t, s);
    const all = s.join('|');
    expect(all).toContain(t.tr('Режим сна'));
    expect(has(r, 'sleep-chiron')).toBe(true);
    if (kind === 'full') {
      for (const k of ['100%', '85%', '70%']) expect(all).toContain(k);
      expect(all).toContain(t.tr('Сон за 14 дней'));
      expect(all).toContain('23:00–07:00');
    }
    await t.TR.act(async () => { byId(r, 'sleep-schedule').props.onPress(); });
    expect(opened).toEqual(['sleep']);
  });
  test('SleepScreen поверх вкладок: кнопка «назад»', async () => {
    const t = await setup(lang, theme);
    const { SleepScreen } = t.req('lib/screens/SleepScreen');
    let back = 0;
    const r = await t.mount(React.createElement(SleepScreen, { perf: t.perfs.full, onBack: () => { back++; }, onOpen: () => {} }));
    await t.TR.act(async () => { byId(r, 'sleep-back').props.onPress(); });
    expect(back).toBe(1);
    clean(t, t.strings(r));
  });
});
