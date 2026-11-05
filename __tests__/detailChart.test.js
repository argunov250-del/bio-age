// Подробный экран метрики: график-область вверху (с данными и без) и совет «от Хирона» в обеих темах.
const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);
const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };

function load() {
  jest.resetModules();
  class Value {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate() { return this; }
    addListener() { return 'id'; }
    removeListener() {}
    stopAnimation() {}
  }
  const anim = () => ({ start: (cb) => { if (cb) cb({ finished: true }); }, stop() {} });
  const RN = {
    __esModule: true,
    View: host('View'), Text: host('Text'), ScrollView: host('ScrollView'), Pressable: host('Pressable'), Modal: host('Modal'),
    TextInput: host('TextInput'), Image: host('Image'), StatusBar: host('StatusBar'), RefreshControl: host('RefreshControl'),
    Animated: { Value, View: host('AView'), Text: host('AText'), ScrollView: host('AScroll'), createAnimatedComponent: (C) => C, timing: anim, spring: anim, loop: anim, sequence: anim, parallel: anim, stagger: anim, delay: anim, add: (a) => a, modulo: (a) => a, event: () => () => {} },
    Easing: new Proxy({}, { get: () => (...a) => (typeof a[0] === 'function' ? a[0] : (x) => x) }),
    StyleSheet: { create: (x) => x, flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}), hairlineWidth: 1, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'android', Version: 34, select: (o) => (o.android !== undefined ? o.android : o.default) },
    Dimensions: { get: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }), addEventListener: () => ({ remove() {} }) },
    useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
    PixelRatio: { get: () => 2, getFontScale: () => 1, roundToNearestPixel: (x) => x },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true), addEventListener: () => ({ remove() {} }) },
    BackHandler: { addEventListener: () => ({ remove() {} }) },
    Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) },
    LayoutAnimation: { configureNext() {}, Presets: {} },
    UIManager: { setLayoutAnimationEnabledExperimental() {} },
    Linking: { openURL: () => Promise.resolve() },
    Alert: { alert() {} },
    NativeModules: {},
  };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('react-native-svg', () => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : host(String(k))) }), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaProvider: host('SAP'), SafeAreaView: host('SAV'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, selectionAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('../lib/health', () => ({}));
  jest.doMock('../lib/appleHealth', () => ({ importedRecords: () => [], importedTypes: () => [] }));
  require('../lib/i18n').setLang('ru');
  return { TR: require('react-test-renderer') };
}

const texts = (n, out = []) => {
  if (n == null) return out;
  if (typeof n === 'string') { out.push(n); return out; }
  if (Array.isArray(n)) { n.forEach((c) => texts(c, out)); return out; }
  return texts(n.children, out);
};

async function render(el, TR) {
  let r;
  await TR.act(async () => { r = TR.create(el); });
  // Даём графику ширину, как это сделала бы раскладка.
  await TR.act(async () => {
    r.root.findAll((n) => typeof n.props.onLayout === 'function' && n.type === 'View').forEach((n) => n.props.onLayout({ nativeEvent: { layout: { width: 320 } } }));
  });
  return r;
}

const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const series = (n) => Array.from({ length: n }, (_, i) => ({ key: day(n - 1 - i), v: 6000 + (i % 5) * 700 }));
const DETAIL = (daily) => ({
  title: 'Активность', hero: { value: '8000' }, sections: [],
  chart: { kind: 'bar', daily, ref: { value: 8000, label: 'цель 8 000' } },
  improve: ['Добавить короткую прогулку'],
});

describe.each(['light', 'dark'])('тема %s', (theme) => {
  test('график с данными: кривая, пунктир-ориентир с подписью, без «Нет данных»', async () => {
    const { TR } = load();
    const { ColorsContext } = require('../lib/colors');
    const { THEMES } = require('../lib/theme');
    const { DetailScreen } = require('../lib/screens/DetailScreen');
    const r = await render(React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, React.createElement(DetailScreen, { detail: DETAIL(series(60)), onBack() {} })), TR);
    const t = texts(r.toJSON()).join('|');
    expect(t).not.toContain('Нет данных');
    expect(t).toContain('цель 8 000');
    expect(r.root.findAll((n) => n.type === 'Path').length).toBeGreaterThanOrEqual(2);
    expect(r.root.findAll((n) => n.type === 'Line' && n.props.strokeDasharray).length).toBe(1);
    // график идёт раньше главного значения
    const all = texts(r.toJSON());
    expect(all.indexOf('цель 8 000')).toBeLessThan(all.indexOf('8'));
    await TR.act(async () => { r.unmount(); });
  });

  test('без данных: «Нет данных» и подсказка, графика нет', async () => {
    const { TR } = load();
    const { ColorsContext } = require('../lib/colors');
    const { THEMES } = require('../lib/theme');
    const { DetailScreen } = require('../lib/screens/DetailScreen');
    const empty = series(30).map((x) => ({ ...x, v: 0 }));
    for (const daily of [empty, series(30).map((x, i) => ({ ...x, v: i === 29 ? 5000 : 0 }))]) {
      const r = await render(React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, React.createElement(DetailScreen, { detail: DETAIL(daily), onBack() {} })), TR);
      const t = texts(r.toJSON()).join('|');
      expect(t).toContain('Нет данных');
      expect(t).toContain('график появится');
      expect(r.root.findAll((n) => n.type === 'Path').length).toBe(0);
      await TR.act(async () => { r.unmount(); });
    }
  });

  test('ChironTip: имя, аватар, текст, нажатие открывает чат', async () => {
    const { TR } = load();
    const { ColorsContext } = require('../lib/colors');
    const { THEMES } = require('../lib/theme');
    const { ChironTip } = require('../lib/ChironTip');
    const chiron = require('../lib/chiron');
    const open = jest.fn();
    chiron.setChironOpener(open);
    const r = await render(React.createElement(ColorsContext.Provider, { value: THEMES[theme] },
      React.createElement(ChironTip, { title: 'Сон', lead: 'Я бы начал с малого:' }, React.createElement('Text', null, 'Ложись раньше'))), TR);
    const t = texts(r.toJSON()).join('|');
    expect(t).toContain('Хирон');
    expect(t).toContain('Я бы начал с малого:');
    expect(t).toContain('Ложись раньше');
    expect(r.root.findAll((n) => n.type === 'Circle').length).toBeGreaterThan(0);
    await TR.act(async () => { r.root.findAll((n) => n.type === 'Pressable')[0].props.onPress(); });
    expect(open).toHaveBeenCalledTimes(1);
    chiron.setChironOpener(null);
    await TR.act(async () => { r.unmount(); });
  });
});
