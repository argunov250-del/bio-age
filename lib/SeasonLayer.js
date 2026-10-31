// Сезонные эффекты поверх фона (по календарю, без интернета): зимой падает снег,
// осенью идёт дождь и кружат листья, весной летят лепестки, летом мерцают светлячки.
// Каждая частица движется по своему бесконечному циклу — бесшовно, на native driver.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { reduceMotion } from './motion';

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

const KINDS = {
  winter: { count: 26, make: (r) => ({ type: 'snow', size: 2 + r() * 4, ms: 7000 + r() * 6000, sway: 10 + r() * 22 }) },
  autumn: { count: 26, make: (r, i) => (i % 5 === 0 ? { type: 'leaf', size: 14, ms: 9000 + r() * 5000, sway: 30 } : { type: 'rain', size: 14 + r() * 10, ms: 900 + r() * 500, sway: 0 }) },
  spring: { count: 18, make: (r) => ({ type: 'petal', size: 5 + r() * 4, ms: 9000 + r() * 6000, sway: 26 + r() * 20 }) },
  summer: { count: 16, make: (r) => ({ type: 'firefly', size: 3 + r() * 3, ms: 7000 + r() * 5000, sway: 16 + r() * 16 }) },
};

function Particle({ p, w, h }) {
  const t = useRef(new Animated.Value(p.offset)).current;
  useEffect(() => {
    // Первый проход — от случайной точки, дальше циклы от 0 до 1 без шва.
    const first = Animated.timing(t, { toValue: 1, duration: p.ms * (1 - p.offset), easing: Easing.linear, useNativeDriver: true });
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: p.ms, easing: Easing.linear, useNativeDriver: true }), { resetBeforeIteration: true });
    t.setValue(p.offset);
    let stopped = false;
    first.start(() => { if (!stopped) { t.setValue(0); loop.start(); } });
    return () => { stopped = true; first.stop(); loop.stop(); };
  }, [t, p]);
  const up = p.type === 'firefly';
  const y = t.interpolate({ inputRange: [0, 1], outputRange: up ? [h + 20, -20] : [-30, h + 30] });
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const x = p.type === 'rain'
    ? t.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.2] })
    : t.interpolate({ inputRange: steps, outputRange: steps.map((k) => p.sway * Math.sin(k * Math.PI * 2 * p.waves)) });
  const style = { position: 'absolute', left: p.x * w, top: 0, transform: [{ translateY: y }, { translateX: x }] };
  if (p.type === 'rain') {
    return <Animated.View style={[style, { width: 1.2, height: p.size, borderRadius: 1, backgroundColor: '#9CC9FF', opacity: 0.35, transform: [...style.transform, { rotate: '12deg' }] }]} />;
  }
  if (p.type === 'leaf') {
    const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * p.waves}deg`] });
    return <Animated.View style={[style, { opacity: 0.75, transform: [...style.transform, { rotate }] }]}><Text style={{ fontSize: p.size }}>🍂</Text></Animated.View>;
  }
  if (p.type === 'petal') {
    const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${540 * p.waves}deg`] });
    return <Animated.View style={[style, { width: p.size * 1.5, height: p.size, borderRadius: p.size, backgroundColor: '#FFC4DD', opacity: 0.7, transform: [...style.transform, { rotate }] }]} />;
  }
  if (p.type === 'firefly') {
    const opacity = t.interpolate({ inputRange: steps, outputRange: [0, 0.9, 0.3, 0.9, 0] });
    return <Animated.View style={[style, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: '#FFE58A', opacity, shadowColor: '#FFE58A', shadowOpacity: 1, shadowRadius: 6 }]} />;
  }
  return <Animated.View style={[style, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: '#FFFFFF', opacity: 0.75 }]} />;
}

export function SeasonLayer({ season }) {
  const { width, height } = useWindowDimensions();
  const parts = useMemo(() => {
    const k = KINDS[season];
    if (!k) return [];
    const r = rng(20261101);
    return Array.from({ length: k.count }, (_, i) => ({ ...k.make(r, i), x: r(), offset: r(), waves: 1 + Math.floor(r() * 2) }));
  }, [season]);
  if (!parts.length || reduceMotion()) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {parts.map((p, i) => <Particle key={season + i} p={p} w={width} h={height} />)}
    </View>
  );
}
