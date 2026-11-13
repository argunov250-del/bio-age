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

test('fixtures: full perf has recovery, strain, sleep; empty has none', async () => {
  const t = await setup('ru', 'light');
  expect(t.perfs.full.recovery).toBeTruthy();
  expect(t.perfs.full.strain.workouts.length).toBe(1);
  expect(t.perfs.full.sleep.tonight).toBeTruthy();
  expect(t.perfs.empty.recovery).toBeNull();
});

describe.each(COMBOS)('dials (%s, %s)', (lang, theme) => {
  test.each(['green', 'yellow', 'red'])('Dial: recovery zone %s', async (zone) => {
    const t = await setup(lang, theme);
    const { Dial } = t.req('lib/PerfDials');
    const { THEMES } = t.req('lib/theme');
    const pct = zone === 'green' ? 82 : zone === 'yellow' ? 50 : 20;
    const r = await t.mount(React.createElement(Dial, { id: 'z' + zone, label: 'L', value: pct, suffix: '%', color: t.req('lib/perfView').zoneColor(THEMES[theme], zone), status: 'S' }));
    const s = t.strings(r);
    expect(s.join('|')).toContain(String(pct));
    clean(t, s);
    // кольцо раскрашено цветом зоны
    expect(JSON.stringify(r.toJSON())).toContain(t.req('lib/perfView').zoneColor(THEMES[theme], zone));
  });
  test('Dial: null value shows a dash', async () => {
    const t = await setup(lang, theme);
    const { Dial } = t.req('lib/PerfDials');
    const r = await t.mount(React.createElement(Dial, { id: 'nul', label: 'L', value: null, suffix: '%', status: 'S' }));
    const s = t.strings(r);
    expect(s).toContain('—');
    clean(t, s);
  });
  test.each(['full', 'partial', 'empty'])('PerfDials: three dials and target line (%s)', async (kind) => {
    const t = await setup(lang, theme);
    const { PerfDials } = t.req('lib/PerfDials');
    const opened = [];
    const r = await t.mount(React.createElement(PerfDials, { perf: t.perfs[kind], onOpen: (k) => opened.push(k) }));
    const s = t.strings(r);
    for (const w of ['Восстановление', 'Нагрузка', 'Сон']) expect(s).toContain(t.tr(w));
    clean(t, s);
    if (kind === 'full') expect(s.join('|')).toContain(t.tr('Цель нагрузки на сегодня: '));
    const presses = r.root.findAll((n) => n.props && typeof n.props.onPress === 'function' && n.props.accessibilityLabel);
    const byLabel = new Map(presses.map((p) => [p.props.accessibilityLabel, p]));
    expect(byLabel.size).toBe(3);
    await t.TR.act(async () => { byLabel.forEach((p) => p.props.onPress()); });
    expect(opened.sort()).toEqual(['perf:recovery', 'perf:sleep', 'perf:strain']);
  });
  test('PerfDials: perf null does not throw', async () => {
    const t = await setup(lang, theme);
    const { PerfDials } = t.req('lib/PerfDials');
    const r = await t.mount(React.createElement(PerfDials, { perf: null }));
    clean(t, t.strings(r));
  });
});

