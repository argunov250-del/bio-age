// Моушен-графика: кинетическая типографика (буквы поднимаются и разворачиваются из
// наклона), счётчики чисел, 3D-наклон карточек к пальцу, переходы экранов в глубину.
// Всё на Animated с native driver, кроме счётчиков (они меняют текст).
// Если в системе включено «Убрать анимацию», всё показывается сразу.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Animated, Easing, AccessibilityInfo, Modal, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { MOTION, SIZES } from './theme';
import { isLite } from './perf';
import { fmt } from './format';
import { useColors } from './colors';
import { light } from './haptics';
let InsetsCtx = null;
try { InsetsCtx = require('react-native-safe-area-context').SafeAreaInsetsContext; } catch (e) { InsetsCtx = null; }
const NoCtx = React.createContext(null);

let REDUCE = false;
try {
  AccessibilityInfo.isReduceMotionEnabled().then((v) => { REDUCE = !!v; }).catch(() => {});
  AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { REDUCE = !!v; });
} catch (e) {
  // нет API — анимации включены
}
export const reduceMotion = () => REDUCE;

// Ease-out cubic точками: easing в interpolate не работает с native driver.
const EASE = [0, 0.578, 0.875, 0.984, 1];
const range = (a, b) => [0, 0.25, 0.5, 0.75, 1].map((k) => a + (b - a) * k);
const between = (v, t0, t1, from, to) => v.interpolate({
  inputRange: range(t0, t1),
  outputRange: EASE.map((e) => (typeof from === 'number' ? from + (to - from) * e : `${parseFloat(from) + (parseFloat(to) - parseFloat(from)) * e}deg`)),
  extrapolate: 'clamp',
});

// Текст по буквам (короткий) или по словам (длинный): каждая часть поднимается,
// проявляется и «встаёт» из наклона — одна общая анимация на весь текст.
// Разбор текста на части и полная длительность проявления — общая формула для самой
// анимации и для тех, кто выстраивает несколько текстов друг за другом (kineticMs).
function kineticPlan(text, by) {
  // На слабых телефонах — по словам: меньше анимируемых частей.
  const words = by === 'word' || isLite() || (by !== 'char' && text.length > 24);
  const parts = words ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
  const stagger = words ? MOTION.wordStagger : MOTION.charStagger;
  return { parts, stagger, total: MOTION.riseMs + stagger * Math.max(0, parts.length - 1) };
}
export const kineticMs = (children, by) => kineticPlan(children == null ? '' : String(children), by).total;

export function KineticText({ children, style, delay = 0, center, by }) {
  const text = children == null ? '' : String(children);
  const v = useRef(new Animated.Value(REDUCE ? 1 : 0)).current;
  const { parts, stagger, total } = kineticPlan(text, by);

  useEffect(() => {
    if (REDUCE) { v.setValue(1); return undefined; }
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: total, delay, easing: Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [text, v, total, delay]);

  const flat = (style && StyleSheet.flatten(style)) || {};
  const baseSize = flat.fontSize || 16;
  // Слово никогда не рвётся посреди: буквы группируются в неразрывные слова, а если самое
  // длинное слово шире строки — шрифт уменьшается.
  const [boxW, setBoxW] = useState(0);
  const longest = text.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 1);
  const need = longest * (baseSize * 0.78 + (flat.letterSpacing || 0));
  const k = boxW > 0 ? Math.max(0.55, Math.min(1, boxW / need)) : 1;
  const size = baseSize * k;
  const fitStyle = k < 1 ? { fontSize: size, letterSpacing: (flat.letterSpacing || 0) * k } : null;
  const groups = [];
  parts.forEach((p, i) => {
    const sp = /^\s+$/.test(p);
    const last = groups[groups.length - 1];
    if (!sp && last && !last.space) last.items.push([p, i]);
    else groups.push({ items: [[p, i]], space: sp });
  });
  const renderPart = ([p, i]) => {
    const t0 = (i * stagger) / total;
    const t1 = (i * stagger + MOTION.riseMs) / total;
    return (
      <Animated.Text
        key={i}
        style={[style, fitStyle, {
          opacity: between(v, t0, t1, 0, 1),
          transform: [
            { perspective: 400 },
            { translateY: between(v, t0, t1, size * 0.55, 0) },
            { rotateX: between(v, t0, t1, `${MOTION.riseTilt}deg`, '0deg') },
          ],
        }]}
      >
        {p}
      </Animated.Text>
    );
  };
  return (
    <View onLayout={(e) => setBoxW(Math.round(e.nativeEvent.layout.width))}
      style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start' }}>
      {groups.map((g, gi) => (g.space || g.items.length === 1
        ? renderPart(g.items[0])
        : <View key={'g' + gi} style={{ flexDirection: 'row' }}>{g.items.map(renderPart)}</View>))}
    </View>
  );
}

