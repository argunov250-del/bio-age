// Силуэт человека из светящихся частиц. Точки раскиданы внутри простой фигуры
// (голова, тело, руки, ноги) детерминированно — картинка одна и та же. Частицы
// разбиты на слои; каждый слой парит по своей замкнутой траектории и мерцает,
// цикл бесшовный. Несколько частиц отрываются и уплывают вверх.
// level (0…100, необязательно) плавно ведёт параметры эволюции (lib/figureEvolution.js) внутри тира.
// tier (0…8) — ступень «Роста»: дополняет образ, не меняя его. Ступень 0 — прежний силуэт;
// выше — больше частиц, ярче свечение, мягкие кольца-ауры, нимб и искры (число частиц ограничено).
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, Line, Defs, RadialGradient, LinearGradient, Stop } from 'react-native-svg';
import { GAUGE } from './theme';
import { useColors } from './colors';
import { reduceMotion } from './motion';
import { isLite } from './perf';
import { evoParams, posture, skeletonLines, contourPoints, constellation, HATCH, MAX_LINES } from './figureEvolution';

let LAYERS = 4;

// Палитра частиц: на светлом фоне — тёмные точки и зелёный акцент, на тёмном — зелёные точки и мятные искры.
function palette(c) {
  return c.dark
    ? { dot: c.accent, hi: '#8CE9BC', aura: c.accent, ring2: '#2BB5A6', glow: 1 }
    : { dot: '#2A3441', hi: c.accent, aura: c.accent, ring2: '#1E9E62', glow: 0.55 };
}

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
function Aura({ tier, w, h, t, pal }) {
  const aw = w * 1.7, ah = h * 1.16;
  const cx = aw / 2, cy = ah / 2;
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const pulse = t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 0.8 + 0.2 * Math.sin(k * Math.PI * 4)) });
  const sparks = [];
  for (let i = 0; i < LOOK.sparks[tier]; i++) {
    const a = (i / LOOK.sparks[tier]) * Math.PI * 2 + 0.6;
    const rr = 0.9 + 0.12 * (i % 3);
    sparks.push(<Path key={i} d={sparkPath(cx + Math.cos(a) * w * 0.62 * rr, cy + Math.sin(a) * h * 0.46 * rr, 2.2 + (i % 3))} fill={pal.hi} opacity={0.5 + 0.1 * (i % 4)} />);
  }
  const rings = [];
  for (let i = 0; i < LOOK.rings[tier]; i++) {
    rings.push(<Ellipse key={i} cx={cx} cy={cy} rx={w * (0.6 + 0.09 * i)} ry={h * (0.5 + 0.035 * i)} fill="none" stroke={i % 2 ? pal.ring2 : pal.aura}
      strokeOpacity={0.2 - 0.04 * i} strokeWidth={1} strokeDasharray={i % 2 ? '3 6' : undefined} />);
  }
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: (w - aw) / 2, top: (h - ah) / 2, width: aw, height: ah, opacity: pulse }}>
      <Svg width={aw} height={ah}>
        <Defs>
          <RadialGradient id={'aura' + tier} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={pal.aura} stopOpacity={LOOK.glow[tier] * pal.glow} />
            <Stop offset="0.6" stopColor={pal.aura} stopOpacity={LOOK.glow[tier] * 0.3 * pal.glow} />
            <Stop offset="1" stopColor={pal.aura} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Ellipse cx={cx} cy={cy} rx={aw * 0.48} ry={ah * 0.5} fill={'url(#aura' + tier + ')'} />
        {rings}
        {LOOK.halo[tier] ? <Ellipse cx={cx} cy={(ah - h) / 2 - h * 0.015} rx={w * 0.17} ry={h * 0.03} fill="none" stroke={pal.hi} strokeOpacity={0.7} strokeWidth={1.6} /> : null}
        {sparks}
      </Svg>
    </Animated.View>
  );
}

