// Карточка «Динамика за 6 месяцев»: возраст тела по неделям плавной линией со
// светящейся заливкой, пунктир — паспортный возраст. Нажатие открывает подробности.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Glass } from './glass';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr, RU } from './i18n';

const H = 120, PX = 8, PY = 16;
const date = (t) => new Date(t).toLocaleDateString(RU ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });

export function TrendCard({ trend, chrono, onPress }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [w, setW] = useState(0);
  const ok = trend && trend.length >= 2 && chrono != null;
  let body = null;
  if (ok && w) {
    const vals = trend.map((p) => p.v);
    const min = Math.floor(Math.min(...vals, chrono - 1)), max = Math.ceil(Math.max(...vals, chrono + 1));
    const span = max - min || 1;
    const pw = w - PX * 2, ph = H - PY * 2;
    const pts = trend.map((p, i) => [PX + (i / (trend.length - 1)) * pw, PY + ph - ((p.v - min) / span) * ph]);
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = ((pts[i - 1][0] + pts[i][0]) / 2).toFixed(1);
      d += ` C${mx},${pts[i - 1][1].toFixed(1)} ${mx},${pts[i][1].toFixed(1)} ${pts[i][0].toFixed(1)},${pts[i][1].toFixed(1)}`;
    }
    const last = pts[pts.length - 1];
    const cy = PY + ph - ((chrono - min) / span) * ph;
    body = (
      <Svg width={w} height={H}>
        <Defs>
          <LinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.accent} stopOpacity={c.dark ? 0.34 : 0.22} />
            <Stop offset="1" stopColor={c.accent} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Line x1={PX} x2={w - PX} y1={cy} y2={cy} stroke={c.muted} strokeOpacity={0.8} strokeDasharray="4 4" />
        <SvgText x={w - PX} y={cy - 5} fill={c.sub} fontSize="10" textAnchor="end">{tr('паспортный') + ' ' + Math.round(chrono)}</SvgText>
        <Path d={`${d} L${last[0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`} fill="url(#trendFill)" />
        <Path d={d} stroke={c.accent} strokeWidth={2.2} fill="none" />
        {pts.map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={1.8} fill={c.accent} opacity={0.8} />)}
        <Circle cx={last[0]} cy={last[1]} r={9} fill={c.accent} opacity={0.25} />
        <Circle cx={last[0]} cy={last[1]} r={5} fill={c.accent} />
      </Svg>
    );
  }
  return (
    <Glass onPress={ok ? onPress : undefined}>
      <View style={s.head}>
        <Text style={s.title}>{tr('Динамика за 6 месяцев')}<Text style={s.sub}>{'  ·  ' + tr('по неделям')}</Text></Text>
        {ok ? <Text style={s.sub}>{date(trend[0].t) + ' — ' + date(trend[trend.length - 1].t)}</Text> : null}
      </View>
      {ok ? <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>{body}</View>
        : <Text style={s.sub}>{tr('График появится, когда накопятся данные хотя бы за 2 недели.')}</Text>}
      {ok ? (
        <View style={s.foot}>
          <Text style={s.sub}>{tr('6 мес. назад')}</Text>
          <Text style={s.more}>{tr('Подробнее')} ›</Text>
          <Text style={s.sub}>{tr('сейчас')}</Text>
        </View>
      ) : null}
    </Glass>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '700', flexShrink: 1 },
  sub: { color: c.sub, fontSize: SIZES.small - 1, fontWeight: '400' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 },
  more: { color: c.text, fontSize: SIZES.small - 1, fontWeight: '600' },
});
