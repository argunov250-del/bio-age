// Помощники анимации: пружины, нажатие, каскад, шторка — в том числе при «Убрать анимацию».
const React = require('react');
global.IS_REACT_ACT_ENVIRONMENT = true;

const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
function setup({ reduce }) {
  jest.resetModules();
  const calls = { spring: 0, timing: 0 };
  class Value {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate() { return this; }
  }
  const anim = (k) => () => { calls[k] += 1; return { start: (cb) => { if (cb) cb({ finished: true }); }, stop() {} }; };
  let pan;
  const RN = {
    __esModule: true,
    View: host('View'), Text: host('Text'), Pressable: host('Pressable'), Modal: host('Modal'),
    Animated: { Value, View: host('AView'), Text: host('AText'), createAnimatedComponent: (C) => C, spring: anim('spring'), timing: anim('timing') },
    Easing: { bezier: () => (x) => x, linear: (x) => x },
    StyleSheet: { absoluteFillObject: {} },
    Platform: { OS: 'ios', Version: 17 },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    PanResponder: { create: (cfg) => { pan = cfg; return { panHandlers: {} }; } },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(reduce), addEventListener: () => ({ remove() {} }) },
  };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('expo-haptics', () => ({ impactAsync: async () => {}, selectionAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  const motion = require('../lib/motion');
  return { motion, calls, getPan: () => pan, TR: require('react-test-renderer') };
}
const flushReduce = async () => { await Promise.resolve(); await Promise.resolve(); };

describe('motion helpers', () => {
  jest.spyOn(console, 'error').mockImplementation((...a) => { if (!/react-test-renderer is deprecated/.test(a.join(' '))) throw new Error(a.join(' ')); });

  test('presets and stagger delay', () => {
    const { motion } = setup({ reduce: false });
    expect(motion.SPRING.default).toEqual({ damping: 20, stiffness: 220, mass: 1 });
    expect(motion.staggerDelay(0, 50)).toBe(0);
    expect(motion.staggerDelay(3, 50)).toBe(150);
    expect(motion.staggerDelay(99, 50, 8)).toBe(400);
    expect(motion.sheetShouldClose(120, 0)).toBe(true);
    expect(motion.sheetShouldClose(10, 0.2)).toBe(false);
  });

  test('PressScale: press handlers fire, spring runs; none of it breaks when reduced', async () => {
    for (const reduce of [false, true]) {
      const { motion, calls, TR } = setup({ reduce });
      await flushReduce();
      const onPress = jest.fn();
      const onPressIn = jest.fn();
      let r;
      TR.act(() => { r = TR.create(React.createElement(motion.PressScale, { onPress, onPressIn }, React.createElement('Text'))); });
      const p = r.root.findByType('Pressable');
      TR.act(() => { p.props.onPressIn({}); p.props.onPressOut({}); p.props.onPress(); });
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPressIn).toHaveBeenCalledTimes(1);
      expect(calls.spring).toBe(reduce ? 0 : 2);
    }
  });

  test('Appear/Stagger render children; reduce motion starts no animation', async () => {
    const { motion, calls, TR } = setup({ reduce: true });
    await flushReduce();
    let r;
    TR.act(() => { r = TR.create(React.createElement(motion.Stagger, null, React.createElement('Text', { key: 'a' }), React.createElement('Text', { key: 'b' }))); });
    expect(r.root.findAllByType('Text')).toHaveLength(2);
    expect(calls.spring).toBe(0);
  });

  test('Sheet: backdrop tap and swipe-down close; short drag springs back', async () => {
    const { motion, calls, getPan, TR } = setup({ reduce: false });
    await flushReduce();
    const onClose = jest.fn();
    let r;
    TR.act(() => { r = TR.create(React.createElement(motion.Sheet, { onClose }, React.createElement('Text'))); });
    expect(calls.spring).toBeGreaterThan(0);
    TR.act(() => { r.root.findByType('Pressable').props.onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    TR.act(() => { r.root.findByType('Pressable').props.onPress(); }); // повтор не закрывает дважды
    expect(onClose).toHaveBeenCalledTimes(1);

    const second = jest.fn();
    TR.act(() => { r = TR.create(React.createElement(motion.Sheet, { onClose: second }, React.createElement('Text'))); });
    const pan = getPan();
    const springs = calls.spring;
    TR.act(() => { pan.onPanResponderRelease({}, { dy: 20, vy: 0.1 }); });
    expect(second).not.toHaveBeenCalled();
    expect(calls.spring).toBe(springs + 1);
    TR.act(() => { pan.onPanResponderRelease({}, { dy: 200, vy: 0.2 }); });
    expect(second).toHaveBeenCalledTimes(1);
  });

  test('Sheet closes instantly under reduce motion', async () => {
    const { motion, calls, TR } = setup({ reduce: true });
    await flushReduce();
    const onClose = jest.fn();
    let r;
    TR.act(() => { r = TR.create(React.createElement(motion.Sheet, { onClose }, React.createElement('Text'))); });
    expect(calls.spring).toBe(0);
    TR.act(() => { r.root.findByType('Pressable').props.onPress(); });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(calls.timing).toBe(0);
  });
});
