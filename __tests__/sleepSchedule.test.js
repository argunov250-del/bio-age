// Экран «Режим сна»: рисуется в обеих темах и на ru/en, колёса и дуга работают, правки сохраняются.
const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
const origError = console.error;
beforeAll(() => { console.error = (...a) => { if (!/react-test-renderer is deprecated/.test(String(a[0]))) origError(...a); }; });
afterAll(() => { console.error = origError; });
const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };

const PALETTES = {
  light: { dark: false, accent: '#0a0', primary: '#111', onPrimary: '#fff', text: '#000', sub: '#666', card: '#fff', cardAlt: '#eee', line: '#ddd', bg: '#fff', border: 0, shadow: {} },
  dark: { dark: true, accent: '#3f9', primary: '#eee', onPrimary: '#000', text: '#fff', sub: '#999', card: '#222', cardAlt: '#333', line: '#444', bg: '#000', border: 1, shadow: {} },
};

function load(theme, lang) {
  jest.resetModules();
  jest.useFakeTimers();
  class Value { constructor(v) { this.v = v; } setValue(v) { this.v = v; } interpolate() { return this; } }
  const RN = {
    __esModule: true,
    View: host('View'), Text: host('Text'), Pressable: host('Pressable'), ScrollView: host('ScrollView'),
    Animated: { Value, View: host('AView'), Text: host('AText'), ScrollView: host('AScrollView'), event: () => () => {}, createAnimatedComponent: (C) => C, spring: () => ({ start() {}, stop() {} }), timing: () => ({ start() {}, stop() {} }), loop: () => ({ start() {}, stop() {} }) },
    Easing: { bezier: () => (x) => x, linear: (x) => x },
    StyleSheet: { create: (x) => x, flatten: (x) => x, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'android', Version: 34 },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) },
  };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('react-native-svg', () => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : host(String(k))) }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ selectionAsync: async () => {}, impactAsync: async () => {}, notificationAsync: async () => {} }), { virtual: true });
  jest.doMock('expo-notifications', () => ({}), { virtual: true });
  jest.doMock('../lib/channels', () => ({ REMINDERS_CHANNEL: 'r', ensureChannels: async () => {} }));
  jest.doMock('../lib/colors', () => ({ useColors: () => PALETTES[theme] }));
  jest.doMock('../lib/ui', () => ({
    fit: require('../lib/fit').fit,
    Screen: ({ title, children }) => React.createElement('Screen', { title }, children),
    Card: host('Card'), Section: host('Section'), Note: host('Note'),
    SwitchRow: ({ label, value, onChange }) => React.createElement('SwitchRow', { label, value, onChange }),
    Segmented: ({ options, value, onChange }) => React.createElement('Segmented', { options, value, onChange }),
  }));
  const i18n = require('../lib/i18n');
  i18n.setLang(lang);
  return { TR: require('react-test-renderer'), S: require('../lib/screens/SleepScheduleScreen'), D: require('../lib/SleepDial'), W: require('../lib/TimeWheel') };
}

const at = (d, h, m) => new Date(2026, 5, d, h, m).getTime();
const ds = { nights: { a: { start: at(1, 23, 10), end: at(2, 7, 0) }, b: { start: at(2, 23, 20), end: at(3, 7, 10) }, c: { start: at(3, 12, 0), end: at(3, 13, 0) } } };
const texts = (r) => r.root.findAllByType('Text').map((t) => [].concat(t.props.children).join(''));

