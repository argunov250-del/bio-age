// Анимация вокруг возраста: кружочки появляются по кругу в случайных местах,
// стягиваются к центру цифр, уменьшаются и пропадают. Один общий таймер идёт
// по кругу 0 → 1; каждый кружочек проходит за цикл целое число своих путей
// со своим сдвигом, поэтому конец цикла совпадает с началом — шва нет.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { ORBIT } from './theme';

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

export function AgeOrbit({ children }) {
  const t = useRef(new Animated.Value(0)).current;
  const dots = useMemo(makeDots, []);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: ORBIT.periodMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);

  return (
    <View style={s.wrap}>
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
});
