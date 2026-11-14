// Шкала с рисками (R3): дуга 270°, риски по единице 0–21, заполняются от нуля вместе с числом,
// целевой диапазон — плотная полоса внутри рисок. Нет данных — пустая шкала и «—».
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { useColors } from './colors';
import { useCountUp } from './motion';
import { fmt } from './format';
import { fit } from './fit';
import { SIZES, ACCENTS } from './theme';
import { num, clamp01 } from './perfView';

const START = 135, SWEEP = 270;
const pt = (cx, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cx + r * Math.sin(a)]; };
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };

export function tickArc(cx, r, lo, hi, max) {
  const a = clamp01(lo / max), b = clamp01(hi / max);
  if (!(b > a)) return null;
  const [x0, y0] = pt(cx, r, START + SWEEP * a);
  const [x1, y1] = pt(cx, r, START + SWEEP * b);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${(b - a) * SWEEP > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function TickGauge({ id, value, max = 21, digits = 1, target, size = 240, status, statusColor, from = ACCENTS.strain, to = ACCENTS.strainTo, testID }) {
  const c = useColors();
  const v = num(value);
  const shown = useCountUp('tick:' + id, v);
  const cx = size / 2;
  const rOut = cx - 6, rIn = rOut - size * 0.075;
  const ticks = [];
  for (let i = 0; i <= max; i++) {
    const deg = START + SWEEP * (i / max);
    const major = i % 7 === 0;
    const [x0, y0] = pt(cx, rOut, deg);
    const [x1, y1] = pt(cx, major ? rIn - 4 : rIn, deg);
    const on = shown != null && i <= shown + 0.001;
    ticks.push(<Line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={on ? mix(from, to, i / max) : c.text} strokeOpacity={on ? 1 : 0.2} strokeWidth={major ? 3.2 : 2.4} strokeLinecap="round" />);
  }
  const tl = target && num(target.low) != null && num(target.high) != null ? target : null;
  const arc = tl ? tickArc(cx, rIn - size * 0.075, tl.low, tl.high, max) : null;
  const k = shown == null ? 0 : clamp01(shown / max);
  const [nx, ny] = pt(cx, rIn - size * 0.075, START + SWEEP * k);
  const txt = shown == null ? '—' : fmt(shown, digits);
  const [lx0, ly0] = pt(cx, rOut - 2, START);
  const [lx1, ly1] = pt(cx, rOut - 2, START + SWEEP);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={txt + '/' + max + (status ? ', ' + status : '')} testID={testID || 'tick-gauge'}>
      <Svg width={size} height={size}>
        {ticks}
        {arc ? <Path d={arc} stroke={from} strokeOpacity={0.75} strokeWidth={5} strokeLinecap="round" fill="none" /> : null}
        {shown != null ? <Circle cx={nx} cy={ny} r={4.5} fill={mix(from, to, k)} stroke={c.text} strokeOpacity={0.9} strokeWidth={1.5} /> : null}
      </Svg>
      <View style={s.center} pointerEvents="none">
        <Text style={[s.num, { color: v == null ? c.sub : c.text, fontSize: size * 0.27 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{txt}</Text>
        <Text style={[s.of, { color: c.sub }]} {...fit(1, 0.7)}>{'/ ' + max}</Text>
        {status ? <Text style={[s.status, { color: statusColor || c.sub }]} {...fit(1, 0.7)}>{status}</Text> : null}
      </View>
      <Text style={[s.end, { left: Math.max(0, lx0 - 8), top: ly0 + 4, color: c.sub }]}>0</Text>
      <Text style={[s.end, { left: Math.min(size - 20, lx1 - 8), top: ly1 + 4, color: c.sub }]}>{max}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 2 },
  num: { fontWeight: '800', letterSpacing: -1 },
  of: { fontSize: SIZES.small, fontWeight: '700' },
  status: { fontSize: SIZES.body, fontWeight: '800', marginTop: 2 },
  end: { position: 'absolute', fontSize: SIZES.tiny + 1, fontWeight: '700', width: 20, textAlign: 'center' },
});
