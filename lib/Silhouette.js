// Силуэт человека из светящихся частиц. Точки раскиданы внутри простой фигуры
// (голова, тело, руки, ноги) детерминированно — картинка одна и та же. Частицы
// разбиты на слои; каждый слой парит по своей замкнутой траектории и мерцает,
// цикл бесшовный. Несколько частиц отрываются и уплывают вверх.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { GAUGE, NEON } from './theme';
import { reduceMotion } from './motion';
import { isLite } from './perf';

let LAYERS = 4;

// Расстояние от точки до отрезка — для рук и ног.
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

// Фигура в координатах 0…1 по высоте, x от −0.5 до 0.5.
function inside(x, y) {
  if (Math.hypot(x, (y - 0.09) * 0.92) < 0.075) return true; // голова
  if (Math.abs(x) < 0.03 && y > 0.15 && y < 0.2) return true; // шея
  if (y >= 0.19 && y <= 0.55) { // тело сужается к поясу
    const half = 0.15 - (y - 0.19) * 0.16;
    if (Math.abs(x) < half) return true;
  }
  const ax = Math.abs(x);
  if (segDist(ax, y, 0.15, 0.22, 0.25, 0.53) < 0.035) return true; // руки
  if (segDist(ax, y, 0.065, 0.55, 0.095, 0.98) < 0.045) return true; // ноги
  return false;
}

function makeDots(n) {
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const dots = [];
  let guard = 0;
  while (dots.length < n && guard++ < n * 40) {
    const x = rnd() - 0.5, y = rnd();
    if (!inside(x, y)) continue;
    dots.push({ x, y, r: 0.9 + rnd() * 1.7, o: 0.35 + rnd() * 0.65, layer: dots.length % LAYERS, drift: false });
  }
  // Отрывающиеся частицы над плечами и головой.
  for (let i = 0; i < 14; i++) dots.push({ x: (rnd() - 0.5) * 0.7, y: rnd() * 0.45, r: 0.8 + rnd(), o: 0.5, layer: i % LAYERS, drift: true });
  return dots;
}

function Layer({ dots, h, t, phase, drift }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const p = (k) => (k + phase) * Math.PI * 2;
  const style = drift
    ? {
      opacity: t.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.9, 0.4, 0] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.18] }) }],
    }
    : {
      opacity: t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 0.75 + 0.25 * Math.sin(p(k) * 2)) }),
      transform: [
        { translateX: t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 1.6 * Math.cos(p(k))) }) },
        { translateY: t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 2.4 * Math.sin(p(k))) }) },
      ],
    };
  const w = h * 0.62;
  return (
    <Animated.View renderToHardwareTextureAndroid style={[StyleSheet.absoluteFill, style]}>
      <Svg width={w} height={h}>
        {dots.map((d, i) => <Circle key={i} cx={w / 2 + d.x * h} cy={d.y * h} r={d.r} fill={d.drift ? NEON.mint : NEON.emerald} opacity={d.o} />)}
      </Svg>
    </Animated.View>
  );
}

export function Silhouette({ height, opacity = 0.5 }) {
  const lite = isLite();
  LAYERS = lite ? 2 : 4;
  const dots = useMemo(() => makeDots(lite ? Math.round(GAUGE.dots * 0.45) : GAUGE.dots), [lite]);
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: GAUGE.floatMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  const layers = useMemo(() => {
    const out = [];
    for (let l = 0; l < LAYERS; l++) {
      out.push({ dots: dots.filter((d) => d.layer === l && !d.drift), phase: l / LAYERS, drift: false });
      out.push({ dots: dots.filter((d) => d.layer === l && d.drift), phase: l / LAYERS, drift: true });
    }
    return out;
  }, [dots, lite]);
  return (
    <View pointerEvents="none" style={{ width: height * 0.62, height, opacity }}>
      {layers.map((l, i) => (
        <Layer key={i} dots={l.dots} h={height} drift={l.drift} phase={l.phase}
          t={l.drift ? Animated.modulo(Animated.add(t, l.phase), 1) : t} />
      ))}
    </View>
  );
}
