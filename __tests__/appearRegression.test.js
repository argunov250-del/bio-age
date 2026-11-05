// Регрессия «страницы не грузятся»: после монтирования и прогона таймеров всё, что
// появляется (Appear, Stagger, FadeIn), обязано оказаться полностью видимым — в том числе
// при перемонтировании, повторных рендерах родителя и «Убрать анимацию».
const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;

const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
function setup({ reduce }) {
  jest.resetModules();
  class Value {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate() { return this; }
  }
  const timing = (v, cfg) => {
    let t;
    return {
      start: (cb) => { t = setTimeout(() => { v.v = cfg.toValue; if (cb) cb({ finished: true }); }, (cfg.delay || 0) + cfg.duration); },
      stop: () => clearTimeout(t),
    };
  };
  const RN = {
    __esModule: true,
    View: host('View'), Text: host('Text'), TextInput: host('TextInput'), Switch: host('Switch'), ScrollView: host('ScrollView'),
    Pressable: host('Pressable'), Modal: host('Modal'), RefreshControl: host('RefreshControl'),
    Animated: { Value, View: host('AView'), Text: host('AText'), createAnimatedComponent: (C) => C, spring: timing, timing, loop: (a) => a },
    Easing: { bezier: () => (x) => x, linear: (x) => x, inOut: () => (x) => x, out: () => (x) => x, cubic: (x) => x },
    StyleSheet: { absoluteFillObject: {}, create: (x) => x, flatten: (x) => x, hairlineWidth: 1 },
    Platform: { OS: 'android', Version: 33, select: (o) => o.android },
    Keyboard: { addListener: () => ({ remove() {} }) },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(reduce), addEventListener: () => ({ remove() {} }) },
  };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ SafeAreaView: host('View'), useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ impactAsync: async () => {}, selectionAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('../lib/icons', () => ({ IconChiron: host('Icon') }));
  return { motion: require('../lib/motion'), ui: require('../lib/ui'), TR: require('react-test-renderer') };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const animated = (root) => root.findAll((n) => n.type === 'AView');
// Анимированная величина каждой обёртки: opacity (если есть) и translateY — всё должно быть = 1.
const values = (root) => animated(root).flatMap((n) => {
  const st = [].concat(n.props.style).flat(3).filter(Boolean);
  const out = [];
  st.forEach((x) => {
    if (x.opacity && typeof x.opacity === 'object') out.push(x.opacity.v);
    if (x.transform) x.transform.forEach((t) => { if (t.translateY && typeof t.translateY === 'object') out.push(t.translateY.v); });
  });
  return out;
});

describe('появление всегда заканчивается полной видимостью', () => {
  jest.spyOn(console, 'error').mockImplementation((...a) => { if (!/react-test-renderer is deprecated/.test(a.join(' '))) throw new Error(a.join(' ')); });
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const tree = (m, ui, k) => React.createElement(ui.FadeIn, { key: k },
    React.createElement(m.Stagger, null, React.createElement('View', { key: 'a' }), React.createElement('View', { key: 'b' })),
    React.createElement(m.Appear, { delay: 100 }, React.createElement('View')));

  test.each([false, true])('reduce=%s: после таймеров всё = 1, при перерисовках и смене вкладки', async (reduce) => {
    const { motion, ui, TR } = setup({ reduce });
    await flush();
    let r;
    TR.act(() => { r = TR.create(tree(motion, ui, 'home')); });
    if (reduce) expect(values(r.root).every((v) => v === 1)).toBe(true); // сразу
    // Родитель перерисовывается посреди анимации (приход данных) — раньше это обрывало её.
    TR.act(() => { jest.advanceTimersByTime(80); });
    TR.act(() => { r.update(tree(motion, ui, 'home')); });
    TR.act(() => { jest.advanceTimersByTime(400); });
    expect(values(r.root).length).toBeGreaterThan(0);
    expect(values(r.root).every((v) => v === 1)).toBe(true);
    // Переключение вкладок туда-обратно: перемонтирование по key.
    ['metrics', 'home'].forEach((k) => {
      TR.act(() => { r.update(tree(motion, ui, k)); });
      TR.act(() => { jest.advanceTimersByTime(400); });
      expect(values(r.root).every((v) => v === 1)).toBe(true);
    });
  });
});
