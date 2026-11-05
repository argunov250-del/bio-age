// Плавный график-«область»: зелёная кривая, мягкая заливка, мелкие точки, пунктир-ориентир
// с подписью («паспортный 27», «норма 7 ч»), крупная конечная точка с ореолом.
// Линия «рисуется» слева направо при появлении (без анимации при «Убрать анимацию»).
// Используется в «Динамике» на обзоре и в подробных экранах метрик.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Defs, ClipPath, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { useColors } from './colors';
import { reduceMotion, dur } from './motion';
import { SIZES } from './theme';

const PX = 8, PY = 16, LABELS_H = 18;

// points: [{ x, y }] по возрастанию x; refValue/refLabel — пунктирный ориентир.
export function AreaChart({ points, color, refValue, refLabel, height = 120, labels, gid = 'areaFill', animate = true }) {
  const c = useColors();
  const col = color || c.accent;
  const [w, setW] = useState(0);
  const [p, setP] = useState(() => (animate && !reduceMotion() ? 0 : 1));
  const n = points ? points.length : 0;
  const sig = n ? n + ':' + points[0].x + ':' + points[n - 1].x : '';
  useEffect(() => {
    if (!animate || reduceMotion() || !n) { setP(1); return undefined; }
    let raf = 0;
    const t0 = Date.now(), ms = dur(900);
    setP(0);
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      setP(1 - Math.pow(1 - k, 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [sig, animate]);

  const geo = useMemo(() => {
    if (!w || n < 2) return null;
    const hasRef = refValue != null && isFinite(refValue);
    const ys = points.map((q) => q.y);
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (hasRef) { lo = Math.min(lo, refValue); hi = Math.max(hi, refValue); }
    const pad = Math.max((hi - lo) * 0.15, 0.5);
    lo -= pad; hi += pad;
    const x0 = points[0].x, x1 = points[n - 1].x;
    const pw = w - PX * 2, ph = height - PY * 2;
    const X = (x) => PX + (x1 === x0 ? 0 : ((x - x0) / (x1 - x0)) * pw);
    const Y = (v) => PY + ph - ((v - lo) / (hi - lo)) * ph;
    const pts = points.map((q) => [X(q.x), Y(q.y)]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1);
      d += ` C${mx},${pts[i - 1][1].toFixed(1)} ${mx},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
    }
    return { pts, d, last: pts[pts.length - 1], cy: hasRef ? Y(refValue) : null };
  }, [w, sig, refValue, height]);

  let body = null;
  if (geo) {
    const { pts, d, last, cy } = geo;
    const clipId = gid + 'Clip';
    const endOp = Math.min(1, Math.max(0, (p - 0.85) / 0.15));
    const dotR = pts.length > 60 ? 0 : 1.8;
    body = (
      <Svg width={w} height={height}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={c.dark ? 0.34 : 0.22} />
            <Stop offset="1" stopColor={col} stopOpacity="0" />
          </LinearGradient>
          <ClipPath id={clipId}><Rect x={0} y={0} width={Math.max(0.01, w * p)} height={height} /></ClipPath>
        </Defs>
        {cy != null ? <Line x1={PX} x2={w - PX} y1={cy} y2={cy} stroke={c.muted} strokeOpacity={0.8} strokeDasharray="4 4" /> : null}
        {cy != null && refLabel ? <SvgText x={w - PX} y={cy - 5} fill={c.sub} fontSize="10" textAnchor="end">{refLabel}</SvgText> : null}
        <Path d={`${d} L${last[0].toFixed(1)},${height} L${pts[0][0].toFixed(1)},${height} Z`} fill={`url(#${gid})`} clipPath={`url(#${clipId})`} />
        <Path d={d} stroke={col} strokeWidth={2.2} fill="none" strokeLinecap="round" clipPath={`url(#${clipId})`} />
        {dotR ? pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={dotR} fill={col} opacity={0.8} clipPath={`url(#${clipId})`} />) : null}
        <Circle cx={last[0]} cy={last[1]} r={9} fill={col} opacity={0.25 * endOp} />
        <Circle cx={last[0]} cy={last[1]} r={5} fill={col} opacity={endOp} />
      </Svg>
    );
  }
  return (
    <View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height }}>{body}</View>
      {labels ? (
        <View style={s.labels}>
          {labels.map((l, i) => <Text key={i} style={[s.label, { color: c.sub }]}>{l}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  labels: { height: LABELS_H, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: SIZES.tiny },
});
