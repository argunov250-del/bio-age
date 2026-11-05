// Силуэт человека из светящихся частиц. Точки раскиданы внутри простой фигуры
// (голова, тело, руки, ноги) детерминированно — картинка одна и та же. Частицы
// разбиты на слои; каждый слой парит по своей замкнутой траектории и мерцает,
// цикл бесшовный. Несколько частиц отрываются и уплывают вверх.
// tier (0…8) — ступень «Роста»: дополняет образ, не меняя его. Ступень 0 — прежний силуэт;
// выше — больше частиц, ярче свечение, мягкие кольца-ауры, нимб и искры (число частиц ограничено).
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
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

export const MAX_TIER = 8;
const clampTier = (v) => Math.max(0, Math.min(MAX_TIER, Math.round(+v || 0)));
// Что добавляется на каждой ступени: доля доп. частиц, свечение, число колец, нимб, искры.
const LOOK = {
  extra: [0, 0.06, 0.12, 0.2, 0.28, 0.36, 0.45, 0.55, 0.65],
  glow: [0, 0.1, 0.16, 0.22, 0.28, 0.34, 0.4, 0.46, 0.55],
  rings: [0, 0, 1, 1, 2, 2, 3, 3, 3],
  halo: [0, 0, 0, 0, 1, 1, 1, 1, 1],
  sparks: [0, 0, 0, 2, 3, 4, 6, 8, 10],
  bright: [0, 0.08, 0.12, 0.16, 0.2, 0.25, 0.3, 0.36, 0.42], // доля ярких (мятных) точек среди добавленных
};
const MAX_DOTS = 520;

// Добавочные частицы: отдельный генератор, базовый набор не меняется.
function makeExtra(n, tier) {
  let seed = 9173 + tier * 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = [];
  let guard = 0;
  const base = Math.round(n * LOOK.extra[tier]);
  while (out.length < base && guard++ < base * 40) {
    const x = rnd() - 0.5, y = rnd();
    if (!inside(x, y)) continue;
    const br = rnd() < LOOK.bright[tier];
    out.push({ x, y, r: (br ? 1.2 : 0.8) + rnd() * 1.4, o: br ? 0.9 : 0.3 + rnd() * 0.5, layer: out.length % LAYERS, drift: false, bright: br });
  }
  // Больше отрывающихся частиц у высоких ступеней.
  for (let i = 0; i < tier * 2; i++) out.push({ x: (rnd() - 0.5) * 0.8, y: rnd() * 0.5, r: 0.8 + rnd(), o: 0.55, layer: i % LAYERS, drift: true });
  return out;
}

// Четырёхконечная искра.
const sparkPath = (x, y, r) => `M${x} ${y - r}L${x + r * 0.28} ${y - r * 0.28}L${x + r} ${y}L${x + r * 0.28} ${y + r * 0.28}L${x} ${y + r}L${x - r * 0.28} ${y + r * 0.28}L${x - r} ${y}L${x - r * 0.28} ${y - r * 0.28}Z`;

// Аура за фигурой: свечение, кольца, нимб, искры. Пульсирует вместе с общим циклом t.
function Aura({ tier, w, h, t }) {
  const aw = w * 1.7, ah = h * 1.16;
  const cx = aw / 2, cy = ah / 2;
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const pulse = t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 0.8 + 0.2 * Math.sin(k * Math.PI * 4)) });
  const sparks = [];
  for (let i = 0; i < LOOK.sparks[tier]; i++) {
    const a = (i / LOOK.sparks[tier]) * Math.PI * 2 + 0.6;
    const rr = 0.9 + 0.12 * (i % 3);
    sparks.push(<Path key={i} d={sparkPath(cx + Math.cos(a) * w * 0.62 * rr, cy + Math.sin(a) * h * 0.46 * rr, 2.2 + (i % 3))} fill={NEON.mint} opacity={0.5 + 0.1 * (i % 4)} />);
  }
  const rings = [];
  for (let i = 0; i < LOOK.rings[tier]; i++) {
    rings.push(<Ellipse key={i} cx={cx} cy={cy} rx={w * (0.6 + 0.09 * i)} ry={h * (0.5 + 0.035 * i)} fill="none" stroke={i % 2 ? NEON.teal : NEON.emerald}
      strokeOpacity={0.2 - 0.04 * i} strokeWidth={1} strokeDasharray={i % 2 ? '3 6' : undefined} />);
  }
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: (w - aw) / 2, top: (h - ah) / 2, width: aw, height: ah, opacity: pulse }}>
      <Svg width={aw} height={ah}>
        <Defs>
          <RadialGradient id={'aura' + tier} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={NEON.emerald} stopOpacity={LOOK.glow[tier]} />
            <Stop offset="0.6" stopColor={NEON.emerald} stopOpacity={LOOK.glow[tier] * 0.3} />
            <Stop offset="1" stopColor={NEON.emerald} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={cx} cy={cy} rx={aw * 0.48} ry={ah * 0.5} fill={'url(#aura' + tier + ')'} />
        {rings}
        {LOOK.halo[tier] ? <Ellipse cx={cx} cy={(ah - h) / 2 - h * 0.015} rx={w * 0.17} ry={h * 0.03} fill="none" stroke={NEON.mint} strokeOpacity={0.7} strokeWidth={1.6} /> : null}
        {sparks}
      </Svg>
    </Animated.View>
  );
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
        {dots.map((d, i) => <Circle key={i} cx={w / 2 + d.x * h} cy={d.y * h} r={d.r} fill={d.drift || d.bright ? NEON.mint : NEON.emerald} opacity={d.o} />)}
      </Svg>
    </Animated.View>
  );
}

