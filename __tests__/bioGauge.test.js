// BioGauge при «Убрать анимацию»: сразу итоговое состояние (дуга целиком до значения), без анимаций.
const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;
const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };

test('gauge renders final arc values under reduceMotion', async () => {
  jest.resetModules();
  const calls = { spring: 0, timing: 0 };
  class Value {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate(cfg) { const self = this; return { get v() { return self.v; }, cfg }; }
  }
  const anim = (k) => () => { calls[k] += 1; return { start() {}, stop() {} }; };
  const RN = {
    __esModule: true,
    View: host('View'), Text: host('Text'), Pressable: host('Pressable'), Modal: host('Modal'),
    Animated: { Value, View: host('AView'), Text: host('AText'), createAnimatedComponent: (C) => C, spring: anim('spring'), timing: anim('timing'), loop: anim('timing') },
    Easing: { bezier: () => (x) => x, linear: (x) => x },
    StyleSheet: { create: (x) => x, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'ios', Version: 17 },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(true), addEventListener: () => ({ remove() {} }) },
  };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('react-native-svg', () => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : host(String(k))) }), { virtual: true });
  jest.doMock('expo-haptics', () => ({}), { virtual: true });
  jest.doMock('../lib/MorphBlob', () => ({ MorphBlob: host('Blob') }));
  jest.doMock('../lib/Silhouette', () => ({ Silhouette: host('Sil') }));
  jest.doMock('../lib/colors', () => ({ useColors: () => ({ dark: false, accent: '#0a0', text: '#000', sub: '#666', card: '#fff', cardAlt: '#eee' }) }));
  const TR = require('react-test-renderer');
  require('../lib/motion');
  await Promise.resolve(); await Promise.resolve();
  const { BioGauge } = require('../lib/BioGauge');
  let r;
  TR.act(() => { r = TR.create(React.createElement(BioGauge, { value: 30, chrono: 40, text: '30', tier: 0 })); });
  const circles = r.root.findAllByType('Circle').filter((n) => n.props.strokeDashoffset && n.props.strokeDashoffset.cfg);
  expect(circles).toHaveLength(3);
  // fill = (40 + 15 - 30) / 25 = 1
  circles.forEach((n) => expect(n.props.strokeDashoffset.v).toBeCloseTo(1, 5));
  expect(calls.spring + calls.timing).toBe(0);
});
