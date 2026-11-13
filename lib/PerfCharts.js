// Мелкие графики для экранов нагрузки/восстановления/сна: 14 дней столбиками (цвет по значению),
// составная полоса стадий сна и полосы зон пульса тренировки.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useColors } from './colors';
import { SIZES } from './theme';
import { fit } from './fit';
import { fmt } from './format';
import { shortDate } from './time';
import { num } from './perfView';

// data: [{ key: 'YYYY-MM-DD', v: число|null }]; colorOf(v) — цвет столбика.
export function DayBars({ data, max, colorOf, height = 120 }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [w, setW] = useState(0);
  const list = Array.isArray(data) ? data : [];
  const top = Math.max(1, max || 0, ...list.map((d) => (num(d && d.v) || 0)));
  const h = height - 20;
  const gap = 4;
  const bw = w && list.length ? (w - gap * (list.length - 1)) / list.length : 0;
  const lastIdx = list.length - 1;
  return (
    <View>
      <View style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w && list.length ? (
          <Svg width={w} height={h}>
            {list.map((d, i) => {
              const v = num(d && d.v);
              if (v == null) return <Rect key={i} x={i * (bw + gap)} y={h - 2} width={bw} height={2} rx={1} fill={c.line} />;
              const bh = Math.max(3, (h - 4) * Math.min(1, v / top));
              return <Rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx={Math.min(4, bw / 2)} fill={colorOf(v)} opacity={i === lastIdx ? 1 : 0.6} />;
            })}
          </Svg>
        ) : null}
        <View style={s.labels}>
          <Text style={s.lab} {...fit(1, 0.7)}>{list.length ? shortDate(list[0].key) : ''}</Text>
          <Text style={s.lab} {...fit(1, 0.7)}>{list.length ? shortDate(list[lastIdx].key) : ''}</Text>
        </View>
      </View>
    </View>
  );
}

// parts: [{ v, color }] — доли по ширине.
export function StackBar({ parts, height = 16 }) {
  const c = useColors();
  const list = (parts || []).filter((p) => num(p.v) != null && p.v > 0);
  return (
    <View style={{ flexDirection: 'row', height, borderRadius: height / 2, overflow: 'hidden', backgroundColor: c.cardAlt, gap: 2 }}>
      {list.map((p, i) => <View key={i} style={{ flex: p.v, backgroundColor: p.color }} />)}
    </View>
  );
}

// Зоны пульса 1–5: строка на зону — полоса и минуты.
export function ZoneBars({ zones, color }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const z = Array.isArray(zones) ? zones.map((x) => num(x) || 0) : [0, 0, 0, 0, 0];
  const max = Math.max(1, ...z);
  return (
    <View style={{ gap: 4 }}>
      {z.map((m, i) => (
        <View key={i} style={s.zrow}>
          <Text style={s.zlab}>{'Z' + (i + 1)}</Text>
          <View style={[s.ztrack, { backgroundColor: c.cardAlt }]}>
            <View style={{ width: Math.round(m / max * 100) + '%', height: 8, borderRadius: 4, backgroundColor: color || c.accent, opacity: 0.35 + 0.13 * i }} />
          </View>
          <Text style={s.zval} {...fit(1, 0.7)}>{fmt(m, 0)}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  labels: { flexDirection: 'row', justifyContent: 'space-between', position: 'absolute', left: 0, right: 0, bottom: 0 },
  lab: { color: c.sub, fontSize: SIZES.tiny + 1 },
  zrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zlab: { color: c.sub, fontSize: SIZES.tiny + 1, width: 22 },
  ztrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  zval: { color: c.text, fontSize: SIZES.tiny + 1, width: 30, textAlign: 'right' },
});
