// Простые графики на react-native-svg: столбики (шаги, сон) и линия (пульс, биовозраст).
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { SIZES } from './theme';
import { useColors } from './colors';

const PAD_TOP = 8;
const LABELS_H = 18;

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e) => setW(e.nativeEvent.layout.width)];
}

// data: [{ v, label? }]; target — пунктир цели; highlightLast — последний столбик ярче.
export function BarChart({ data, color, target, height = SIZES.chart, labels, highlightLast = true }) {
  const c = useColors();
  const col = color || c.accent;
  const [w, onLayout] = useWidth();
  const max = Math.max(1, target || 0, ...data.map((d) => d.v)) * 1.1;
  const h = height - LABELS_H;
  const gap = data.length > 20 ? 2 : 4;
  const bw = w ? (w - gap * (data.length - 1)) / data.length : 0;
  const y = (v) => PAD_TOP + (h - PAD_TOP) * (1 - v / max);
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w ? (
        <Svg width={w} height={h}>
          {data.map((d, i) => {
            const top = y(d.v);
            const last = highlightLast && i === data.length - 1;
            return d.v > 0 ? (
              <Rect key={i} x={i * (bw + gap)} y={top} width={bw} height={h - top} rx={Math.min(3, bw / 2)}
                fill={col} opacity={last ? 1 : target && d.v >= target ? 0.85 : 0.45} />
            ) : (
              <Rect key={i} x={i * (bw + gap)} y={h - 2} width={bw} height={2} rx={1} fill={c.line} opacity={0.5} />
            );
          })}
          {target ? <Line x1={0} x2={w} y1={y(target)} y2={y(target)} stroke={c.text} strokeOpacity={0.35} strokeDasharray="4 4" /> : null}
        </Svg>
      ) : null}
      {labels ? <Labels labels={labels} /> : null}
    </View>
  );
}

// points: [{ x, y }] (x — число, например время); плавная линия с заливкой.
export function LineChart({ points, color, height = SIZES.chart, labels, yPad = 0.15, dotLast = true }) {
  const c = useColors();
  color = color || c.accent;
  const [w, onLayout] = useWidth();
  const h = height - LABELS_H;
  if (points.length < 2) {
    return <View style={{ height }} />;
  }
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = Math.max((y1 - y0) * yPad, 0.5);
  y0 -= pad; y1 += pad;
  const PADX = 6; // чтобы точка на конце линии не обрезалась
  const px = (x) => PADX + (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * (w - PADX * 2));
  const py = (v) => PAD_TOP + (h - PAD_TOP) * (1 - (v - y0) / (y1 - y0));
  // Сглаживание: кубические кривые через середины отрезков.
  let d = `M${px(xs[0])},${py(ys[0])}`;
  for (let i = 1; i < points.length; i++) {
    const mx = (px(xs[i - 1]) + px(xs[i])) / 2;
    d += ` C${mx},${py(ys[i - 1])} ${mx},${py(ys[i])} ${px(xs[i])},${py(ys[i])}`;
  }
  const area = `${d} L${px(xs[xs.length - 1])},${h} L${px(xs[0])},${h} Z`;
  const gid = 'g' + color.replace('#', '');
  return (
    <View onLayout={onLayout} style={{ height }}>
      {w ? (
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.35} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill={`url(#${gid})`} />
          <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {dotLast ? <Circle cx={px(xs[xs.length - 1])} cy={py(ys[ys.length - 1])} r={4.5} fill={color} stroke={c.card} strokeWidth={2} /> : null}
        </Svg>
      ) : null}
      {labels ? <Labels labels={labels} /> : null}
    </View>
  );
}

function Labels({ labels }) {
  const c = useColors();
  return (
    <View style={s.labels}>
      {labels.map((l, i) => <Text key={i} style={[s.label, { color: c.sub }]}>{l}</Text>)}
    </View>
  );
}

const s = StyleSheet.create({
  labels: { height: LABELS_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: SIZES.tiny },
});

// Мини-график для карточек: линия со светящейся заливкой, без подписей.
export function Spark({ values, color, height = 34 }) {
  const [w, onLayout] = useWidth();
  const v = values.filter((x) => x != null && x > 0);
  const id = 'spark' + color.replace('#', '');
  let body = null;
  if (w && v.length > 1) {
    const min = Math.min(...v), max = Math.max(...v);
    const span = max - min || 1;
    const pts = v.map((y, i) => [(i / (v.length - 1)) * w, 3 + (height - 6) * (1 - (y - min) / span)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
    const last = pts[pts.length - 1];
    body = (
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.35" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={`${line}L${w},${height}L0,${height}Z`} fill={`url(#${id})`} />
        <Path d={line} stroke={color} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
        <Circle cx={last[0]} cy={last[1]} r={5} fill={color} opacity={0.25} />
        <Circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
      </Svg>
    );
  }
  return <View onLayout={onLayout} style={{ height }}>{body}</View>;
}
