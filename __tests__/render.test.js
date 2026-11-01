// Тест первого рендера: App → экран запуска → вкладки (Обзор, Метрики, Хирон, Тренировки, Профиль)
// при пустом хранилище и при сохранённых профиле/результате, на ru и en.
// В релизе исключение при первой отрисовке закрывает приложение, поэтому любое
// брошенное исключение и любой console.error (функция как child, порядок хуков,
// undefined-компонент) валят тест. react-native и нативные пакеты замоканы.
const React = require('react');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

const host = (name) => function Host(props) { return React.createElement(name, props, props.children); };
const hostProxy = () => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : typeof k === 'string' ? host(k) : undefined) });

function makeAnimated() {
  class Value {
    constructor(v) { this.v = v; }
    setValue(v) { this.v = v; }
    interpolate() { return this; }
    addListener() { return 'id'; }
    removeListener() {}
    removeAllListeners() {}
    stopAnimation(cb) { if (cb) cb(this.v); }
    setOffset() {} flattenOffset() {} extractOffset() {}
  }
  const anim = () => ({ start: (cb) => { if (cb) cb({ finished: true }); }, stop() {}, reset() {} });
  const A = {
    Value, ValueXY: Value,
    View: host('AnimatedView'), Text: host('AnimatedText'), Image: host('AnimatedImage'), ScrollView: host('AnimatedScrollView'),
    createAnimatedComponent: (C) => C,
    timing: anim, spring: anim, decay: anim, loop: anim, sequence: anim, parallel: anim, stagger: anim, delay: anim,
    add: (a) => a, subtract: (a) => a, multiply: (a) => a, divide: (a) => a, modulo: (a) => a, diffClamp: (a) => a,
    event: () => () => {},
  };
  return A;
}

function makeRN(lang) {
  const comps = {};
  for (const n of ['View', 'Text', 'ScrollView', 'Pressable', 'TextInput', 'Image', 'Modal', 'ActivityIndicator', 'KeyboardAvoidingView', 'StatusBar', 'RefreshControl', 'Switch', 'TouchableOpacity', 'SafeAreaView', 'FlatList']) comps[n] = host(n);
  const sub = () => ({ remove() {} });
  return {
    __esModule: true,
    ...comps,
    Animated: makeAnimated(),
    StyleSheet: { create: (s) => s, flatten: (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}), hairlineWidth: 1, absoluteFill: {}, absoluteFillObject: {} },
    Platform: { OS: 'android', Version: 34, select: (o) => (o.android !== undefined ? o.android : o.default) },
    Dimensions: { get: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }), addEventListener: sub },
    useWindowDimensions: () => ({ width: 400, height: 800, scale: 2, fontScale: 1 }),
    PixelRatio: { get: () => 2, getFontScale: () => 1, roundToNearestPixel: (x) => x },
    Easing: new Proxy({}, { get: () => (...a) => (typeof a[0] === 'function' ? a[0] : (x) => x) }),
    Linking: { openURL: () => Promise.resolve(), addEventListener: sub, getInitialURL: () => Promise.resolve(null) },
    Alert: { alert() {} },
    BackHandler: { addEventListener: sub },
    AppState: { currentState: 'active', addEventListener: sub },
    AccessibilityInfo: { isReduceMotionEnabled: () => Promise.resolve(false), addEventListener: sub },
    ToastAndroid: { show() {}, SHORT: 0, LONG: 1 },
    Keyboard: { dismiss() {}, addListener: sub },
    LayoutAnimation: { configureNext() {}, Presets: {} },
    UIManager: { setLayoutAnimationEnabledExperimental() {} },
    NativeModules: {},
    Vibration: { vibrate() {} },
    PanResponder: { create: () => ({ panHandlers: {} }) },
    I18nManager: { isRTL: false },
  };
}

const PROFILE = { birth: '1985-05-05', sex: 'f', showCycle: true, heightCm: 170, skipHC: false, notifyGoals: true };
const day = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
function makeDataset() {
  const now = new Date();
  const ds = { now, start: new Date(now.getTime() - 182 * 86400000), granted: new Set(), steps: {}, sleep: {}, hr: {}, rhr: {}, strength: {}, vo2: [], lbm: [], nights: {}, hrToday: [], lastHr: null, workouts: [], asleep: [], nightHr: {}, extra: {}, distance: {}, calories: {}, debug: {}, errors: {} };
  for (let i = 0; i < 60; i++) { ds.steps[day(i)] = 6000 + (i % 7) * 900; ds.rhr[day(i)] = 58 + (i % 5); }
  return ds;
}

