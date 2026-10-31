// Моушен-графика: кинетическая типографика (буквы поднимаются и разворачиваются из
// наклона), счётчики чисел, 3D-наклон карточек к пальцу, переходы экранов в глубину.
// Всё на Animated с native driver, кроме счётчиков (они меняют текст).
// Если в системе включено «Убрать анимацию», всё показывается сразу.
import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, Easing, AccessibilityInfo } from 'react-native';
import { MOTION } from './theme';
import { isLite } from './perf';

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
export function KineticText({ children, style, delay = 0, center, by }) {
  const text = children == null ? '' : String(children);
  const v = useRef(new Animated.Value(REDUCE ? 1 : 0)).current;
  // На слабых телефонах — по словам: меньше анимируемых частей.
  const words = by === 'word' || isLite() || (by !== 'char' && text.length > 24);
  const parts = words ? text.split(/(\s+)/).filter(Boolean) : Array.from(text);
  const stagger = words ? MOTION.wordStagger : MOTION.charStagger;
  const total = MOTION.riseMs + stagger * Math.max(0, parts.length - 1);

  useEffect(() => {
    if (REDUCE) { v.setValue(1); return undefined; }
    v.setValue(0);
    const a = Animated.timing(v, { toValue: 1, duration: total, delay, easing: Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [text, v, total, delay]);

  const size = (style && [].concat(style).reduce((acc, x) => (x && x.fontSize) || acc, 0)) || 16;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: center ? 'center' : 'flex-start' }}>
      {parts.map((p, i) => {
        const t0 = (i * stagger) / total;
        const t1 = (i * stagger + MOTION.riseMs) / total;
        return (
          <Animated.Text
            key={i}
            style={[style, {
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
      })}
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

// Нажимаемый блок, который в 3D наклоняется к месту касания и чуть утапливается.
const APressable = Animated.createAnimatedComponent(Pressable);
export function Tilt({ onPress, style, children }) {
  const rx = useRef(new Animated.Value(0)).current;
  const ry = useRef(new Animated.Value(0)).current;
  const pr = useRef(new Animated.Value(0)).current;
  const box = useRef({ w: 1, h: 1 });
  const to = (val, x) => Animated.spring(val, { toValue: x, speed: 18, bounciness: 6, useNativeDriver: true });
  const onIn = (e) => {
    if (REDUCE) return;
    const { locationX = box.current.w / 2, locationY = box.current.h / 2 } = e.nativeEvent || {};
    const dx = Math.max(-1, Math.min(1, (locationX / box.current.w) * 2 - 1));
    const dy = Math.max(-1, Math.min(1, (locationY / box.current.h) * 2 - 1));
    Animated.parallel([to(rx, -dy), to(ry, dx), to(pr, 1)]).start();
  };
  const onOut = () => Animated.parallel([to(rx, 0), to(ry, 0), to(pr, 0)]).start();
  const deg = (val) => val.interpolate({ inputRange: [-1, 1], outputRange: [`-${MOTION.pressTilt}deg`, `${MOTION.pressTilt}deg`] });
  return (
    <APressable
      onPress={onPress}
      onPressIn={onIn}
      onPressOut={onOut}
      onLayout={(e) => { box.current = { w: e.nativeEvent.layout.width || 1, h: e.nativeEvent.layout.height || 1 }; }}
      style={[style, {
        transform: [
          { perspective: 700 },
          { rotateX: deg(rx) },
          { rotateY: deg(ry) },
          { scale: pr.interpolate({ inputRange: [0, 1], outputRange: [1, MOTION.pressScale] }) },
        ],
      }]}
    >
      {children}
    </APressable>
  );
}

// Переход экрана: новый экран выплывает из глубины сбоку и разворачивается к нам.
// dir: 1 — вглубь (справа), −1 — назад (слева).
export function ScreenIn({ children, dir = 1 }) {
  const v = useRef(new Animated.Value(REDUCE ? 1 : 0)).current;
  useEffect(() => {
    if (REDUCE) return;
    Animated.timing(v, { toValue: 1, duration: MOTION.screenMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View style={{
      flex: 1,
      opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
      transform: [
        { perspective: 1200 },
        { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dir * 48, 0] }) },
        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: [`${-dir * MOTION.screenTilt}deg`, '0deg'] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
}
