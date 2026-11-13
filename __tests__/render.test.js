// На CI первая полная отрисовка приложения иногда дольше 5 с.
jest.setTimeout(20000);

// Тест первого рендера: App → экран запуска → вкладки (Обзор, Метрики, Хирон, Рост, Профиль)
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

async function runApp({ lang, stored, theme }) {
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
    store.set('profile.v1', JSON.stringify({ ...PROFILE, lang, ...(theme ? { theme } : null) }));
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
  const seen = { backdrops: [], bare: {} };
  const { SurfaceContext: SurfCtx } = require(path.join(ROOT, 'lib/colors'));
  const barePhoto = () => barePhotoText(r.root, SurfCtx, require(path.join(ROOT, 'lib/theme')).THEMES.light);
  const backdropCount = () => r.root.findAll((n) => n.props && n.props.testID === 'photo-backdrop' && typeof n.type === 'string').length;
  seen.backdrops.push(backdropCount());
  const launch = r.root.findAll((n) => n.type === LaunchScreen);
  if (launch.length) { await act(async () => { launch[0].props.onReveal(); }); await flush(); }
  seen.start = texts();
  if (stored) {
    const bar = r.root.findAll((n) => n.type === TabBar)[0];
    if (!bar) throw new Error('TabBar не отрисован; экран: ' + seen.start.slice(0, 1500));
    for (const key of ['metrics', 'coach', 'growth', 'profile', 'home']) {
      const b = r.root.findAll((n) => n.type === TabBar)[0];
      await act(async () => { b.props.onChange(key); });
      await flush(); await flush();
      seen[key] = texts();
      seen.backdrops.push(backdropCount());
      if (theme !== 'dark') seen.bare[key] = barePhoto();
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
    for (const key of ['home', 'metrics', 'coach', 'growth']) {
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

// Обе темы: светлая (по умолчанию) и тёмная рисуют все вкладки без ошибок; переключение в профиле — на лету.
describe.each(['light', 'dark'])('theme=%s', (theme) => {
  test('вкладки отрисованы, тема применена и переключается', async () => {
    const { errors, seen } = await runApp({ lang: 'ru', stored: true, theme });
    expect(errors).toEqual([]);
    for (const k of ['home', 'metrics', 'coach', 'growth', 'profile']) expect(seen[k].length).toBeGreaterThan(10);
    expect(seen.profile).toContain('ТЕМА');
    // Фото-фон: один на всё приложение, не пересоздаётся при смене вкладок.
    expect(seen.backdrops.every((n) => n === 1)).toBe(true);
    if (theme === 'light') expect(seen.bare).toEqual({ metrics: [], coach: [], growth: [], profile: [], home: [] });
    // Убранные настройки анимированного фона отсутствуют.
    expect(seen.profile).not.toContain('Небо по времени суток');
    expect(seen.profile).not.toContain('Сезонные эффекты');
    const T = require(path.join(ROOT, 'lib/theme'));
    expect(T.THEMES[theme].bg).toBe(theme === 'dark' ? '#0E0F11' : '#EEF0F3');
    expect(T.COLORS.name).toBe(theme);
    expect(T.THEMES.steel.name).toBe(theme); // старые имена тем следуют текущей
  });
});

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
      // Первое открытие «Роста» — вводный шаг 1/2.
      expect(seen.growth).toContain('1/2');
      expect(seen.growth).toContain(lang === 'ru' ? 'Далее' : 'Next');
      // Вкладки «Тренировки» нет, тренировки — внизу «Обзора».
      expect(seen.home).toContain(lang === 'ru' ? 'Все тренировки' : 'All workouts');
      expect(seen.home).toContain(lang === 'ru' ? 'Добавить тренировку' : 'Add workout');
      expect(seen.home.indexOf(lang === 'ru' ? 'Все тренировки' : 'All workouts')).toBeGreaterThan(seen.home.indexOf(lang === 'ru' ? 'Готовность' : 'Readiness'));
    }
  });
});

