// Стеклянные индикаторы для «Сегодня» и «Сон»: дуга с градиентом и бегунком (R1), шкала с рисками (R3),
// ползунок диапазона пульса с сердцем (R1), мини-столбики. Значения «рисуются» от нуля счётчиком (useCountUp);
// при «Убрать анимацию» сразу на месте. Нет значения — пустая дорожка и прочерк, без выдуманных чисел.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useColors } from './colors';
import { useCountUp } from './motion';
import { fit } from './fit';
import { fmt } from './format';
import { IconHeart } from './homeIcons';
import { SIZES } from './theme';

const RAD = Math.PI / 180;
const finite = (x) => typeof x === 'number' && isFinite(x);
const clamp01 = (x) => Math.min(1, Math.max(0, finite(x) ? x : 0));
// Точка на окружности: угол в градусах, 0° — вправо, по часовой стрелке (как в SVG).
const pt = (cx, cy, r, deg) => [cx + r * Math.cos(deg * RAD), cy + r * Math.sin(deg * RAD)];
const START = 135; // дуга 270°: от нижнего левого угла вокруг верха к нижнему правому
const SWEEP = 270;

export function arcPath(cx, cy, r, frac) {
  const f = clamp01(frac);
  if (f <= 0.001) return '';
  const [x0, y0] = pt(cx, cy, r, START);
  const [x1, y1] = pt(cx, cy, r, START + SWEEP * f);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${SWEEP * f > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

// Большая дуга: градиент from→to, на конце — бегунок. children — содержимое в центре.
export function ArcGauge({ id, value, max = 100, size = 240, from, to, children, accessibilityLabel }) {
  const c = useColors();
  const v = finite(value) ? value : null;
  const shown = useCountUp('arc:' + id, v);
  const sw = Math.round(size * 0.075);
  const cx = size / 2;
  const r = cx - sw - 2;
  const f = shown == null ? 0 : clamp01(shown / max);
  const [tx, ty] = pt(cx, cx, r, START + SWEEP * f);
  const gid = 'arcg-' + id;
  const a = from || c.accent, b = to || c.highlight;
  const d = arcPath(cx, cx, r, f);
  return (
    <View style={{ width: size, height: size * 0.86 }} accessible accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size * 0.86} viewBox={`0 0 ${size} ${size * 0.86}`}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Path d={arcPath(cx, cx, r, 1)} stroke={c.text} strokeOpacity={0.12} strokeWidth={sw} strokeLinecap="round" fill="none" />
        {d ? <Path d={d} stroke={'url(#' + gid + ')'} strokeWidth={sw} strokeLinecap="round" fill="none" /> : null}
        {v != null && f > 0.004 ? (
          <>
            <Circle cx={tx} cy={ty} r={sw * 1.25} fill={b} fillOpacity={0.25} />
            <Circle cx={tx} cy={ty} r={sw * 0.62} fill="#F5F7FF" stroke={b} strokeWidth={2.5} />
          </>
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">{children}</View>
    </View>
  );
}

// Круглая шкала с рисками (R3): горит доля value/max. children — в центре.
export function TickGauge({ id, value, max = 100, size = 200, color, ticks = 54, children, accessibilityLabel }) {
  const c = useColors();
  const v = finite(value) ? value : null;
  const shown = useCountUp('tick:' + id, v);
  const cx = size / 2;
  const f = shown == null ? 0 : clamp01(shown / max);
  const lit = Math.round(f * ticks);
  const col = color || c.accent;
  const r2 = cx - 4, r1 = r2 - size * 0.075;
  const items = useMemo(() => {
    const out = [];
    for (let i = 0; i < ticks; i++) {
      const deg = START + (SWEEP * i) / (ticks - 1);
      const long = i % 9 === 0;
      const [x1, y1] = pt(cx, cx, long ? r1 - size * 0.02 : r1, deg);
      const [x2, y2] = pt(cx, cx, r2, deg);
      out.push({ i, x1, y1, x2, y2 });
    }
    return out;
  }, [ticks, cx, r1, r2, size]);
  return (
    <View style={{ width: size, height: size }} accessible accessibilityLabel={accessibilityLabel}>
      <Svg width={size} height={size}>
        {items.map((t) => (
          <Line key={t.i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} strokeLinecap="round"
            strokeWidth={t.i < lit ? 3 : 2} stroke={t.i < lit ? col : c.text} strokeOpacity={t.i < lit ? 0.35 + 0.65 * ((t.i + 1) / Math.max(1, lit)) : 0.16} />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">{children}</View>
    </View>
  );
}

// Диапазон пульса за день (R1): градиентная полоса от минимума до пика, сердце-бегунок на среднем.
export function RangeBar({ low, avg, peak, from, to }) {
  const c = useColors();
  const gid = 'rangeg';
  const a = from || c.accent, b = to || c.highlight;
  const has = finite(low) && finite(peak) && peak > low;
  const k = has && finite(avg) ? clamp01((avg - low) / (peak - low)) : null;
  return (
    <View style={styles.range} testID="range-bar">
      <Svg width="100%" height={14} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={a} />
            <Stop offset="1" stopColor={b} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="14" rx="7" fill={has ? 'url(#' + gid + ')' : c.text} fillOpacity={has ? 1 : 0.12} />
      </Svg>
      {k != null ? (
        <View style={[styles.heart, { left: (k * 100) + '%', backgroundColor: '#F5F7FF', borderColor: b }]}>
          <IconHeart color={b} size={14} sw={2} />
        </View>
      ) : null}
    </View>
  );
}

// Мини-столбики: values 0–100 (или null), последняя подсвечена; labels — подписи под столбиками.
export function MiniBars({ values, labels, color, height = 56 }) {
  const c = useColors();
  const list = Array.isArray(values) ? values : [];
  return (
    <View style={styles.bars}>
      {list.map((v, i) => {
        const last = i === list.length - 1;
        const h = finite(v) ? Math.max(6, Math.round((height - 4) * clamp01(v / 100))) : 4;
        return (
          <View key={i} style={styles.barCol}>
            <View style={{ height, justifyContent: 'flex-end' }}>
              <View style={{ height: h, borderRadius: 6, backgroundColor: finite(v) ? (color || c.accent) : c.text, opacity: finite(v) ? (last ? 1 : 0.45) : 0.15 }} />
            </View>
            <Text style={[styles.barLab, { color: last ? c.text : c.sub, fontWeight: last ? '800' : '600' }]} {...fit(1, 0.6)}>{labels && labels[i] != null ? labels[i] : ''}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Число с единицей: count-up, прочерк без значения.
export function BigNum({ id, value, digits = 0, unit, size = 40, color, style }) {
  const c = useColors();
  const v = finite(value) ? value : null;
  const shown = useCountUp('big:' + id, v);
  return (
    <View style={[styles.bigRow, style]}>
      <Text style={{ color: color || c.text, fontSize: size, fontWeight: '800', letterSpacing: -1, flexShrink: 1 }} {...fit(1, 0.6)}>
        {shown == null ? '—' : fmt(digits ? shown : Math.round(shown), digits)}
      </Text>
      {unit && shown != null ? <Text style={{ color: c.sub, fontSize: Math.max(12, size * 0.36), fontWeight: '700' }} {...fit(1, 0.7)}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  range: { height: 30, justifyContent: 'center' },
  heart: { position: 'absolute', top: 0, width: 28, height: 28, marginLeft: -14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  bars: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'stretch', gap: 4 },
  barLab: { fontSize: SIZES.tiny, textAlign: 'center' },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
});