// Число плавно «докручивается» до нового значения. id — запоминает последнее показанное
// значение, чтобы при возврате на вкладку счёт не начинался заново.
const LAST = {};
export function useCountUp(id, target, delay = 0) {
  const [v, setV] = useState(() => (target == null ? null : REDUCE ? target : id in LAST ? LAST[id] : 0));
  useEffect(() => {
    if (target == null) { setV(null); return undefined; }
    const from = id in LAST ? LAST[id] : 0;
    LAST[id] = target;
    if (REDUCE || from === target) { setV(target); return undefined; }
    let raf = 0;
    const t0 = Date.now() + delay;
    const step = () => {
      const k = Math.min(1, Math.max(0, (Date.now() - t0) / (isLite() ? MOTION.countMs / 2 : MOTION.countMs)));
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [id, target, delay]);
  return v;
}

// ---- Пружины и кривые в духе iOS ------------------------------------------------------
// Пружины: damping/stiffness/mass (без speed/bounciness), все работают с native driver.
export const SPRING = {
  default: { damping: 20, stiffness: 220, mass: 1 },
  snappy: { damping: 22, stiffness: 380, mass: 0.9 },
  gentle: { damping: 18, stiffness: 120, mass: 1 },
};
// Кривая cubic-bezier(0.25, 0.1, 0.25, 1) — стандартный iOS «ease».
export const EASE_IOS = Easing.bezier(0.25, 0.1, 0.25, 1);
// В облегчённом режиме анимации короче.
export const dur = (ms) => (isLite() ? Math.round(ms * 0.6) : ms);

export const spring = (v, toValue, preset = SPRING.default, extra) =>
  Animated.spring(v, { toValue, ...preset, useNativeDriver: true, ...extra });
export const ease = (v, toValue, ms = 280, extra) =>
  Animated.timing(v, { toValue, duration: dur(ms), easing: EASE_IOS, useNativeDriver: true, ...extra });

// Задержка i-го элемента каскада: step мс между соседними, не больше max шагов.
export const staggerDelay = (i, step = 50, max = 8) => Math.min(Math.max(0, i), max) * step;

// Нажатие: масштаб 0.97 и лёгкое затемнение, пружина назад. Возвращает анимированный
// стиль и обработчики onPressIn/onPressOut. При «Убрать анимацию» — мгновенно.
export function usePressScale(scale = MOTION.pressScale) {
  const v = useRef(new Animated.Value(0)).current;
  const to = (x) => {
    if (reduceMotion()) { v.setValue(x); return; }
    spring(v, x, SPRING.snappy).start();
  };
  return {
    style: {
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }),
      transform: [{ scale: reduceMotion() ? 1 : v.interpolate({ inputRange: [0, 1], outputRange: [1, scale] }) }],
    },
    onPressIn: () => to(1),
    onPressOut: () => to(0),
  };
}