// Текст прямо на фото-фоне (заголовки, разделы, шапка) светлый в обеих темах.
describe('on-photo text colors', () => {
  test.each(['light', 'dark'])('PageTitle, Section, AppHeader в теме %s берут onBg', async (theme) => {
    jest.resetModules();
    jest.doMock('react-native', () => makeRN('ru'), { virtual: true });
    jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
    jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
    jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
    const TR = require('react-test-renderer');
    const { ColorsContext } = require(path.join(ROOT, 'lib/colors'));
    const { THEMES } = require(path.join(ROOT, 'lib/theme'));
    const { PageTitle, Section } = require(path.join(ROOT, 'lib/ui'));
    const { AppHeader } = require(path.join(ROOT, 'lib/AppHeader'));
    const c = THEMES[theme];
    expect(c.onBg).toBe('#F4F5F6');
    let r;
    await TR.act(async () => {
      r = TR.create(React.createElement(ColorsContext.Provider, { value: c },
        React.createElement(PageTitle, null, 'Профиль'),
        React.createElement(Section, { right: 'Все' }, 'Сон'),
        React.createElement(AppHeader, { onLog() {}, chip: null, subtitle: null })));
    });
    const colorOf = (txt) => {
      const n = r.root.findAll((x) => x.props && x.props.style && x.props.children != null && [].concat(x.props.children).join('').toUpperCase() === txt)[0];
      return RNflat(n.props.style).color;
    };
    expect(colorOf('ПРОФИЛЬ')).toBe(c.onBg);
    expect(colorOf('СОН')).toBe(c.onBg);
    expect(colorOf('ВСЕ')).toBe(c.onBgSub);
    expect(colorOf('EPIMELY')).toBe(c.onBg);
    await TR.act(async () => { r.unmount(); });
  });

  test('PhotoBackdrop: одна картинка cover, градиент-подложка, без анимированных слоёв', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => makeRN('ru'), { virtual: true });
    jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
    const TR = require('react-test-renderer');
    const { PhotoBackdrop } = require(path.join(ROOT, 'lib/PhotoBackdrop'));
    let r;
    await TR.act(async () => { r = TR.create(React.createElement(PhotoBackdrop)); });
    const imgs = r.root.findAll((n) => n.type === 'Image');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].props.resizeMode).toBe('cover');
    expect(r.root.findAll((n) => n.type === 'LinearGradient').length).toBe(1);
    expect(r.root.findAll((n) => n.props && (n.props.testID === 'weather-layer' || n.props.testID === 'season-layer'))).toHaveLength(0);
    await TR.act(async () => { r.unmount(); });
  });
});

// Текст на фото: ищем Text, чей цвет = c.text/c.sub/c.muted светлой темы и у которого нет предка
// с фоном (карточка, чип, поле) или поверхности 'card'. Такой текст на тёмном фото нечитаем.
function barePhotoText(root, SurfaceContext, c) {
  const bad = new Set([c.text, c.sub, c.muted].map((x) => String(x).toLowerCase()));
  const out = [];
  const flat = (s) => (Array.isArray(s) ? Object.assign({}, ...s.flat(3).filter(Boolean)) : s || {});
  const hasBg = (n) => { const b = flat(n.props && n.props.style).backgroundColor; return !!b && b !== 'transparent'; };
  for (const n of root.findAll((x) => typeof x.type === 'string' && /Text$/.test(x.type))) {
    const col = flat(n.props.style).color;
    if (!col || !bad.has(String(col).toLowerCase())) continue;
    let covered = false;
    for (let p = n.parent; p && !covered; p = p.parent) {
      if (p.type && p.type.$$typeof && p.props && p.props.value === 'card' && p.type._context === SurfaceContext) covered = true;
      else if (p.type && p.type._context === SurfaceContext && p.props.value === 'card') covered = true;
      else if (typeof p.type === 'string' && hasBg(p)) covered = true;
      else if (typeof p.type !== 'string' && p.props && hasBg(p)) covered = true;
    }
    if (!covered) out.push(String(col) + ': ' + [].concat(n.props.children).join('').slice(0, 40));
  }
  return out;
}
function RNflat(s) { return Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {}; }


