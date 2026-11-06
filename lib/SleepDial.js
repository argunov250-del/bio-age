// Циферблат сна: сутки по кругу (0:00 сверху), дуга от отбоя до подъёма. При смене времени
// концы дуги плавно (пружинисто) едут по кратчайшему пути, длительность в центре «докручивается».
// «Убрать анимацию» — всё меняется сразу.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { useColors } from './colors';
import { SIZES } from './theme';
import { reduceMotion, dur } from './motion';
import { hoursMin } from './time';
import { fit } from './fit';
import { tr } from './i18n';

const DAY = 1440;
const mod = (x) => ((x % DAY) + DAY) % DAY;

// Плавное движение по кругу суток: кратчайший путь, лёгкий «пружинный» перелёт.
export function useSmoothMin(target) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduceMotion() || cur.current === target) { cur.current = target; setV(target); return undefined; }
    const from = cur.current;
    let delta = mod(target - from);
    if (delta > DAY / 2) delta -= DAY;
    const t0 = Date.now();
    const total = dur(650);
    let raf = 0;
    const step = () => {
      const t = Math.min(1, (Date.now() - t0) / total);
      const k = t >= 1 ? 1 : 1 - Math.exp(-7 * t) * Math.cos(9 * t);
      cur.current = from + delta * k;
      setV(cur.current);
      if (t < 1) raf = requestAnimationFrame(step);
      else { cur.current = target; setV(target); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return v;
}

const pt = (cx, cy, r, min) => {
  const a = (mod(min) / DAY) * 2 * Math.PI - Math.PI / 2;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

export function arcPath(cx, cy, r, bed, wake) {
  const len = mod(wake - bed);
  if (len < 1) return null;
  const [x0, y0] = pt(cx, cy, r, bed);
  const [x1, y1] = pt(cx, cy, r, bed + len);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${len > DAY / 2 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function SleepDial({ bed, wake, size = 220 }) {
  const c = useColors();
  const b = useSmoothMin(bed);
  const w = useSmoothMin(wake);
  const cx = size / 2, r = size / 2 - 18, sw = 16;
  const len = mod(w - b);
  const hours = len / 60;
  const d = arcPath(cx, cx, r, b, b + len);
  const [bx, by] = pt(cx, cx, r, b);
  const [wx, wy] = pt(cx, cx, r, b + len);
  const lab = [[0, '0'], [360, '6'], [720, '12'], [1080, '18']];
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessible accessibilityLabel={tr('Сон: ') + hoursMin(hours)}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={cx} cy={cx} r={r} stroke={c.text} strokeOpacity={0.08} strokeWidth={sw} fill="none" />
        {Array.from({ length: 24 }, (_, i) => {
          const [x0, y0] = pt(cx, cx, r - sw / 2 - 3, i * 60);
          const [x1, y1] = pt(cx, cx, r - sw / 2 - (i % 6 === 0 ? 9 : 6), i * 60);
          return <Line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={c.text} strokeOpacity={i % 6 === 0 ? 0.35 : 0.15} strokeWidth={1.5} strokeLinecap="round" />;
        })}
        {d ? <Path d={d} stroke={c.accent} strokeWidth={sw} strokeLinecap="round" fill="none" /> : null}
        <Circle cx={bx} cy={by} r={sw / 2 - 3} fill={c.card} />
        <Circle cx={wx} cy={wy} r={sw / 2 - 3} fill={c.card} />
      </Svg>
      {lab.map(([m, t]) => {
        const [x, y] = pt(cx, cx, r - sw / 2 - 24, m);
        return <Text key={m} {...fit(1, 0.7)} style={[s.tick, { left: x - 12, top: y - 8, color: c.sub }]}>{t}</Text>;
      })}
      <View style={[StyleSheet.absoluteFill, s.center]} pointerEvents="none">
        <Text {...fit(1, 0.6)} style={[s.dur, { color: c.text }]}>{hoursMin(hours)}</Text>
        <Text {...fit(1, 0.7)} style={[s.sub, { color: c.sub }]}>{tr('на сон')}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 64 },
  dur: { fontSize: SIZES.title, fontWeight: '700' },
  sub: { fontSize: SIZES.small },
  tick: { position: 'absolute', width: 24, height: 16, textAlign: 'center', fontSize: SIZES.tiny },
});