// Нажимаемый блок с пружинным «утапливанием». Заменяет Pressable там, где нужен отклик.
const APressable = Animated.createAnimatedComponent(Pressable);
export function PressScale({ onPress, onPressIn, onPressOut, style, children, scale, disabled, ...rest }) {
  const p = usePressScale(scale);
  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={(e) => { p.onPressIn(); if (onPressIn) onPressIn(e); }}
      onPressOut={(e) => { p.onPressOut(); if (onPressOut) onPressOut(e); }}
      style={[style, p.style]}
    >
      {children}
    </APressable>
  );
}
// Прежнее имя: карточки и плитки раньше наклонялись в 3D, теперь — спокойное нажатие.
export const Tilt = PressScale;

// Появление: проявление и подъём на dy px. Таймингом (не пружиной): конец гарантирован за
// ≤ 400 мс. Если анимацию прервали (размонтирование, смена instant, повторный запуск) —
// значения сразу ставятся в конечные, контент никогда не остаётся полупрозрачным.
const APPEAR_MS = 280;
export function Appear({ children, delay = 0, dy = 10, style, instant }) {
  const skip = instant || reduceMotion();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) { v.setValue(1); return undefined; }
    const a = Animated.timing(v, { toValue: 1, duration: dur(APPEAR_MS), delay: Math.min(delay, 80), easing: EASE_IOS, useNativeDriver: true });
    a.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => { a.stop(); v.setValue(1); };
  }, [v, skip, delay]);
  const lift = isLite() ? Math.min(dy, 6) : dy;
  return (
    <Animated.View style={[style, {
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

// Появление содержимого экрана: ОДИН общий подъём (translateY, без прозрачности — её уже
// даёт перекрёстное проявление вкладки, вложенные прозрачности давали «призрак»).
// Карточки с тенью не анимируются по отдельности — нет тёмных рамок от elevation.
export function Stagger({ children, style }) {
  const skip = reduceMotion();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) { v.setValue(1); return undefined; }
    const a = Animated.timing(v, { toValue: 1, duration: dur(300), easing: EASE_IOS, useNativeDriver: true });
    a.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => { a.stop(); v.setValue(1); };
  }, [v, skip]);
  return (
    <Animated.View style={[{ gap: SIZES.gap }, style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [isLite() ? 6 : 12, 0], extrapolate: 'clamp' }) }] }]}>
      {children}
    </Animated.View>
  );
}