const poly = (pts, h, w, close) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(w / 2 + x * h).toFixed(1)} ${(y * h).toFixed(1)}`).join('') + (close ? 'Z' : '');

// Линейные элементы эволюции: скелет, контур, штриховка, линии созвездия (статичны, один Svg).
function EvoLines({ ev, h, pal, accent, lite, gid }) {
  const w = h * 0.62;
  const grad = ev.gradient > 0.3;
  const stroke = grad ? `url(#${gid})` : pal.dot;
  const px = (x) => w / 2 + x * h;
  const els = [];
  if (ev.skeleton > 0) skeletonLines(ev.posture, lite).forEach(([a, b], i) => els.push(<Line key={'s' + i} x1={px(a[0])} y1={a[1] * h} x2={px(b[0])} y2={b[1] * h} stroke={stroke} strokeOpacity={ev.skeleton} strokeWidth={1} />));
  if (ev.contour > 0) {
    const [head, body] = contourPoints(ev.posture);
    els.push(<Path key="c1" d={poly(head, h, w, true)} fill="none" stroke={stroke} strokeOpacity={ev.contour} strokeWidth={1} />);
    els.push(<Path key="c2" d={poly(body, h, w, true)} fill="none" stroke={stroke} strokeOpacity={ev.contour} strokeWidth={1} strokeLinejoin="round" />);
  }
  if (ev.hatch > 0 && !lite) HATCH.forEach((a, i) => els.push(<Path key={'h' + i} d={`M${px(a[0])} ${a[1] * h}Q${px(a[2])} ${a[3] * h} ${px(a[4])} ${a[5] * h}`} fill="none" stroke={stroke} strokeOpacity={ev.hatch} strokeWidth={1} />));
  if (ev.constN > 0) {
    const { lines } = constellation(ev.constN, ev.posture, lite);
    lines.slice(0, MAX_LINES).forEach(([a, b], i) => els.push(<Line key={'k' + i} x1={px(a[0])} y1={a[1] * h} x2={px(b[0])} y2={b[1] * h} stroke={stroke} strokeOpacity={ev.constOp} strokeWidth={0.8} />));
  }
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="1" />
          <Stop offset="1" stopColor={pal.ring2} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      {els}
    </Svg>
  );
}

// Яркие узлы созвездия, белая сердцевина и искорка; мягко мерцают (если не calm).
function EvoStars({ ev, h, t, pal, lite, calm }) {
  const w = h * 0.62;
  const nodes = ev.constN > 0 ? constellation(ev.constN, ev.posture, lite).nodes : [];
  const [cx, cy] = posture(0, 0.3, ev.posture);
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const style = calm ? null : { opacity: t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 0.8 + 0.2 * Math.sin(k * Math.PI * 6)) }) };
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width={w} height={h}>
        {nodes.map(([x, y], i) => <Circle key={i} cx={w / 2 + x * h} cy={y * h} r={1.6 + (i % 3) * 0.4} fill={pal.hi} opacity={0.9} />)}
        {ev.core > 0 ? <Circle cx={w / 2 + cx * h} cy={cy * h} r={2.2} fill="#FFFFFF" opacity={0.9 * ev.core} stroke={pal.hi} strokeWidth={0.8} /> : null}
      </Svg>
    </Animated.View>
  );
}

// Орбитальные частицы вокруг фигуры: медленно вращаются.
function Orbits({ n, h, t, pal }) {
  const R = h * 0.52, w = h * 0.62;
  const dots = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; dots.push(<Circle key={i} cx={R + Math.cos(a) * R * 0.96} cy={R + Math.sin(a) * R * 0.96} r={1.4 + (i % 2) * 0.6} fill={pal.hi} opacity={0.7} />); }
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: w / 2 - R, top: h / 2 - R, width: R * 2, height: R * 2, transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <Svg width={R * 2} height={R * 2}>{dots}</Svg>
    </Animated.View>
  );
}