for (const theme of ['light', 'dark']) {
  for (const lang of ['ru', 'en']) {
    test(`экран «Режим сна» рисуется: ${theme}/${lang}, подписи не рвутся (fit)`, () => {
      const { TR, S } = load(theme, lang);
      const errors = jest.spyOn(console, 'error').mockImplementation((...a) => { if (/react-test-renderer is deprecated/.test(String(a[0]))) return; throw new Error(a.map(String).join(' ')); });
      let r;
      TR.act(() => { r = TR.create(React.createElement(S.SleepScheduleScreen, { profile: { remindSleep: true }, dataset: ds, norm: 7.5, onSave() {}, onSettings() {}, onBack() {} })); });
      errors.mockRestore();
      const all = texts(r).join('|');
      expect(all).toContain('23:15'); // авто: медиана ночей без дневного сна
      for (const t of r.root.findAllByType('Text')) expect(t.props.numberOfLines).toBeGreaterThan(0);
      expect(r.root.findAllByType('Path').length).toBe(1); // дуга сна
      TR.act(() => { r.unmount(); });
    });
  }
}

test('дуга: флаг большой дуги зависит от длины (>12 ч)', () => {
  const { D } = load('light', 'ru');
  expect(D.arcPath(100, 100, 50, 22 * 60, 6 * 60)).toMatch(/ 0 0 1 /);
  expect(D.arcPath(100, 100, 50, 6 * 60, 22 * 60)).toMatch(/ 0 1 1 /);
  expect(D.arcPath(100, 100, 50, 60, 60)).toBeNull();
});

test('колесо: доступность (+/−5 минут через полночь) и подпись значения', () => {
  const { TR, W } = load('light', 'ru');
  const seen = [];
  let r;
  TR.act(() => { r = TR.create(React.createElement(W.TimeWheel, { value: 23 * 60 + 55, label: 'Отбой', onChange: (v) => seen.push(v) })); });
  const w = r.root.findAll((n) => n.props.accessibilityRole === 'adjustable')[0];
  expect(w.props.accessibilityValue.text).toBe('23:55');
  w.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
  w.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
  expect(seen).toEqual([0, 23 * 60 + 50]);
});

test('ручной режим и напоминания сохраняются через полсекунды: время, mode, remindBefore', () => {
  const { TR, S } = load('dark', 'ru');
  const saved = [];
  let r;
  TR.act(() => { r = TR.create(React.createElement(S.SleepScheduleScreen, { profile: { remindSleep: true }, dataset: ds, norm: null, onSave: (p) => saved.push(p), onSettings() {}, onBack() {} })); });
  TR.act(() => { r.root.findAllByType('SwitchRow').find((x) => x.props.label === 'Автоматически по моим данным').props.onChange(false); });
  TR.act(() => { r.root.findAllByType('Segmented')[0].props.onChange(60); });
  TR.act(() => { jest.advanceTimersByTime(600); });
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ mode: 'manual', bed: '23:15', wake: '07:05', remindBefore: 60, remindWake: false, on: false });
  TR.act(() => { r.unmount(); });
});

test('normLine: цель против личной нормы', () => {
  const { S } = load('light', 'ru');
  expect(S.normLine(8, 7.5)).toContain('длиннее на 30');
  expect(S.normLine(7, 7.5)).toContain('короче на 30');
  expect(S.normLine(7.5, 7.5)).toContain('почти совпадает');
  expect(S.normLine(7.5, null)).toContain('7–9');
});

test('useSmoothMin: по кратчайшему пути через полночь, в конце ровно цель', () => {
  const { TR, D } = load('light', 'ru');
  const seen = [];
  function Probe({ m }) { const v = D.useSmoothMin(m); seen.push(v); return null; }
  let r;
  TR.act(() => { r = TR.create(React.createElement(Probe, { m: 23 * 60 + 50 })); });
  TR.act(() => { r.update(React.createElement(Probe, { m: 10 })); });
  for (let i = 0; i < 80; i++) TR.act(() => { jest.advanceTimersByTime(16); });
  expect(seen[seen.length - 1]).toBe(10);
  // промежуточные значения идут через 24:00 (≥1430 или <60), а не через полдень
  const mid = seen.slice(1, -1).map((x) => ((x % 1440) + 1440) % 1440);
  expect(mid.length).toBeGreaterThan(3);
  expect(mid.every((x) => x >= 1420 || x <= 40)).toBe(true);
});
