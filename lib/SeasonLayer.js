// Эффекты поверх фона. По календарю: зимой снег, осенью дождь и листья, весной
// лепестки, летом светлячки. Если включена погода — как за окном: дождь, ливень с
// молниями, снег, туман, облака, ясной ночью звёзды, ясным днём — только листья/лепестки.
// Каждая частица движется по своему бесконечному циклу — бесшовно, на native driver.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { reduceMotion } from './motion';
import { isLite } from './perf';
import { fallsFor, FALL_MS, STAY_MS, particleColors } from './WeatherFall';
import { useColors } from './colors';

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

const KINDS = {
  winter: { count: 26, make: (r) => ({ type: 'snow', size: 2 + r() * 4, ms: 7000 + r() * 6000, sway: 10 + r() * 22 }) },
  autumn: { count: 26, make: (r, i) => (i % 5 === 0 ? { type: 'leaf', size: 14, ms: 9000 + r() * 5000, sway: 30 } : { type: 'rain', size: 14 + r() * 10, ms: 900 + r() * 500, sway: 0 }) },
  spring: { count: 18, make: (r) => ({ type: 'petal', size: 5 + r() * 4, ms: 9000 + r() * 6000, sway: 26 + r() * 20 }) },
  summer: { count: 16, make: (r) => ({ type: 'firefly', size: 3 + r() * 3, ms: 7000 + r() * 5000, sway: 16 + r() * 16 }) },
  rain: { count: 30, make: (r) => ({ type: 'rain', size: 14 + r() * 12, ms: 800 + r() * 450, sway: 0 }) },
  storm: { count: 40, make: (r) => ({ type: 'rain', size: 18 + r() * 14, ms: 600 + r() * 300, sway: 0 }), flash: true },
  snow: { count: 30, make: (r) => ({ type: 'snow', size: 2 + r() * 4, ms: 7000 + r() * 6000, sway: 10 + r() * 22 }) },
  leaves: { count: 6, make: (r) => ({ type: 'leaf', size: 14, ms: 9000 + r() * 5000, sway: 30 }) },
  clouds: { count: 4, make: (r) => ({ type: 'cloud', size: 140 + r() * 120, ms: 40000 + r() * 30000, sway: 0 }) },
  fog: { count: 5, make: (r) => ({ type: 'fog', size: 260 + r() * 160, ms: 50000 + r() * 30000, sway: 0 }) },
  stars: { count: 28, make: (r) => ({ type: 'star', size: 1.5 + r() * 2, ms: 3000 + r() * 4000, sway: 0 }) },
};

function Particle({ p, w, h }) {
  const PC = particleColors(useColors().dark);
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
  if (p.type === 'cloud' || p.type === 'fog') {
    // Медленно плывут слева направо по своей высоте.
    const x = t.interpolate({ inputRange: [0, 1], outputRange: [-p.size, w + p.size * 0.2] });
    const isFog = p.type === 'fog';
    const ww = p.size, hh = p.size * (isFog ? 0.4 : 0.5);
    // Мягкие края — радиальный градиент, без резкой границы.
    return (
      <Animated.View style={{ position: 'absolute', top: p.y * h * (isFog ? 0.9 : 0.5), left: 0, transform: [{ translateX: x }] }}>
        <Svg width={ww} height={hh}>
          <Defs>
            <RadialGradient id={'haze' + p.type} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={PC.haze} stopOpacity={(isFog ? 0.13 : 0.1) * (PC.op < 1 ? 1.4 : 1)} />
              <Stop offset="1" stopColor={PC.haze} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={ww / 2} cy={hh / 2} rx={ww / 2} ry={hh / 2} fill={'url(#haze' + p.type + ')'} />
        </Svg>
      </Animated.View>
    );
  }
  if (p.type === 'star') {
    const steps = [0, 0.25, 0.5, 0.75, 1];
    const opacity = t.interpolate({ inputRange: steps, outputRange: [0.2, 0.9, 0.35, 0.8, 0.2] });
    return <Animated.View style={{ position: 'absolute', left: p.x * w, top: p.y * h * 0.6, width: p.size, height: p.size, borderRadius: p.size, backgroundColor: PC.star, opacity }} />;
  }
  const up = p.type === 'firefly';
  const y = t.interpolate({ inputRange: [0, 1], outputRange: up ? [h + 20, -20] : [-30, h + 30] });
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const x = p.type === 'rain'
    ? t.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.2] })
    : t.interpolate({ inputRange: steps, outputRange: steps.map((k) => p.sway * Math.sin(k * Math.PI * 2 * p.waves)) });
  const style = { position: 'absolute', left: p.x * w, top: 0, transform: [{ translateY: y }, { translateX: x }] };
  if (p.type === 'rain') {
    return <Animated.View style={[style, { width: 1.5, height: p.size, borderRadius: 1, backgroundColor: PC.rain, opacity: 0.5 * PC.op, transform: [...style.transform, { rotate: '12deg' }] }]} />;
  }
  if (p.type === 'leaf') {
    const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * p.waves}deg`] });
    return <Animated.View style={[style, { opacity: 0.75, transform: [...style.transform, { rotate }] }]}><Text style={{ fontSize: p.size, opacity: PC.op }}>🍂</Text></Animated.View>;
  }
  if (p.type === 'petal') {
    const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${540 * p.waves}deg`] });
    return <Animated.View style={[style, { width: p.size * 1.5, height: p.size, borderRadius: p.size, backgroundColor: PC.petal, opacity: 0.7, transform: [...style.transform, { rotate }] }]} />;
  }
  if (p.type === 'firefly') {
    const opacity = t.interpolate({ inputRange: steps, outputRange: [0, 0.9, 0.3, 0.9, 0] });
    return <Animated.View style={[style, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: PC.firefly, opacity, ...(PC.op < 1 ? null : { shadowColor: PC.firefly, shadowOpacity: 1, shadowRadius: 6 }) }]} />;
  }
  return <Animated.View style={[style, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: PC.snow, opacity: 0.75 }]} />;
}