function Layer({ dots, h, t, phase, drift, pal }) {
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
        {dots.map((d, i) => <Circle key={i} cx={w / 2 + d.x * h} cy={d.y * h} r={d.r} fill={d.drift || d.bright ? pal.hi : pal.dot} opacity={d.o} />)}
      </Svg>
    </Animated.View>
  );
}

// intro — частицы собираются в фигуру при появлении (слои по очереди: всплывают и сходятся).
// still — без циклической анимации (превью), mini — вдвое меньше частиц.
export function Silhouette({ height, opacity = 0.5, tier = 0, level, intro = false, still = false, mini = false }) {
  const c = useColors();
  const pal = useMemo(() => palette(c), [c]);
  const lite = isLite();
  const tk = clampTier(tier);
  LAYERS = lite ? 2 : 4;
  const ev = useMemo(() => {
    const e = evoParams(tk, level);
    if (mini) { e.orbit = 0; e.constN = Math.min(e.constN, 8); }
    if (lite) e.orbit = Math.floor(e.orbit / 2);
    return e;
  }, [tk, level, mini, lite]);
  const dots = useMemo(() => {
    const n = lite ? Math.round(GAUGE.dots * 0.45) : GAUGE.dots;
    const all = makeDots(n);
    const extra = tk ? makeExtra(n, tk) : [];
    let out = all.concat(extra);
    if (mini) out = out.filter((_, i) => i % 2 === 0);
    // Остальные Circle (искорка, орбиты, узлы) входят в общий бюджет MAX_DOTS.
    const nodes = ev.constN ? (lite ? Math.ceil(ev.constN / 2) : ev.constN) : 0;
    const cap = MAX_DOTS - ev.orbit - nodes - 2;
    if (out.length > cap) out = out.slice(0, cap);
    const p = ev.posture;
    out = out.map((d) => { if (d.drift || !p) return d; const [x, y] = posture(d.x, d.y, p); return { ...d, x, y }; });
    if (ev.spark) { const [x, y] = posture(0, 0.3, p); out.push({ x, y, r: 2.2, o: 1, layer: 0, drift: false, bright: true }); }
    return out;
  }, [lite, tk, mini, ev]);
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
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const moving = !calm && ev.breath > 0;
  const body = moving ? {
    transform: [
      { scale: t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 1 + ev.breath * (0.5 - 0.5 * Math.cos(k * Math.PI * 2))) }) },
      { translateX: ev.idle ? t.interpolate({ inputRange: steps, outputRange: steps.map((k) => 1.2 * Math.sin(k * Math.PI * 2)) }) : 0 },
    ],
  } : null;
  const content = (
    <>
      {ev.skeleton > 0 || ev.contour > 0 || ev.constN > 0 ? <EvoLines ev={ev} h={height} pal={pal} accent={c.accent} lite={lite} gid={'evg' + tk} /> : null}
      {layers.map((l, i) => {
        const node = <Layer key={i} dots={l.dots} h={height} drift={l.drift} phase={l.phase} pal={pal}
          t={l.drift ? Animated.modulo(Animated.add(t, l.phase), 1) : t} />;
        return play ? <Animated.View key={i} style={[StyleSheet.absoluteFill, entry(l.l, LAYERS)]}>{node}</Animated.View> : node;
      })}
      {ev.constN > 0 || ev.core > 0 ? <EvoStars ev={ev} h={height} t={t} pal={pal} lite={lite} calm={calm} /> : null}
    </>
  );
  return (
    <View pointerEvents="none" style={{ width: w, height, opacity }}>
      {tk ? <Aura tier={tk} w={w} h={height} t={t} pal={pal} /> : null}
      {body ? <Animated.View style={[StyleSheet.absoluteFill, body]}>{content}</Animated.View> : content}
      {ev.orbit > 0 ? <Orbits n={ev.orbit} h={height} t={t} pal={pal} /> : null}
    </View>
  );
}
