// Стеклянный набор: рисуется с модулем expo-blur и без него (не падает), на Android цель размытия
// обязательна, облегчённый режим отключает размытие; панель вкладок — 5 подписей на двух языках.
const React = require('react');
const path = require('path');
const { makeRN, hostProxy } = require('./growthUiHarness');
const ROOT = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;

const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };

function setup({ blur, os = 'android', lite = false }) {
  jest.resetModules();
  const RN = makeRN('ru', host);
  RN.Platform = { OS: os, Version: 34, select: (o) => (o[os] !== undefined ? o[os] : o.default) };
  jest.doMock('react-native', () => RN, { virtual: true });
  jest.doMock('react-native-svg', () => hostProxy(host), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }) }), { virtual: true });
  if (blur) jest.doMock('expo-blur', () => ({ __esModule: true, BlurView: host('BlurView'), BlurTargetView: host('BlurTargetView') }), { virtual: true });
  else jest.doMock('expo-blur', () => { throw new Error('Cannot find module expo-blur'); }, { virtual: true });
  const kit = require(path.join(ROOT, 'lib/glassKit'));
  require(path.join(ROOT, 'lib/perf')).setLite(lite);
  kit.resetBlurCache();
  return { kit, TR: require('react-test-renderer'), C: require(path.join(ROOT, 'lib/colors')), T: require(path.join(ROOT, 'lib/theme')), RN };
}
const blurs = (r) => r.root.findAll((n) => n.type === 'BlurView').length;
const mount = async (TR, el) => { let r; await TR.act(async () => { r = TR.create(el); }); return r; };