// Вспышки молний при грозе: редкие двойные вспышки, цикл без шва.
function Lightning() {
  const PC = particleColors(useColors().dark);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  const opacity = t.interpolate({ inputRange: [0, 0.6, 0.61, 0.62, 0.64, 0.65, 0.7, 1], outputRange: [0, 0, 0.35, 0.05, 0.25, 0, 0, 0] });
  return <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: PC.flash, opacity: PC.op < 1 ? Animated.multiply(opacity, 0.5) : opacity }]} />;
}

// Фоновые эффекты (туман, облака, звёзды, светлячки, вспышки грозы) играют минуту
// и останавливаются: звёзды остаются неподвижными, остальное тает. Дождь, снег,
// листья и лепестки падают на карточки — это lib/WeatherFall.js.
// Фон под всем интерфейсом: без elevation и с zIndex 0 (на Android elevation влияет на порядок).
const LAYER = { ...StyleSheet.absoluteFillObject, zIndex: 0, elevation: 0 };

export function SeasonLayer({ season }) {
  const { width, height } = useWindowDimensions();
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    setEnded(false);
    const id = setTimeout(() => setEnded(true), FALL_MS + STAY_MS);
    return () => clearTimeout(id);
  }, [season]);
  if (season === 'storm') return ended || reduceMotion() ? null : <View style={LAYER} pointerEvents="none" testID="season-layer"><Lightning /></View>;
  if (fallsFor(season)) return null;
  return ended ? <StillStars season={season} w={width} h={height} /> : <Moving season={season} w={width} h={height} />;
}

// Неподвижные звёзды после окончания анимации (только ясной ночью).
function StillStars({ season, w, h }) {
  const PC = particleColors(useColors().dark);
  const stars = useMemo(() => {
    if (season !== 'stars') return [];
    const r = rng(77);
    return Array.from({ length: 14 }, () => ({ x: r() * w, y: r() * h * 0.6, size: 1.5 + r() * 1.5, o: 0.3 + r() * 0.4 }));
  }, [season, w, h]);
  return (
    <View style={LAYER} pointerEvents="none" testID="season-layer">
      {stars.map((p, i) => <View key={i} style={{ position: 'absolute', left: p.x, top: p.y, width: p.size, height: p.size, borderRadius: p.size, backgroundColor: PC.star, opacity: p.o }} />)}
    </View>
  );
}

function Moving({ season, w: width, h: height }) {
  const parts = useMemo(() => {
    const k = KINDS[season];
    if (!k) return [];
    const r = rng(20261101);
    const n = isLite() ? Math.round(k.count * 0.4) : k.count;
    return Array.from({ length: n }, (_, i) => ({ ...k.make(r, i), x: r(), y: r(), offset: r(), waves: 1 + Math.floor(r() * 2) }));
  }, [season]);
  if (!parts.length || reduceMotion()) return null; // при «Убрать анимацию» эффектов нет
  return (
    <View style={LAYER} pointerEvents="none" testID="season-layer">
      {KINDS[season].flash ? <Lightning /> : null}
      {parts.map((p, i) => <Particle key={season + i} p={p} w={width} h={height} />)}
    </View>
  );
}
