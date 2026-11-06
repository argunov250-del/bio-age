// Визуал панелей «Дыхание 4–6» и «Цифровая пауза»: лепестки, кольца, аврора. Всё на Animated; transform/opacity
// идут на native driver, в SVG анимируется максимум пара значений (кольцо, галочка).
// reduceMotion: статичная картинка без движения; isLite: меньше лепестков, без частиц.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { reduceMotion } from './motion';
import { isLite } from './perf';
import { useColors } from './colors';
import { SIZES } from './theme';

const TAU = Math.PI * 2;
export const EASE_IN = Easing.bezier(0.3, 0, 0.2, 1);   // вдох: мягкий старт, плавное замедление
export const EASE_OUT = Easing.bezier(0.45, 0.05, 0.35, 1); // выдох: ещё мягче
export const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
};

// Значение Animated -> число в state (только для SVG-свойств, коротко и редко).
function useDriven(v) {
  const [n, setN] = useState(() => (typeof v.__getValue === 'function' ? v.__getValue() : 1));
  useEffect(() => {
    const id = v.addListener(({ value }) => setN(value));
    return () => v.removeListener(id);
  }, [v]);
  return n;
}

function useLoop(ms, enabled = true, easing = Easing.linear) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled || reduceMotion()) return undefined;
    const a = Animated.loop(Animated.timing(v, { toValue: 1, duration: ms, easing, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [v, ms, enabled, easing]);
  return v;
}

// Медленно дрейфующие размытые пятна (аврора / виньетка).
export function Aurora({ colors, size = 220, opacity = 0.16 }) {
  const lite = isLite();
  const list = lite ? colors.slice(0, 2) : colors;
  const t = useLoop(14000, !lite);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {list.map((col, i) => {
        const a = (i / list.length) * TAU;
        const dx = Math.cos(a) * size * 0.28; const dy = Math.sin(a) * size * 0.2;
        const tx = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-dx, dx, -dx] });
        const ty = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [dy, -dy, dy] });
        const sc = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: col, opacity,
              left: i % 2 ? '45%' : '-15%', top: i < 2 ? '-10%' : '35%',
              transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }],
            }}
          />
        );
      })}
    </View>
  );
}