// Всплытие пузыря: масштаб 0.96→1 пружиной и проявление.
export function PopIn({ children, style, from = 0.96, instant }) {
  const skip = instant || reduceMotion();
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) { v.setValue(1); return undefined; }
    const a = spring(v, 1, SPRING.default);
    a.start(({ finished }) => { if (!finished) v.setValue(1); });
    return () => { a.stop(); v.setValue(1); };
  }, [v, skip]);
  return (
    <Animated.View style={[style, {
      opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
      transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [from, 1] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

// Число, которое «докручивается» (ease-out ~600 мс) с форматом локали (fmt).
let CU = 0;
export function CountUp({ value, digits = 0, id, delay, style, prefix = '', suffix = '', ...rest }) {
  const auto = useRef('cu' + (++CU)).current;
  const v = useCountUp(id || auto, value == null ? null : value, delay);
  return <Animated.Text {...rest} style={style}>{prefix + (v == null ? '—' : fmt(digits ? v : Math.round(v), digits)) + suffix}</Animated.Text>;
}

// Нижняя шторка (как в iOS): выезжает пружиной, фон затемняется вслед за пальцем, закрывается свайпом вниз
// (за «ручку»-шапку, за любое место, а во внутреннем SheetScroll — когда он прокручен к началу), тапом по ручке, по фону или «×».
export const sheetShouldClose = (dy, vy) => dy > 90 || vy > 0.9;
export const sheetRubber = (dy) => (dy >= 0 ? dy : -Math.sqrt(-dy) * 2.2); // тянем вверх — «резинка»
const SheetCtx = React.createContext(null);
// ScrollView внутри шторки: сообщает шторке, прокручен ли список (иначе свайп вниз закрывал бы шторку посреди списка).
export function SheetScroll({ onScroll, scrollEventThrottle, ...rest }) {
  const ctx = React.useContext(SheetCtx);
  return (
    <ScrollView {...rest} scrollEventThrottle={scrollEventThrottle || 16} bounces={false}
      onScroll={(e) => { if (ctx) ctx.setTop(e.nativeEvent.contentOffset.y); if (onScroll) onScroll(e); }} />
  );
}
export function Sheet({ onClose, children, style, title, closeLabel = 'close' }) {
  const c = useColors();
  const insets = React.useContext(InsetsCtx || NoCtx);
  const H = Dimensions.get('window').height || 800;
  const y = useRef(new Animated.Value(reduceMotion() ? 0 : H)).current;
  const closing = useRef(false);
  const top = useRef(0);
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const a = spring(y, 0, SPRING.default);
    a.start();
    return () => a.stop();
  }, [y]);
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    light();
    if (reduceMotion()) { onClose(); return; }
    ease(y, H, 220).start(() => onClose());
  };
  const closeRef = useRef(close);
  closeRef.current = close;
  const ctx = useRef({ setTop: (v) => { top.current = v; } }).current;
  const pan = useRef(null);
  if (!pan.current) {
    const wants = (_, g) => top.current <= 1 && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5;
    pan.current = PanResponder.create({
      onMoveShouldSetPanResponder: wants,
      onMoveShouldSetPanResponderCapture: wants,
      onPanResponderMove: (_, g) => { y.setValue(sheetRubber(g.dy)); },
      onPanResponderRelease: (_, g) => {
        if (sheetShouldClose(g.dy, g.vy)) closeRef.current();
        else spring(y, 0, SPRING.snappy).start();
      },
      onPanResponderTerminate: () => { spring(y, 0, SPRING.snappy).start(); },
    });
  }
  const bottom = Math.max(insets && insets.bottom || 0, 16) + 8;
  return (
    <Modal transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, {
        backgroundColor: 'rgba(0,0,0,0.45)',
        opacity: y.interpolate({ inputRange: [0, H], outputRange: [1, 0], extrapolate: 'clamp' }),
      }]} />
      <Pressable style={StyleSheet.absoluteFillObject} onPress={close} accessibilityLabel="close" />
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <Animated.View
          style={[{
            maxHeight: '92%', backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 20, paddingBottom: bottom, borderWidth: StyleSheet.hairlineWidth || 1, borderBottomWidth: 0,
            borderColor: c.line, overflow: 'hidden',
            shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 24,
          }, style, { transform: [{ translateY: y }] }]}
          {...pan.current.panHandlers}
        >
          <View style={{ position: 'absolute', top: 0, left: 28, right: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.14)' }} pointerEvents="none" />
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="sheet-grabber" style={{ height: 44, alignItems: 'center', justifyContent: 'center', marginHorizontal: -20 }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.muted || c.line, opacity: 0.6 }} />
          </Pressable>
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 8 }}>
              <Text style={{ color: c.text, fontSize: SIZES.title - 2, fontWeight: '800', flexShrink: 1 }}>{title}</Text>
              <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel={closeLabel + '-x'}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.sub, fontSize: 18, lineHeight: 20, fontWeight: '700' }}>×</Text>
              </Pressable>
            </View>
          ) : null}
          <SheetCtx.Provider value={ctx}>{children}</SheetCtx.Provider>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Переход экрана в стиле iOS. dir 1 — вглубь: новый экран въезжает справа;
// −1 — назад: возвращается слева с лёгким параллаксом (треть ширины) и проявлением.
export function ScreenIn({ children, dir = 1 }) {
  const skip = reduceMotion() || !dir;
  const v = useRef(new Animated.Value(skip ? 1 : 0)).current;
  useEffect(() => {
    if (skip) return undefined;
    const a = ease(v, 1, MOTION.screenMs);
    a.start();
    return () => a.stop();
  }, [v, skip]);
  const W = Dimensions.get('window').width || 400;
  const from = dir > 0 ? W : -W * 0.3;
  return (
    <Animated.View style={{
      flex: 1,
      opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [dir > 0 ? 0.6 : 0.4, 1, 1] }),
      transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}