describe('glassKit', () => {
  test.each(['light', 'dark'])('все компоненты рисуются без expo-blur (%s)', async (theme) => {
    const { kit, TR, C, T } = setup({ blur: false });
    expect(kit.hasBlur()).toBe(false);
    const c = T.THEMES[theme];
    const { GlassCard, GlassPill, GlassIconButton, GlassTile, GlassView, EdgeBlur, GlassScreen, BlurTargetHost } = kit;
    const r = await mount(TR, React.createElement(C.ColorsContext.Provider, { value: c },
      React.createElement(BlurTargetHost, null,
        React.createElement(GlassScreen, { tab: true, title: 'T' },
          React.createElement(GlassCard, { onPress() {} }, React.createElement('Text', null, 'card')),
          React.createElement(GlassPill, { label: 'pill' }),
          React.createElement(GlassIconButton, { onPress() {} }, React.createElement('Text', null, 'i')),
          React.createElement(GlassTile, { label: 'HRV', value: 52, unit: 'ms' }),
          React.createElement(GlassView, null, React.createElement('Text', null, 'v')),
          React.createElement(EdgeBlur, { edge: 'bottom' })))));
    expect(blurs(r)).toBe(0);
    expect(JSON.stringify(r.toJSON())).toContain('card');
    await TR.act(async () => { r.unmount(); });
  });

  test('с expo-blur на Android: BlurView получает blurTarget и метод API 31+', async () => {
    const { kit, TR, C, T } = setup({ blur: true });
    expect(kit.hasBlur()).toBe(true);
    const r = await mount(TR, React.createElement(C.ColorsContext.Provider, { value: T.THEMES.dark },
      React.createElement(kit.BlurTargetHost, null, React.createElement(kit.GlassCard, null, React.createElement('Text', null, 'x')))));
    const bv = r.root.findAll((n) => n.type === 'BlurView');
    expect(bv.length).toBeGreaterThan(0);
    expect(bv[0].props.blurMethod).toBe('dimezisBlurViewSdk31Plus');
    expect(bv[0].props.blurTarget).toBeTruthy();
    expect(bv[0].props.tint).toBe('dark');
    await TR.act(async () => { r.unmount(); });
  });

  test('Android без цели размытия и облегчённый режим — без BlurView; iOS — BlurView без цели', async () => {
    let s = setup({ blur: true });
    let r = await mount(s.TR, React.createElement(s.C.ColorsContext.Provider, { value: s.T.THEMES.light }, React.createElement(s.kit.GlassCard, null, React.createElement('Text', null, 'x'))));
    expect(blurs(r)).toBe(0); // нет BlurTargetHost
    s = setup({ blur: true, lite: true });
    r = await mount(s.TR, React.createElement(s.C.ColorsContext.Provider, { value: s.T.THEMES.light }, React.createElement(s.kit.BlurTargetHost, null, React.createElement(s.kit.GlassCard, null, React.createElement('Text', null, 'x')))));
    expect(blurs(r)).toBe(0);
    s = setup({ blur: true, os: 'ios' });
    r = await mount(s.TR, React.createElement(s.C.ColorsContext.Provider, { value: s.T.THEMES.light }, React.createElement(s.kit.GlassCard, null, React.createElement('Text', null, 'x'))));
    expect(blurs(r)).toBeGreaterThan(0);
  });

  test('EdgeBlur: верх и низ, касания не перехватывает; glassSheetStyle берёт токены темы', async () => {
    const { kit, TR, C, T } = setup({ blur: true });
    const r = await mount(TR, React.createElement(C.ColorsContext.Provider, { value: T.THEMES.dark },
      React.createElement(kit.BlurTargetHost, null, React.createElement(kit.EdgeBlur, { edge: 'top' }), React.createElement(kit.EdgeBlur, { edge: 'bottom' }))));
    const edges = r.root.findAll((n) => typeof n.props.testID === 'string' && n.props.testID.startsWith('edge-blur-') && n.props.pointerEvents === 'none');
    expect(edges.length).toBeGreaterThanOrEqual(2);
    expect(blurs(r)).toBeGreaterThan(0);
    expect(kit.glassSheetStyle(T.THEMES.dark).backgroundColor).toBe(T.THEMES.dark.glass.sheet);
    expect(T.THEMES.light.glass.fill).not.toBe(T.THEMES.dark.glass.fill);
    expect(T.THEMES.dark.accents.sleep).toBe('#8B5CF6');
  });

  test.each(['ru', 'en'])('панель вкладок: 5 подписей (%s), смена вкладки', async (lang) => {
    const { TR, C, T } = setup({ blur: true });
    const { GlassTabBar } = require(path.join(ROOT, 'lib/GlassTabBar'));
    const { BlurTargetHost } = require(path.join(ROOT, 'lib/glassKit'));
    const icons = require(path.join(ROOT, 'lib/icons'));
    const RU = lang === 'ru';
    const tabs = [
      { key: 'today', title: RU ? 'Сегодня' : 'Today', Icon: icons.IconToday }, { key: 'sleep', title: RU ? 'Сон' : 'Sleep', Icon: icons.IconSleep },
      { key: 'strain', title: RU ? 'Нагрузка' : 'Strain', Icon: icons.IconStrain }, { key: 'trends', title: RU ? 'Тренды' : 'Trends', Icon: icons.IconTrends },
      { key: 'journal', title: RU ? 'Журнал' : 'Journal', Icon: icons.IconJournal },
    ];
    const picked = [];
    const r = await mount(TR, React.createElement(C.ColorsContext.Provider, { value: T.THEMES.dark },
      React.createElement(BlurTargetHost, null, React.createElement(GlassTabBar, { tabs, active: 'today', onChange: (k) => picked.push(k), bottom: 16 }))));
    const labels = r.root.findAll((n) => n.type === 'Text' && tabs.some((t) => t.title === n.props.children)).map((n) => n.props.children);
    expect(labels).toEqual(tabs.map((t) => t.title));
    const btn = r.root.findAll((n) => n.props.testID === 'tab-journal' && typeof n.props.onPress === 'function')[0];
    await TR.act(async () => { btn.props.onPress(); });
    expect(picked).toEqual(['journal']);
  });
});