// Галочка, рисуется по штриху.
export function Check({ size = 56, color, play = true }) {
  const p = useRef(new Animated.Value(reduceMotion() || !play ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion() || !play) { p.setValue(1); return undefined; }
    const a = Animated.timing(p, { toValue: 1, duration: 700, delay: 200, easing: EASE_IN, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [p, play]);
  const n = useDriven(p);
  const L = 62;
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56">
      <Path d="M14 29 L25 40 L43 18" stroke={color} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none"
        strokeDasharray={[L, L]} strokeDashoffset={L * (1 - n)} />
    </Svg>
  );
}

const PETAL = { light: { a: '#2BB673', b: '#14A3A3', o: 0.2 }, dark: { a: '#3DD68C', b: '#2CC7C7', o: 0.15 } };

export function BreathVisual({ mode, phase, remainingMs = 0, totalMs = 1, label = '', doneLabel = '', xpText = '', idleText = '4 · 6', size = 260 }) {
  const c = useColors();
  const pal = c.dark ? PETAL.dark : PETAL.light;
  const lite = isLite();
  const calm = reduceMotion();
  const N = lite ? 5 : 8;
  const D = size * 0.46;
  const bloom = useRef(new Animated.Value(0.15)).current;
  const asm = useRef(new Animated.Value(calm ? 1 : 0)).current;
  const spin = useLoop(48000, !lite);
  const idle = useLoop(5000, mode === 'ready', Easing.inOut(Easing.sin));
  const run = mode === 'run';
  const done = mode === 'done';

  // Сборка из центра: медленная пружина.
  useEffect(() => {
    if (calm) { asm.setValue(1); return undefined; }
    const a = Animated.spring(asm, { toValue: run || done ? 1 : 0.8, tension: 14, friction: 7, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [asm, run, done, calm]);

  // Цветок распускается на вдохе (4 с), складывается на выдохе (6 с); по окончании — спокойный расцвет.
  useEffect(() => {
    const target = done ? 1 : phase === 'inhale' ? 1 : phase === 'exhale' ? 0.15 : 0.15;
    if (!run && !done) { bloom.setValue(0.15); return undefined; }
    if (calm) { bloom.setValue(target); return undefined; }
    const ms = done ? 2400 : phase === 'inhale' ? 4000 : 6000;
    const a = Animated.timing(bloom, { toValue: target, duration: ms, easing: phase === 'exhale' && !done ? EASE_OUT : EASE_IN, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [bloom, phase, run, done, calm]);

  // Подпись: плавная смена Вдох/Выдох.
  const text = done ? doneLabel : run ? label : idleText;
  const [lab, setLab] = useState({ cur: text, prev: '' });
  const x = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setLab((s) => (s.cur === text ? s : { cur: text, prev: s.cur }));
    if (calm) { x.setValue(1); return undefined; }
    x.setValue(0);
    const a = Animated.timing(x, { toValue: 1, duration: 600, easing: EASE_IN, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [text, x, calm]);

  const scaleBase = Animated.multiply(bloom.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), asm);
  const idleS = idle.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.05, 1] });
  const petals = useMemo(() => Array.from({ length: N }, (_, i) => i), [N]);
  const R = size / 2 - 6;
  const circ = TAU * R;
  const prog = run ? Math.min(1, Math.max(0, 1 - remainingMs / totalMs)) : done ? 1 : 0;
  const tealO = bloom.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const particles = lite || calm ? [] : [0, 1, 2, 3, 4, 5];
  const pt = useLoop(7000, particles.length > 0);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }} testID="breath-visual">
      <View pointerEvents="none" style={{ position: 'absolute', left: -size * 0.3, right: -size * 0.3, top: -size * 0.1, bottom: -size * 0.1, overflow: 'hidden', borderRadius: size * 0.5 }}>
        <Aurora colors={[pal.a, pal.b]} size={size * 0.9} opacity={c.dark ? 0.07 : 0.08} />
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', opacity: bloom.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }), transform: [{ scale: scaleBase }] }]}>
        <View style={{ position: 'absolute', width: size * 0.9, height: size * 0.9, borderRadius: size * 0.45, backgroundColor: pal.a, opacity: c.dark ? 0.08 : 0.1 }} />
        <Animated.View style={{ position: 'absolute', width: size * 0.62, height: size * 0.62, borderRadius: size * 0.31, backgroundColor: pal.b, opacity: Animated.multiply(tealO, 0.16) }} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: Animated.multiply(scaleBase, idleS) }, { rotate: rot }] }}>
        {petals.map((i) => {
          const ty = bloom.interpolate({ inputRange: [0, 1], outputRange: [-D * 0.08, -D * 0.46] });
          return (
            <View key={i} style={{ position: 'absolute', width: D, height: D, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: (i * 360) / N + 'deg' }] }}>
              <Animated.View style={{ width: D, height: D, borderRadius: D / 2, backgroundColor: i % 2 ? pal.b : pal.a, opacity: pal.o + (i % 2 ? 0.03 : 0), borderWidth: 1, borderColor: i % 2 ? pal.b : pal.a, transform: [{ translateY: ty }] }} />
            </View>
          );
        })}
      </Animated.View>
      {particles.map((i) => {
        const a = (i / particles.length) * TAU; const rr = size * (0.28 + (i % 3) * 0.06);
        return (
          <Animated.View key={'p' + i} pointerEvents="none" style={{
            position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: pal.a,
            opacity: pt.interpolate({ inputRange: [0, 0.25 + i * 0.1, 0.5 + i * 0.08, 1], outputRange: [0, 0.5, 0, 0], extrapolate: 'clamp' }),
            transform: [{ translateX: Math.cos(a) * rr }, { translateY: pt.interpolate({ inputRange: [0, 1], outputRange: [Math.sin(a) * rr, Math.sin(a) * rr - 18] }) }],
          }} />
        );
      })}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={c.line} strokeWidth={2} fill="none" opacity={0.6} />
        {prog > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={R} stroke={pal.a} strokeWidth={2.5} strokeLinecap="round" fill="none"
            strokeDasharray={[circ, circ]} strokeDashoffset={circ * (1 - prog)} rotation={-90} origin={size / 2 + ',' + size / 2} />
        ) : null}
      </Svg>
      <View style={st.center} pointerEvents="none">
        {done ? <Check size={44} color={pal.a} play /> : null}
        <View style={st.labelBox}>
          {lab.prev && lab.prev !== lab.cur ? (
            <Animated.Text numberOfLines={1} style={[st.phase, { color: c.text, position: 'absolute', opacity: x.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>{lab.prev}</Animated.Text>
          ) : null}
          <Animated.Text numberOfLines={1} style={[st.phase, { color: c.text, opacity: x, transform: [{ scale: x.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>{lab.cur}</Animated.Text>
        </View>
        {run ? <Text style={[st.sub, { color: c.sub }]}>{mmss(remainingMs)}</Text> : null}
        {done && xpText ? <Text style={[st.sub, { color: c.sub }]}>{xpText}</Text> : null}
      </View>
    </View>
  );
}

// Кольцо паузы: толстый скруглённый штрих с градиентом, цифры с плавной сменой, аврора внутри.
function Digit({ ch, color }) {
  const calm = reduceMotion();
  const x = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (calm) return undefined;
    x.setValue(0);
    const a = Animated.timing(x, { toValue: 1, duration: 320, easing: EASE_IN, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [ch, x, calm]);
  return (
    <Animated.Text style={[st.digit, { color, opacity: x.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }), transform: [{ translateY: x.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>{ch}</Animated.Text>
  );
}

export function PauseVisual({ remainingMs, totalMs, done = false, size = 250, title = '' }) {
  const c = useColors();
  const pal = c.dark ? PETAL.dark : PETAL.light;
  const SW = 16;
  const R = (size - SW) / 2;
  const circ = TAU * R;
  const frac = done ? 1 : Math.min(1, Math.max(0, 1 - remainingMs / totalMs));
  const breathe = useLoop(6000, !done, Easing.inOut(Easing.sin));
  const s = done ? '' : mmss(remainingMs);
  return (
    <View style={{ width: size, height: size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' }} testID="pause-visual">
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: size, height: size, transform: [{ scale: breathe.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.97, 1.02, 0.97] }) }] }}>
        <View style={{ position: 'absolute', width: size * 0.8, height: size * 0.8, left: size * 0.1, top: size * 0.1, borderRadius: size * 0.4, overflow: 'hidden' }}>
          <Aurora colors={[pal.a, pal.b, c.dark ? '#7C8CFF' : '#6F86F0', pal.a]} size={size * 0.6} opacity={c.dark ? 0.2 : 0.18} />
        </View>
      </Animated.View>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="pauseGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={pal.a} />
            <Stop offset="1" stopColor={pal.b} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke={c.line} strokeWidth={SW} fill="none" opacity={0.5} />
        <Circle cx={size / 2} cy={size / 2} r={R} stroke="url(#pauseGrad)" strokeWidth={SW} strokeLinecap="round" fill="none"
          strokeDasharray={[circ, circ]} strokeDashoffset={circ * (1 - Math.max(0.002, frac))} rotation={-90} origin={size / 2 + ',' + size / 2} />
      </Svg>
      <View style={st.center} pointerEvents="none">
        {done ? <Check size={56} color={pal.a} play /> : (
          <View style={st.digits} accessibilityLabel={s}>
            {s.split('').map((ch, i, arr) => <Digit key={arr.length - i} ch={ch} color={c.text} />)}
          </View>
        )}
        {title ? <Text style={[st.sub, { color: c.sub }]}>{title}</Text> : null}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  labelBox: { minWidth: 120, height: SIZES.title + 8, alignItems: 'center', justifyContent: 'center' },
  phase: { fontSize: SIZES.title, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  sub: { fontSize: SIZES.small + 1, marginTop: 2, fontVariant: ['tabular-nums'] },
  digits: { flexDirection: 'row', alignItems: 'center' },
  digit: { fontSize: 54, fontWeight: '200', fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'center' },
});