async function runApp({ lang, stored }) {
  jest.resetModules();
  jest.useFakeTimers();
  const store = new Map();
  jest.resetModules();
  const mk = (name, factory) => jest.doMock(name, factory, { virtual: true });
  const RN = makeRN(lang);
  mk('react-native', () => RN);
  mk('react-native-svg', () => hostProxy());
  mk('react-native-safe-area-context', () => ({
    __esModule: true,
    SafeAreaProvider: host('SafeAreaProvider'), SafeAreaView: host('SafeAreaView'),
    useSafeAreaInsets: () => ({ top: 24, bottom: 16, left: 0, right: 0 }),
  }));
  mk('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: {
      getItem: async (k) => (store.has(k) ? store.get(k) : null), setItem: async (k, v) => { store.set(k, String(v)); },
      removeItem: async (k) => { store.delete(k); }, getAllKeys: async () => [...store.keys()], multiRemove: async () => {},
    },
  }));
  const HC = { SDK_AVAILABLE: 3 };
  mk('react-native-health-connect', () => ({
    __esModule: true,
    SdkAvailabilityStatus: { SDK_AVAILABLE: 3, SDK_UNAVAILABLE: 1, SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED: 2 },
    getSdkStatus: async () => HC.SDK_AVAILABLE, initialize: async () => true,
    requestPermission: async () => [],
    getGrantedPermissions: async () => [{ accessType: 'read', recordType: 'Steps' }],
    readRecords: async () => ({ records: [] }), aggregateGroupByDuration: async () => [], aggregateRecord: async () => ({}),
    openHealthConnectSettings: () => {},
  }));
  const asyncFn = (v) => async () => v;
  mk('expo-notifications', () => ({
    __esModule: true,
    getPermissionsAsync: asyncFn({ granted: false }), requestPermissionsAsync: asyncFn({ granted: false }),
    setNotificationChannelAsync: asyncFn(), scheduleNotificationAsync: asyncFn(), cancelAllScheduledNotificationsAsync: asyncFn(),
    cancelScheduledNotificationAsync: asyncFn(), getAllScheduledNotificationsAsync: asyncFn([]), setNotificationHandler() {},
    AndroidImportance: { DEFAULT: 3, HIGH: 4 }, SchedulableTriggerInputTypes: { DAILY: 'daily' },
  }));
  mk('expo-task-manager', () => ({ __esModule: true, defineTask() {}, isTaskRegisteredAsync: asyncFn(false) }));
  mk('expo-background-task', () => ({ __esModule: true, registerTaskAsync: asyncFn(), unregisterTaskAsync: asyncFn(), BackgroundTaskResult: { Success: 1, Failed: 2 } }));
  mk('expo-haptics', () => ({ __esModule: true, impactAsync: asyncFn(), notificationAsync: asyncFn(), selectionAsync: asyncFn(), ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }));
  mk('expo-location', () => ({ __esModule: true, requestForegroundPermissionsAsync: asyncFn({ granted: false }), getCurrentPositionAsync: asyncFn({}), Accuracy: {} }));
  for (const n of ['expo-document-picker', 'expo-file-system', 'expo-file-system/legacy', 'expo-sharing', 'react-native-view-shot']) mk(n, () => ({ __esModule: true, getDocumentAsync: asyncFn({ canceled: true }), isAvailableAsync: asyncFn(false), captureRef: asyncFn('') }));
  mk('fflate', () => ({ __esModule: true, unzipSync: () => ({}), strFromU8: () => '' }));
  // Свежие данные из Health Connect подменяем готовым набором, чтобы экраны рисовались с данными.
  jest.doMock(path.join(ROOT, 'lib/metrics'), () => {
    const real = jest.requireActual(path.join(ROOT, 'lib/metrics'));
    return { ...real, loadDataset: async () => makeDataset() };
  });

  const { compute } = require(path.join(ROOT, 'lib/compute'));
  if (stored) {
    store.set('profile.v1', JSON.stringify({ ...PROFILE, lang }));
    store.set('result.v2', JSON.stringify(compute(makeDataset(), PROFILE)));
  }
  const errors = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
  const TR = require('react-test-renderer');
  const { act } = TR;
  const i18n = require(path.join(ROOT, 'lib/i18n'));
  i18n.setLang(lang);
  const App = require(path.join(ROOT, 'App.js')).default;
  const { TabBar } = require(path.join(ROOT, 'lib/ui'));
  const { LaunchScreen } = require(path.join(ROOT, 'lib/screens/LaunchScreen'));

  const flush = async (ms = 3000) => { await act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); await Promise.resolve(); }); };
  let r;
  await act(async () => { r = TR.create(React.createElement(App)); });
  await flush(); await flush(); await flush();
  const collect = (n, out) => {
    if (n == null) return out;
    if (typeof n === 'string') { out.push(n); return out; }
    if (Array.isArray(n)) { n.forEach((c) => collect(c, out)); return out; }
    return collect(n.children, out);
  };
  const texts = () => {
    const t = collect(r.toJSON(), []).join(' | ');
    if (/Что-то пошло не так|Something went wrong/.test(t)) throw new Error('ErrorBoundary сработал: ' + t.slice(0, 300));
    return t;
  };
  const seen = {};
  const launch = r.root.findAll((n) => n.type === LaunchScreen);
  if (launch.length) { await act(async () => { launch[0].props.onReveal(); }); await flush(); }
  seen.start = texts();
  if (stored) {
    const bar = r.root.findAll((n) => n.type === TabBar)[0];
    if (!bar) throw new Error('TabBar не отрисован; экран: ' + seen.start.slice(0, 1500));
    for (const key of ['metrics', 'coach', 'workouts', 'profile', 'home']) {
      const b = r.root.findAll((n) => n.type === TabBar)[0];
      await act(async () => { b.props.onChange(key); });
      await flush(); await flush();
      seen[key] = texts();
    }
  }
  if (stored) {
    // Переключение языка и включение уведомлений: ремаунт по ключу, пересчёт, перепланирование.
    const { ProfileScreen } = require(path.join(ROOT, 'lib/screens/ProfileScreen'));
    await act(async () => { r.root.findAll((n) => n.type === TabBar)[0].props.onChange('profile'); });
    await flush();
    const ps = r.root.findAll((n) => n.type === ProfileScreen)[0];
    if (!ps) throw new Error('ProfileScreen не найден');
    const other = lang === 'ru' ? 'en' : 'ru';
    await act(async () => { await ps.props.onSettings({ lang: other }); });
    await flush(); await flush();
    seen.switched = texts();
    expect(seen.switched).toContain(other === 'en' ? 'Profile' : 'Профиль');
    for (const key of ['home', 'metrics', 'coach', 'workouts']) {
      await act(async () => { r.root.findAll((n) => n.type === TabBar)[0].props.onChange(key); });
      await flush();
      texts();
    }
    await act(async () => { await r.root.findAll((n) => n.type === TabBar)[0].props.onChange('profile'); });
    await flush();
    const ps2 = r.root.findAll((n) => n.type === ProfileScreen)[0];
    await act(async () => { await ps2.props.onSettings({ notifyGoals: true }); });
    await flush(); await flush();
    texts();
  }
  await act(async () => { r.unmount(); });
  spy.mockRestore();
  jest.useRealTimers();
  return { errors, seen };
}

const cases = [];
for (const lang of ['ru', 'en']) for (const stored of [false, true]) cases.push([lang, stored]);

describe.each(cases)('render lang=%s stored=%s', (lang, stored) => {
  test('первый рендер и вкладки без ошибок', async () => {
    const { errors, seen } = await runApp({ lang, stored });
    expect(errors).toEqual([]);
    if (process.env.DUMP) for (const k of Object.keys(seen)) console.log(lang, stored, k, seen[k].slice(0, 160));
    expect(seen.start.length).toBeGreaterThan(10);
    if (stored) {
      // Заголовки вкладок — строки (не функции) на нужном языке.
      const title = lang === 'ru' ? 'Метрики' : 'Metrics';
      expect(seen.home).toContain(title);
      expect(seen.profile).toBeTruthy();
    }
  });
});
