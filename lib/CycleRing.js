// Кольцо цикла: дуги фаз (месячные, фолликулярная, фертильное окно, лютеиновая),
// светящаяся отметка «сегодня» и день цикла в центре. Кольцо мягко появляется,
// отметка плавно доезжает до сегодняшнего дня.
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CYCLE_COLORS } from './theme';
import { useColors } from './colors';
import { FERTILE } from './cycle';
import { reduceMotion } from './motion';
import { tr } from './i18n';

export function CycleRing({ today, size = 120, stroke = 10, hormonal }) {
  const col = useColors();
  const s = useMemo(() => makeStyles(col), [col]);
  const v = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const c = size / 2, r = c - stroke - 4, len = 2 * Math.PI * r;
  const L = today ? Math.max(today.len, today.day) : 28;
  const seg = (from, to, color, key) => {
    const a = ((from - 1) / L) * len, b = ((to - from + 1) / L) * len - 3;
    if (b <= 0) return null;
    return <Circle key={key} cx={c} cy={c} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
      strokeDasharray={`${b} ${len}`} strokeDashoffset={-a} transform={`rotate(-90 ${c} ${c})`} opacity={0.9} />;
  };
  const arcs = [];
  if (today) {
    const pl = today.periodLen;
    arcs.push(seg(1, pl, CYCLE_COLORS.menstrual, 'm'));
    if (hormonal || !today.ovDay) arcs.push(seg(pl + 1, today.len, CYCLE_COLORS.hormonal, 'h'));
    else {
      const f0 = today.ovDay - FERTILE + 1;
      arcs.push(seg(pl + 1, f0 - 1, CYCLE_COLORS.follicular, 'f'));
      arcs.push(seg(Math.max(f0, pl + 1), today.ovDay, CYCLE_COLORS.fertile, 'w'));
      arcs.push(seg(today.ovDay + 1, today.len, CYCLE_COLORS.luteal, 'l'));
    }
    if (today.late) arcs.push(seg(today.len + 1, today.day, CYCLE_COLORS.late, 'x'));
  }
  // Отметка «сегодня» — поворот вокруг центра.
  const angle = today ? ((today.day - 0.5) / L) * 360 : 0;
  const rotate = v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${angle}deg`] });
  return (
    <Animated.View style={{ width: size, height: size, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={c} cy={c} r={r} stroke={col.text} strokeOpacity={0.08} strokeWidth={stroke} fill="none" />
        {arcs}
      </Svg>
      {today ? (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }] }]}>
          <View style={[s.dot, { left: c - 8, top: c - r - 8 }]} />
        </Animated.View>
      ) : null}
      <View style={[StyleSheet.absoluteFill, s.center]}>
        <Text style={s.small}>{tr('день')}</Text>
        <Text style={[s.day, { fontSize: size * 0.28 }]}>{today ? today.day : '—'}</Text>
      </View>
    </Animated.View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  dot: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: c.card, borderWidth: 3, borderColor: c.accent, shadowColor: c.accent, shadowOpacity: 0.5, shadowRadius: 6, elevation: 4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  small: { color: c.sub, fontSize: 11, fontWeight: '600' },
  day: { color: c.text, fontWeight: '800', marginTop: -2 },
});
