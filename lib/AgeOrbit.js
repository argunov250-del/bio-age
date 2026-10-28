// Анимация вокруг возраста: кружочки появляются по кругу в случайных местах,
// стягиваются к центру цифр, уменьшаются и пропадают. Один общий таймер идёт
// по кругу 0 → 1; каждый кружочек проходит за цикл целое число своих путей
// со своим сдвигом, поэтому конец цикла совпадает с началом — шва нет.
// За цифрами — живая форма (MorphBlob) и два 3D-кольца, наклонённых в глубину:
// они вращаются в своей плоскости, бусина на кольце показывает объём.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ORBIT, MOTION } from './theme';
import { MorphBlob } from './MorphBlob';
import { reduceMotion } from './motion';

const GYRO = [
  { tilt: '-16deg', lean: '72deg', dir: 1, r: ORBIT.radius * 0.98 },
  { tilt: '22deg', lean: '66deg', dir: -1, r: ORBIT.radius * 0.86 },
];

// Кольцо: дуга с затуханием и бусина на её конце.
function GyroRing({ ring, ms, color }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin, ms]);
  const d = ring.r * 2 + 12;
  const len = 2 * Math.PI * ring.r;
  const rotateZ = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${ring.dir * 360}deg`] });
  return (
    <Animated.View style={[s.gyro, { width: d, height: d, marginLeft: -d / 2, marginTop: -d / 2, transform: [{ perspective: 900 }, { rotateZ: ring.tilt }, { rotateX: ring.lean }, { rotateZ }] }]}>
      <Svg width={d} height={d}>
        <Defs>
          <LinearGradient id={'arc' + ring.dir} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="1" stopColor={color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={ring.r} stroke={color} strokeOpacity={0.1} strokeWidth={1.5} fill="none" />
        <Circle cx={d / 2} cy={d / 2} r={ring.r} stroke={'url(#arc' + ring.dir + ')'} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray={`${len * 0.55} ${len}`} />
        <Circle cx={d / 2 + ring.r} cy={d / 2} r={5} fill={color} />
      </Svg>
    </Animated.View>
  );
}

// Детерминированный «случайный» генератор: картинка одна и та же при каждом запуске.
function makeDots() {
  let seed = 20261027;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: ORBIT.count }, () => {
    const a = rnd() * Math.PI * 2;
    const r = ORBIT.radius * (0.8 + rnd() * 0.35);
    return {
      x: Math.cos(a) * r,
      y: Math.sin(a) * r,
      size: ORBIT.dotMin + rnd() * (ORBIT.dotMax - ORBIT.dotMin),
      color: ORBIT.colors[Math.floor(rnd() * ORBIT.colors.length)],
      laps: 1 + Math.floor(rnd() * 3),
      offset: rnd(),
    };
  });
}

function Dot({ t, dot }) {
  const p = useMemo(() => Animated.modulo(Animated.add(Animated.multiply(t, dot.laps), dot.offset), 1), [t, dot]);
  // Ускорение к центру (как Easing.in(quad)) задано точками: easing в interpolate
  // не работает с native driver.
  const path = (v) => ({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [v, v * 0.9375, v * 0.75, v * 0.4375, 0] });
  const style = {
    width: dot.size,
    height: dot.size,
    borderRadius: dot.size / 2,
    backgroundColor: dot.color,
    marginLeft: -dot.size / 2,
    marginTop: -dot.size / 2,
    opacity: p.interpolate({ inputRange: [0, 0.12, 0.75, 1], outputRange: [0, 0.9, 0.55, 0] }),
    transform: [
      { translateX: p.interpolate(path(dot.x)) },
      { translateY: p.interpolate(path(dot.y)) },
      { scale: p.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0.2, 1, 0.75, 0] }) },
    ],
  };
  return <Animated.View style={[s.dot, style]} />;
}

export function AgeOrbit({ children, busy }) {
  const t = useRef(new Animated.Value(0)).current;
  const dots = useMemo(makeDots, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: ORBIT.periodMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);

  return (
    <View style={s.wrap}>
      <MorphBlob size={ORBIT.size} radius={ORBIT.radius * 0.62} color={ORBIT.colors[0]} busy={busy} style={s.fill} />
      <View style={s.origin} pointerEvents="none">
        {GYRO.map((g, i) => <GyroRing key={i} ring={g} ms={MOTION.gyroMs[i]} color={ORBIT.colors[i]} />)}
      </View>
      <View style={s.origin} pointerEvents="none">
        {dots.map((d, i) => <Dot key={i} t={t} dot={d} />)}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: ORBIT.size, height: ORBIT.size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  origin: { position: 'absolute', left: ORBIT.size / 2, top: ORBIT.size / 2, width: 0, height: 0 },
  dot: { position: 'absolute', left: 0, top: 0 },
  gyro: { position: 'absolute', left: 0, top: 0 },
  fill: { position: 'absolute', left: 0, top: 0 },
});