// Онбординг «Роста»: два шага, флаг в AsyncStorage, повтор по «Что это?».
describe('Growth onboarding', () => {
  test.each(['ru', 'en'])('шаги 1/2 и 2/2, флаг, повтор (%s)', async (lang) => {
    jest.resetModules();
    jest.doMock('react-native', () => makeRN(lang), { virtual: true });
    jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
    jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
    jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
    const mem = {};
    jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async (k) => (k in mem ? mem[k] : null), setItem: async (k, v) => { mem[k] = String(v); } } }), { virtual: true });
    const TR = require('react-test-renderer');
    require(path.join(ROOT, 'lib/i18n')).setLang(lang);
    const { GrowthScreen } = require(path.join(ROOT, 'lib/screens/GrowthScreen'));
    const text = (r) => JSON.stringify(r.toJSON());
    const press = async (r, label) => {
      let b = r.root.findAll((n) => n.type === 'Text' && n.props.children === label)[0];
      while (b && !b.props.onPress) b = b.parent;
      await TR.act(async () => { b.props.onPress(); });
    };
    const L = lang === 'ru' ? { what: 'Что это', next: 'Далее', go: 'Начать', q: 'Что это?', main: 'Расти вместе с телом' } : { what: 'What is this', next: 'Next', go: 'Get started', q: 'What is this?', main: 'Grow with your body' };
    let r;
    await TR.act(async () => { r = TR.create(React.createElement(GrowthScreen, { growth: null })); });
    await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
    expect(text(r)).toContain('1/2');
    expect(text(r)).toContain(L.next);
    expect(text(r)).not.toContain(L.main);
    await press(r, L.next);
    expect(text(r)).toContain('2/2');
    await press(r, L.go);
    expect(mem['growth.intro.v1']).toBe('1');
    expect(text(r)).toContain(L.main);
    await press(r, L.q);
    expect(text(r)).toContain('1/2');
    await TR.act(async () => { r.unmount(); });
    // Флаг уже стоит — сразу основной экран.
    await TR.act(async () => { r = TR.create(React.createElement(GrowthScreen, { growth: null })); });
    await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
    expect(text(r)).toContain(L.main);
    expect(text(r)).not.toContain('1/2');
    await TR.act(async () => { r.unmount(); });
  });
});

// Вкладка «Рост»: без данных, с открытыми/закрытыми ступенями и списком заданий на экране.
describe('GrowthScreen', () => {
  test.each(['ru', 'en'])('рисуется без роста и с ростом, список заданий на месте (%s)', async (lang) => {
    jest.resetModules();
    jest.doMock('react-native', () => makeRN(lang), { virtual: true });
    jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
    jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
    jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
    const mem = { 'growth.intro.v1': '1' };
    jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async (k) => (k in mem ? mem[k] : null), setItem: async (k, v) => { mem[k] = String(v); } } }), { virtual: true });
    const errors = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
    const TR = require('react-test-renderer');
    require(path.join(ROOT, 'lib/i18n')).setLang(lang);
    const { GrowthScreen } = require(path.join(ROOT, 'lib/screens/GrowthScreen'));
    const { Silhouette } = require(path.join(ROOT, 'lib/Silhouette'));
    const tiers = Array.from({ length: 9 }, (_, i) => ({ id: 't' + i, name: 'Tier ' + i, description: '', minLevel: i * 10, unlocked: i < 3, progress: i < 3 ? 1 : 0.4 }));
    const growth = { level: 22, xp: 900, xpInLevel: 20, xpToNext: 60, progress: 0.25, maxed: false,
      today: { xp: 12, cap: 50, sources: [{ id: 'steps', label: 'Steps goal', xp: 12, done: true }, { id: 'sleep', label: 'Sleep', xp: 12, done: false }] },
      tier: { id: 't2', name: 'Tier 2', minLevel: 20, index: 2 }, tiers, startedAt: 0 };
    const text = (r) => JSON.stringify(r.toJSON());
    let r;
    await TR.act(async () => { r = TR.create(React.createElement(GrowthScreen, { growth: null })); });
    await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });
    expect(text(r)).toContain(lang === 'ru' ? 'Расти вместе с телом' : 'Grow with your body');
    await TR.act(async () => { r.update(React.createElement(GrowthScreen, { growth })); });
    expect(text(r)).toContain('22 lvl');
    expect(text(r)).toContain(lang === 'ru' ? 'с 30 уровня' : 'from level 30');
    expect(r.root.findAllByType(Silhouette).length).toBe(10);
    expect(text(r)).toContain('Tier 1');
    expect(text(r)).not.toContain('Tier 3');
    expect(text(r)).not.toContain('Tier 8');
    expect(text(r)).not.toContain(lang === 'ru' ? 'Растём' : "Let's grow"); // кнопки и панели больше нет
    expect(text(r)).toContain('Steps goal');
    expect(text(r)).toContain('12 ' + (lang === 'ru' ? 'из' : 'of') + ' 50 XP');
    await TR.act(async () => { r.unmount(); });
    spy.mockRestore();
    expect(errors).toEqual([]);
    // Все ступени силуэта рисуются, число частиц ограничено.
    for (let t = 0; t <= 8; t++) {
      let q;
      await TR.act(async () => { q = TR.create(React.createElement(Silhouette, { height: 200, tier: t, intro: true })); });
      expect(q.root.findAll((n) => n.type === 'Circle').length).toBeLessThanOrEqual(600);
      await TR.act(async () => { q.unmount(); });
    }
  });
});

