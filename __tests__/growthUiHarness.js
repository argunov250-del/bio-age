const React = require('react'); // eslint-disable-line no-unused-vars
const hostProxy = (host) => new Proxy({ __esModule: true }, { get: (t, k) => (k === '__esModule' ? true : k === 'default' ? host('Svg') : typeof k === 'string' ? host(k) : undefined) });
function makeAnimated(host) {
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

function makeRN(lang, host) {
  const comps = {};
  for (const n of ['View', 'Text', 'ScrollView', 'Pressable', 'TextInput', 'Image', 'Modal', 'ActivityIndicator', 'KeyboardAvoidingView', 'StatusBar', 'RefreshControl', 'Switch', 'TouchableOpacity', 'SafeAreaView', 'FlatList']) comps[n] = host(n);
  const sub = () => ({ remove() {} });
  return {
    __esModule: true,
    ...comps,
    Animated: makeAnimated(host),
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

module.exports = { makeRN, hostProxy };
