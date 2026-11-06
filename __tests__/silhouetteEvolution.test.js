// Превью эволюции фигуры: ступени 0…8 в обеих темах, без снапшотов — только бюджеты.
const React = require('react');
const TR = require('react-test-renderer');
global.IS_REACT_ACT_ENVIRONMENT = true;

const mockHost = (name) => function Host(props) { return React.createElement(name, props, props.children); };
let mockDark = false;

jest.mock('react-native', () => {
  const R = require('react');
  const h = (name) => function Host(props) { return R.createElement(name, props, props.children); };
  class Value { constructor(v) { this.v = v; } interpolate() { return this; } }
  const anim = () => ({ start() {}, stop() {} });
  return {
    __esModule: true,
    View: h('View'), Pressable: h('Pressable'), Text: h('Text'), Modal: h('Modal'), PanResponder: { create: () => ({ panHandlers: {} }) },
    Dimensions: { get: () => ({ width: 400, height: 800 }) },
    StyleSheet: { create: (s) => s, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'ios', Version: 17 },
    Easing: new Proxy({}, { get: () => () => (x) => x }),
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: () => ({ remove() {} }) },
    Animated: { createAnimatedComponent: (C) => C, Value, View: h('AnimatedView'), timing: anim, loop: anim, add: (a) => a, modulo: (a) => a },
  };
}, { virtual: true });
jest.mock('react-native-svg', () => new Proxy({ __esModule: true }, {
  get: (t, k) => (k === '__esModule' ? true : k === 'default' ? mockHost('Svg') : typeof k === 'string' ? mockHost(k) : undefined),
}), { virtual: true });
jest.mock('../lib/colors', () => ({ useColors: () => ({ dark: mockDark, accent: '#2BB673' }) }));
jest.mock('expo-haptics', () => ({ impactAsync: async () => {}, selectionAsync: async () => {}, notificationAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });

const { Silhouette } = require('../lib/Silhouette');
const { setLite } = require('../lib/perf');
const { evoParams } = require('../lib/figureEvolution');

const count = (r, type) => r.root.findAll((n) => n.type === type).length;
const mount = async (props) => { let r; await TR.act(async () => { r = TR.create(React.createElement(Silhouette, props)); }); return r; };

describe('Silhouette evolution', () => {
  afterEach(() => setLite(false));
  for (const dark of [false, true]) {
    for (let t = 0; t <= 8; t++) {
      it(`tier ${t} ${dark ? 'dark' : 'light'} stays within budget`, async () => {
        mockDark = dark;
        for (const lite of [false, true]) {
          setLite(lite);
          const r = await mount({ height: 220, tier: t, level: t * 11, still: true });
          expect(count(r, 'Circle')).toBeLessThanOrEqual(520);
          expect(count(r, 'Line') + count(r, 'Path')).toBeLessThanOrEqual(80);
          await TR.act(async () => { r.unmount(); });
        }
        setLite(false);
        const m = await mount({ height: 80, tier: t, mini: true, still: true });
        expect(count(m, 'Circle')).toBeLessThanOrEqual(520);
        await TR.act(async () => { m.unmount(); });
      });
    }
  }
  it('adds structure with tier; tier 0 has none', async () => {
    mockDark = false;
    const r0 = await mount({ height: 220, tier: 0, still: true });
    const r2 = await mount({ height: 220, tier: 2, still: true });
    const r8 = await mount({ height: 220, tier: 8, still: true });
    expect(count(r0, 'Line')).toBe(0);
    expect(count(r2, 'Line')).toBeGreaterThan(0);
    expect(count(r8, 'Line')).toBeGreaterThan(10);
    expect(evoParams(0).constN).toBe(0);
    expect(evoParams(8).constN).toBe(14);
    expect(evoParams(2, 12).posture).toBeGreaterThan(evoParams(2).posture);
  });
});