describe('no bare dark text on the photo (light theme)', () => {
  test('образцы экранов', async () => {
    jest.resetModules();
    jest.doMock('react-native', () => makeRN('ru'), { virtual: true });
    jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
    jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
    jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
    const TR = require('react-test-renderer');
    const { ColorsContext, SurfaceContext } = require(path.join(ROOT, 'lib/colors'));
    const { THEMES } = require(path.join(ROOT, 'lib/theme'));
    const c = THEMES.light;
    const ui = require(path.join(ROOT, 'lib/ui'));
    const { Screen, Card, Section, Body, Note, T, Bullet, Subhead, Label, Disclaimer, Msg } = ui;
    const noop = new Proxy(function () {}, { get: (_, k) => (k === '__esModule' ? true : k === 'then' ? undefined : noop), apply: () => noop });
    for (const m of ['react-native-health-connect', 'expo-notifications', 'expo-task-manager', 'expo-background-task', 'expo-location', 'expo-document-picker', 'expo-file-system', 'expo-file-system/legacy', 'expo-sharing', 'react-native-view-shot', 'fflate', '@react-native-async-storage/async-storage']) jest.doMock(m, () => noop, { virtual: true });
    const checked = []; const skipped = [];
    const samples = {
      bare: () => React.createElement(Screen, { title: 'Заголовок', onBack() {} },
        React.createElement(Section, null, 'Раздел'), React.createElement(Body, null, 'a'), React.createElement(Body, { sub: true }, 'b'),
        React.createElement(Note, null, 'n'), React.createElement(T, null, 't'), React.createElement(T, { sub: true }, 's'),
        React.createElement(Bullet, null, 'bl'), React.createElement(Subhead, null, 'sh'), React.createElement(Label, null, 'lb'),
        React.createElement(Disclaimer), React.createElement(Msg, null, 'ok')),
      control: () => React.createElement(Screen, { title: 'x' }, React.createElement('Text', { style: { color: c.text } }, 'raw')),
      inCard: () => React.createElement(Screen, { title: 'x' }, React.createElement(Card, null, React.createElement(Body, null, 'a'), React.createElement(Note, null, 'n'))),
    };
    for (const k of ['AboutDataScreen', 'TipsScreen', 'NoHealthConnectScreen', 'PermissionsScreen', 'AchievementsScreen']) {
      let M; try { M = require(path.join(ROOT, 'lib/screens/' + k)); } catch (e) { skipped.push(k + ': ' + e.message.slice(0, 100)); continue; }
      const props = { onBack() {}, onRetry() {}, onSkip() {}, onRequest() {}, list: [], rec: { main: { id: 'm', title: 't', why: ['w'], actions: ['a'], lead: 'l' }, others: [] }, status: 3, busy: false, granted: 0 };
      samples[k] = () => React.createElement(M[k], props);
    }
    for (const [name, make] of Object.entries(samples)) {
      let r;
      try {
        await TR.act(async () => { r = TR.create(React.createElement(ColorsContext.Provider, { value: c }, make())); });
      } catch (e) { if (name === 'bare' || name === 'inCard') throw e; skipped.push(name + ': ' + e.message.slice(0, 80)); continue; }
      checked.push(name);
      // control — заведомо плохой текст: детектор обязан его найти.
      expect([name, barePhotoText(r.root, SurfaceContext, c).length > 0]).toEqual([name, name === 'control']);
      await TR.act(async () => { r.unmount(); });
    }
    expect(skipped).toEqual([]);
    expect(checked.length).toBeGreaterThanOrEqual(7);
  });
});
