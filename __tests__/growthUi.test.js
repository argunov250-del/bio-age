// Интерфейс «Роста» 2.0: список заданий, умные замены, состояния, вода/витамины, панели дыхания и паузы,
// карточка арки, вставка ранга, ранг в шапке, секреты в достижениях. Светлая и тёмная темы, ru и en.
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

const SRC = (over) => ({ steps: 12, sleep: 12, water: 6, log: 4, vitamins: 2, breath: 4, pause: 4, workout: 10, ...over });
const mkGrowth = (over = {}) => {
  const got = over.got || { steps: 8, sleep: 12, water: 3 };
  const done = over.done || ['sleep'];
  const sources = ['steps', 'sleep', 'water', 'log', 'vitamins', 'breath', 'pause', 'workout'].map((id) => ({
    id, label: 'Label ' + id, xp: SRC()[id], max: SRC()[id], got: got[id] || 0, done: done.includes(id), ...(id === 'workout' ? { optional: true } : null),
  }));
  const tiers = Array.from({ length: 9 }, (_, i) => ({ id: 't' + i, name: 'Tier ' + i, description: '', minLevel: i * 10, unlocked: i < 3, progress: i < 3 ? 1 : 0.4 }));
  return {
    level: 34, xp: 1000, xpInLevel: 20, xpToNext: 60, progress: 0.25, maxed: false,
    today: { xp: 24, cap: 50, bonus: 25, sources },
    streak: { days: 5, target: 7, bonusXp: 6 },
    rank: { index: 3, name: 'Rank Name' },
    events: [],
    journal: [
      { type: 'achievement', id: 'who150', xp: 25, day: '2026-11-04', at: Date.UTC(2026, 10, 4) },
      { type: 'rankUp', rank: 3, day: '2026-11-03', at: Date.UTC(2026, 10, 3) },
      { type: 'arc', id: 'arc.tired.x', xp: 15, text: { ru: 'Хирон выспался', en: 'Chiron is well rested' }, day: '2026-11-02', at: Date.UTC(2026, 10, 2) },
      { type: 'levelUp', level: 34, day: '2026-11-01', at: Date.UTC(2026, 10, 1) },
    ],
    tier: { id: 't2', name: 'Tier 2', minLevel: 20, index: 2 }, tiers, startedAt: 0,
    ...over.top,
  };
};
const water = (over) => ({ ml: 750, goalMl: 2300, localMl: 750, progress: 0.3, done: false, add: jest.fn(async () => ({})), undo: jest.fn(async () => ({})), askSync: jest.fn(), ...over });

async function setup(lang, theme) {
  jest.resetModules();
  jest.doMock('react-native', () => makeRN(lang), { virtual: true });
  jest.doMock('react-native-svg', () => hostProxy(), { virtual: true });
  jest.doMock('react-native-safe-area-context', () => ({ __esModule: true, SafeAreaView: host('SafeAreaView'), useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }), { virtual: true });
  const mem = { 'growth.intro.v1': '1' };
  jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: { getItem: async (k) => (k in mem ? mem[k] : null), setItem: async (k, v) => { mem[k] = String(v); }, removeItem: async (k) => { delete mem[k]; } } }), { virtual: true });
  jest.doMock('expo-haptics', () => ({ __esModule: true, impactAsync: async () => {}, notificationAsync: async () => {}, selectionAsync: async () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} }), { virtual: true });
  jest.doMock('react-native-health-connect', () => ({ __esModule: true }), { virtual: true });
  const errors = [];
  const spy = jest.spyOn(console, 'error').mockImplementation((...a) => { const m = a.map(String).join(' '); if (!/react-test-renderer is deprecated/.test(m)) errors.push(m); });
  const TR = require('react-test-renderer');
  require(path.join(ROOT, 'lib/i18n')).setLang(lang);
  const { THEMES } = require(path.join(ROOT, 'lib/theme'));
  const { ColorsContext } = require(path.join(ROOT, 'lib/colors'));
  const wrap = (el) => React.createElement(ColorsContext.Provider, { value: THEMES[theme] }, el);
  const text = (r) => JSON.stringify(r.toJSON());
  const byLabel = (r, label) => r.root.findAll((n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
  const press = async (r, label) => { const b = byLabel(r, label); expect(b).toBeTruthy(); await TR.act(async () => { b.props.onPress(); }); };
  const pressText = async (r, label) => {
    let b = r.root.findAll((n) => n.type === 'Text' && n.props.children === label)[0];
    while (b && !b.props.onPress) b = b.parent;
    expect(b).toBeTruthy();
    await TR.act(async () => { b.props.onPress(); });
  };
  const mount = async (el) => { let r; await TR.act(async () => { r = TR.create(wrap(el)); }); await TR.act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); }); return r; };
  const { tr } = require(path.join(ROOT, 'lib/i18n'));
  return { TR, mem, errors, spy, wrap, text, byLabel, press, pressText, mount, tr, req: (m) => require(path.join(ROOT, m)) };
}