// intro — частицы собираются в фигуру при появлении (слои по очереди: всплывают и сходятся).
// still — без циклической анимации (превью), mini — вдвое меньше частиц.
export function Silhouette({ height, opacity = 0.5, tier = 0, intro = false, still = false, mini = false }) {
  const lite = isLite();
  const tk = clampTier(tier);
  LAYERS = lite ? 2 : 4;
  const dots = useMemo(() => {
    const n = lite ? Math.round(GAUGE.dots * 0.45) : GAUGE.dots;
    const all = makeDots(n);
    const extra = tk ? makeExtra(n, tk) : [];
    let out = all.concat(extra);
    if (mini) out = out.filter((_, i) => i % 2 === 0);
    return out.length > MAX_DOTS ? out.slice(0, MAX_DOTS) : out;
  }, [lite, tk, mini]);
  const t = useRef(new Animated.Value(0)).current;
  const calm = reduceMotion() || still;
  useEffect(() => {
    if (calm) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: GAUGE.floatMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, calm]);
  const play = intro && !reduceMotion();
  const enter = useRef(new Animated.Value(play ? 0 : 1)).current;
  useEffect(() => {
    if (!play) return undefined;
    const a = Animated.timing(enter, { toValue: 1, duration: lite ? 900 : 1600, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [enter, play, lite]);
  const layers = useMemo(() => {
    const out = [];
    for (let l = 0; l < LAYERS; l++) {
      out.push({ dots: dots.filter((d) => d.layer === l && !d.drift), phase: l / LAYERS, drift: false, l });
      out.push({ dots: dots.filter((d) => d.layer === l && d.drift), phase: l / LAYERS, drift: true, l });
    }
    return out;
  }, [dots, lite]);
  const w = height * 0.62;
  // Слой l входит со смещением по времени: к концу все на месте.
  const entry = (l, n) => {
    const a = Math.min(0.6, (l / n) * 0.5), b = Math.min(1, a + 0.45);
    return {
      opacity: enter.interpolate({ inputRange: [0, a, b, 1], outputRange: [0, 0, 1, 1] }),
      transform: [
        { translateY: enter.interpolate({ inputRange: [0, a, b, 1], outputRange: [height * 0.14, height * 0.14, 0, 0] }) },
        { scale: enter.interpolate({ inputRange: [0, a, b, 1], outputRange: [1.18, 1.18, 1, 1] }) },
      ],
    };
  };
  return (
    <View pointerEvents="none" style={{ width: w, height, opacity }}>
      {tk ? <Aura tier={tk} w={w} h={height} t={t} /> : null}
      {layers.map((l, i) => {
        const node = <Layer key={i} dots={l.dots} h={height} drift={l.drift} phase={l.phase}
          t={l.drift ? Animated.modulo(Animated.add(t, l.phase), 1) : t} />;
        return play ? <Animated.View key={i} style={[StyleSheet.absoluteFill, entry(l.l, LAYERS)]}>{node}</Animated.View> : node;
      })}
    </View>
  );
}