describe.each(COMBOS)('detail screens (%s, %s)', (lang, theme) => {
  test.each([['RecoveryScreen'], ['StrainScreen'], ['SleepScreen']])('%s renders for full / partial / empty / null', async (name) => {
    const t = await setup(lang, theme);
    const Comp = t.req('lib/screens/' + name)[name];
    for (const kind of ['full', 'partial', 'empty', 'null']) {
      const r = await t.mount(React.createElement(Comp, { perf: kind === 'null' ? null : t.perfs[kind], onBack: () => {}, onOpen: () => {} }));
      const s = t.strings(r);
      expect(s.length).toBeGreaterThan(5);
      clean(t, s);
      await t.TR.act(async () => { r.unmount(); });
    }
  });
  test('RecoveryScreen full: drivers with baseline; empty: honest hint', async () => {
    const t = await setup(lang, theme);
    const { RecoveryScreen } = t.req('lib/screens/RecoveryScreen');
    const full = t.strings(await t.mount(React.createElement(RecoveryScreen, { perf: t.perfs.full }))).join('|');
    expect(full).toContain('HRV');
    expect(full).toContain(t.tr('Что повлияло'));
    expect(full).toContain(t.tr('обычно '));
    const empty = t.strings(await t.mount(React.createElement(RecoveryScreen, { perf: t.perfs.empty }))).join('|');
    expect(empty).toContain(t.tr('Нет сна за последние сутки: надень часы на ночь или запиши сон вручную.'));
  });
  test('SleepScreen full: bedtime targets and stages', async () => {
    const t = await setup(lang, theme);
    const { SleepScreen } = t.req('lib/screens/SleepScreen');
    const s = t.strings(await t.mount(React.createElement(SleepScreen, { perf: t.perfs.full }))).join('|');
    for (const k of ['100%', '85%', '70%']) expect(s).toContain(k);
    expect(s).toContain(t.tr('Глубокий'));
  });
  test('StrainScreen full: workout row with strain', async () => {
    const t = await setup(lang, theme);
    const { StrainScreen } = t.req('lib/screens/StrainScreen');
    const s = t.strings(await t.mount(React.createElement(StrainScreen, { perf: t.perfs.full }))).join('|');
    expect(s).toContain('Z1');
    expect(s).toContain(t.tr('Тренировки сегодня'));
  });
});

describe.each(COMBOS)('cards (%s, %s)', (lang, theme) => {
  test.each(['full', 'partial', 'empty', 'null'])('HealthMonitorCard + WeeklyCard (%s)', async (kind) => {
    const t = await setup(lang, theme);
    const { HealthMonitorCard, WeeklyCard } = t.req('lib/PerfCards');
    const perf = kind === 'null' ? null : t.perfs[kind];
    const s = t.strings(await t.mount(React.createElement(React.Fragment, null, React.createElement(HealthMonitorCard, { perf }), React.createElement(WeeklyCard, { perf })))).join('|');
    expect(s).toContain(t.tr('Монитор здоровья'));
    expect(s).toContain(t.tr('Итоги недели по форме'));
    clean(t, [s]);
    if (kind === 'full') expect(s).toMatch(new RegExp(t.tr('в норме') + '|' + t.tr('вне нормы')));
  });
  test('stress is hidden when absent and shown when present', async () => {
    const t = await setup(lang, theme);
    const { HealthMonitorCard } = t.req('lib/PerfCards');
    const base = t.perfs.full;
    const no = t.strings(await t.mount(React.createElement(HealthMonitorCard, { perf: { ...base, stress: null } }))).join('|');
    expect(no).not.toContain(t.tr('Стресс'));
    const yes = t.strings(await t.mount(React.createElement(HealthMonitorCard, { perf: { ...base, stress: { score: 1.4, level: 'medium' } } }))).join('|');
    expect(yes).toContain(t.tr('Стресс'));
  });
});

describe.each([['ru', 'light'], ['en', 'dark']])('HomeScreen (%s, %s)', (lang, theme) => {
  test.each(['full', 'empty'])('shows three dials above the body-age hero (%s)', async (kind) => {
    const t = await setup(lang, theme);
    const { HomeScreen } = t.req('lib/screens/HomeScreen');
    const r = await t.mount(React.createElement(HomeScreen, { result: null, profile: P, perf: t.perfs[kind], loading: false, error: '', onOpen: () => {}, onRefresh: () => {}, achievements: [], recap: null }));
    const s = t.strings(r);
    const j = s.join('|');
    for (const w of ['Восстановление', 'Нагрузка', 'Сон']) expect(j).toContain(t.tr(w));
    expect(j.indexOf(t.tr('Нагрузка'))).toBeLessThan(j.indexOf(t.tr('Подробнее')));
    expect(j).not.toContain(t.tr('Готовность'));
    clean(t, s);
  });
});