const COMBOS = [['ru', 'light'], ['ru', 'dark'], ['en', 'light'], ['en', 'dark']];
afterEach(() => { jest.useRealTimers(); });

describe.each(COMBOS)('GrowthScreen 2.0 (%s, %s)', (lang, theme) => {
  test('список заданий: строки, XP, серия, бонус, образ, ранг, журнал', async () => {
    const t = await setup(lang, theme);
    const { GrowthScreen } = t.req('lib/screens/GrowthScreen');
    const w = water();
    const r = await t.mount(React.createElement(GrowthScreen, { growth: mkGrowth(), plan: { mode: 'normal', quests: [], hide: [] }, activities: {}, water: w, achievements: [{ id: 'who150', title: 'WHO target' }] }));
    const x = t.text(r);
    expect(x).toContain(t.tr('Задания на сегодня').toUpperCase());
    expect(x).toContain('24 ' + t.tr('из') + ' 50 XP');
    expect(x).toContain('34 lvl');
    expect(x).toContain('Rank Name');
    expect(x).toContain(t.tr('Образ') + ': Tier 2');
    expect(x).toContain(lang === 'ru' ? 'Серия: 5 из 7' : 'Streak: 5 of 7');
    expect(x).toContain(t.tr('Бонус') + ': +25 XP');
    expect(x).toContain(t.tr('бонус, по желанию'));
    expect(x).toContain('8/12 XP');
    for (const id of ['steps', 'sleep', 'water', 'log', 'vitamins', 'breath', 'pause', 'workout']) expect(x).toContain('"accessibilityLabel":"' + id + '"');
    expect(x).toContain('+250 ' + t.tr('мл'));
    expect(x).not.toContain(t.tr('Растём'));
    expect(x).toContain(t.tr('Журнал').toUpperCase());
    expect(x).toContain('WHO target');
    expect(x).toContain(lang === 'ru' ? 'Хирон выспался' : 'Chiron is well rested');
    // вода: +250 мл и отмена
    await t.press(r, 'water-add');
    expect(w.add).toHaveBeenCalledWith(250);
    await t.press(r, 'water-undo');
    expect(w.undo).toHaveBeenCalled();
    // витамины: переключатель пишет в локальное хранилище
    await t.press(r, 'vitamins-toggle');
    await TR_flush(t);
    expect(JSON.parse(t.mem['activities.v1'])[t.req('lib/activities').dayKey()].vitamins).toBe(true);
    await t.TR.act(async () => { r.unmount(); });
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });

  test('умная замена шагов: строка Хирона «почему»; день отдыха; нет данных; всё готово; потолок', async () => {
    const t = await setup(lang, theme);
    const { GrowthScreen } = t.req('lib/screens/GrowthScreen');
    const q = { id: 'sq_breathe', replaces: 'steps', title: 'RU-title', why: 'RU-why', i18n: { ru: { title: 'Дыхание и растяжка', why: 'Сегодня не гонимся за шагами' }, en: { title: 'Breathing and stretching', why: 'We are not chasing steps today' } } };
    const plan = { mode: 'poor_sleep', quests: [q], hide: ['steps'] };
    let r = await t.mount(React.createElement(GrowthScreen, { growth: mkGrowth(), plan, activities: {}, water: water() }));
    let x = t.text(r);
    expect(x).toContain(lang === 'ru' ? 'Сегодня не гонимся за шагами' : 'We are not chasing steps today');
    expect(x).toContain(t.tr('Хирон подобрал под сегодняшний день'));
    expect(x).not.toContain('Label steps');
    await t.TR.act(async () => { r.unmount(); });
    // день отдыха из защитной паузы
    r = await t.mount(React.createElement(GrowthScreen, { growth: mkGrowth(), plan: { mode: 'rest', quests: [{ id: 'sq_rest', replaces: '*', i18n: { ru: { why: 'Отдыхаем' }, en: { why: 'We rest' } } }], hide: ['steps'] }, activities: {}, water: water() }));
    x = t.text(r);
    expect(x).toContain(t.tr('Сегодня без заданий. Отдыхай: опыт за день не обязателен.'));
    expect(x).not.toContain('"accessibilityLabel":"water"');
    await t.TR.act(async () => { r.unmount(); });
    // нет данных Health Connect
    r = await t.mount(React.createElement(GrowthScreen, { growth: mkGrowth({ done: [], got: {} }), plan: { mode: 'normal', quests: [], hide: [] }, activities: {}, water: water({ ml: 0, localMl: 0 }), noData: true }));
    x = t.text(r);
    expect(x).toContain(t.tr('Данных из Health Connect пока нет, но запись можно сделать вручную.'));
    expect(x).toContain(t.tr('Нет данных'));
    await t.TR.act(async () => { r.unmount(); });
    // всё готово
    const all = mkGrowth({ done: ['steps', 'sleep', 'water', 'log', 'vitamins', 'breath', 'pause'], top: { today: undefined } });
    all.today = { xp: 30, cap: 50, bonus: 0, sources: mkGrowth().today.sources.map((s) => ({ ...s, done: !s.optional })) };
    r = await t.mount(React.createElement(GrowthScreen, { growth: all, plan: { mode: 'normal', quests: [], hide: [] }, activities: {}, water: water() }));
    expect(t.text(r)).toContain(t.tr('Сегодня всё готово. Хорошая работа'));
    expect(t.text(r)).not.toContain(t.tr('Бонус') + ':');
    await t.TR.act(async () => { r.unmount(); });
    // потолок дня
    const capped = mkGrowth();
    capped.today = { ...capped.today, xp: 50, bonus: 0 };
    r = await t.mount(React.createElement(GrowthScreen, { growth: capped, plan: { mode: 'normal', quests: [], hide: [] }, activities: {}, water: water() }));
    expect(t.text(r)).toContain(t.tr('Опыт на сегодня набран. Отдыхай'));
    await t.TR.act(async () => { r.unmount(); });
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });

  test('вставка нового ранга и карточка арки', async () => {
    const t = await setup(lang, theme);
    jest.useFakeTimers();
    const { GrowthScreen } = t.req('lib/screens/GrowthScreen');
    const g = mkGrowth({ top: { events: [{ type: 'rankUp', rank: { index: 3, name: 'Rank Name' } }] } });
    const acts = jest.fn();
    const arc = { id: 'tired', stage: 'offer', title: 'Chiron title', text: 'Chiron text', note: 'See a doctor note', quests: [{ id: 'ritual', title: 'Ritual', done: false, auto: false }], chironMood: 'tired' };
    const r = await t.mount(React.createElement(GrowthScreen, { growth: g, plan: { mode: 'normal', quests: [], hide: [] }, activities: {}, water: water(), arc, onArcAct: acts }));
    expect(t.text(r)).toContain('"accessibilityLabel":"rank-up"');
    expect(t.text(r)).toContain(t.tr('Новый ранг') + ': Rank Name');
    expect(t.text(r)).not.toContain(t.tr('Дальше'));
    await t.TR.act(async () => { jest.advanceTimersByTime(2600); });
    expect(t.text(r)).toContain(t.tr('Дальше'));
    await t.pressText(r, t.tr('Дальше'));
    expect(t.text(r)).not.toContain('"accessibilityLabel":"rank-up"');
    // арка: Хирон в настроении «tired», действия
    expect(t.text(r)).toContain('chiron-tired');
    expect(t.text(r)).toContain('Chiron title');
    await t.press(r, 'arc-accept');
    expect(acts).toHaveBeenCalledWith('tired', 'accept', undefined);
    await t.press(r, 'arc-later');
    expect(acts).toHaveBeenCalledWith('tired', 'later', undefined);
    await t.press(r, 'arc-close');
    expect(acts).toHaveBeenCalledWith('tired', 'close', undefined);
    await t.TR.act(async () => { r.unmount(); });
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });

  test('арка: шаги, отметка и награда; компактная карточка', async () => {
    const t = await setup(lang, theme);
    const { ArcCard } = t.req('lib/ArcCard');
    const acts = jest.fn();
    const active = { id: 'tired', stage: 'active', title: 'T', text: 'X', quests: [{ id: 'ritual', title: 'Ritual', done: false, auto: false }, { id: 'sleep', title: 'Sleep', done: true, auto: true }], chironMood: 'ok' };
    let r = await t.mount(React.createElement(ArcCard, { arc: active, onAct: acts }));
    await t.press(r, 'arc-check-0');
    expect(acts).toHaveBeenCalledWith('tired', 'check', { index: 0 });
    await t.TR.act(async () => { r.unmount(); });
    r = await t.mount(React.createElement(ArcCard, { arc: { ...active, stage: 'healed', chironMood: 'happy', reward: { xp: 15 } }, onAct: acts }));
    expect(t.text(r)).toContain('chiron-happy');
    expect(t.text(r)).toContain('+15 XP');
    await t.TR.act(async () => { r.unmount(); });
    r = await t.mount(React.createElement(ArcCard, { arc: { id: 'back', stage: 'checkin', title: 'B', text: 'How are you', quests: [], chironMood: 'ok' }, onAct: acts, compact: true }));
    await t.press(r, 'arc-answer');
    expect(acts).toHaveBeenCalledWith('back', 'answer', undefined);
    await t.TR.act(async () => { r.unmount(); });
    r = await t.mount(React.createElement(ArcCard, { arc: { id: null, stage: 'none' } }));
    expect(r.toJSON()).toBeNull();
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });

  test('дыхание 4–6: цикл и засчёт; пауза: подтверждение', async () => {
    const t = await setup(lang, theme);
    jest.useFakeTimers();
    const { BreathSheet, PauseSheet, _resetPause } = t.req('lib/CalmSheets');
    const act = t.req('lib/activities');
    _resetPause();
    let r = await t.mount(React.createElement(BreathSheet, { onClose() {} }));
    expect(t.text(r)).toContain(t.tr('Если закружилась голова, дыши как обычно и остановись.'));
    await t.pressText(r, t.tr('Начать'));
    expect(t.text(r)).toContain(t.tr('Вдох'));
    await t.TR.act(async () => { jest.advanceTimersByTime(4500); });
    expect(t.text(r)).toContain(t.tr('Выдох'));
    await t.TR.act(async () => { jest.advanceTimersByTime(3 * 60000); });
    await t.TR.act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(t.text(r)).toContain(t.tr('Готово'));
    expect(JSON.parse(t.mem['activities.v1'])[act.dayKey()].breathMin).toBe(3);
    await t.TR.act(async () => { r.unmount(); });
    // пауза
    r = await t.mount(React.createElement(PauseSheet, { onClose() {} }));
    await t.pressText(r, t.tr('Начать'));
    await t.TR.act(async () => { jest.advanceTimersByTime(16 * 60000); });
    expect(t.text(r)).toContain(t.tr('Время вышло'));
    await t.pressText(r, t.tr('Получилось'));
    await t.TR.act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); });
    expect(JSON.parse(t.mem['activities.v1'])[act.dayKey()].pauseMin).toBe(15);
    await t.TR.act(async () => { r.unmount(); });
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });

  test('шапка: ранг и уровень вместо девиза; секреты «???»', async () => {
    const t = await setup(lang, theme);
    const { AppHeader } = t.req('lib/AppHeader');
    const onSub = jest.fn();
    let r = await t.mount(React.createElement(AppHeader, { onLog() {}, subtitle: 'Rank Name · 34 ' + t.tr('ур.'), onSubtitle: onSub }));
    expect(t.text(r)).toContain('Rank Name · 34 ' + (lang === 'ru' ? 'ур.' : 'lvl'));
    expect(t.text(r)).not.toContain(t.tr('забота о себе'));
    await t.press(r, 'rank-subtitle');
    expect(onSub).toHaveBeenCalled();
    await t.TR.act(async () => { r.unmount(); });
    r = await t.mount(React.createElement(AppHeader, { onLog() {} }));
    expect(t.text(r)).toContain(t.tr('забота о себе'));
    await t.TR.act(async () => { r.unmount(); });
    const { AchievementsScreen } = t.req('lib/screens/AchievementsScreen');
    const list = [
      { id: 'steps10k', cat: 'move', icon: '👟', title: 'Visible', desc: 'Visible desc', value: 100, target: 10000, done: false },
      { id: 'steps20k', cat: 'move', secret: true, hidden: true, icon: '❓', title: '???', desc: '???', value: 0, target: 20000, done: false },
    ];
    r = await t.mount(React.createElement(AchievementsScreen, { list, onBack() {} }));
    expect(t.text(r)).toContain('???');
    expect(t.text(r)).not.toContain('0 / 20');
    await t.TR.act(async () => { r.unmount(); });
    t.spy.mockRestore();
    expect(t.errors).toEqual([]);
  });
});

async function TR_flush(t) { await t.TR.act(async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); }); }
