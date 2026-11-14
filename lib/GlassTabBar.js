// Нижняя панель (R4): плавающая стеклянная капсула, 5 вкладок «значок + подпись».
// Активная — внутри более светлая стеклянная «таблетка», которая скользит пружиной между вкладками.
// Вибрация при смене — в App (switchTab). Пока открыта клавиатура, панель скрыта.
import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import { useColors } from './colors';
import { GLASS_TAB } from './theme';
import { GlassView } from './glassKit';
import { PressScale, spring, SPRING, reduceMotion } from './motion';
import { useKeyboardHeight } from './ui';
import { fit } from './fit';

function Item({ t, on, onPress }) {
  const c = useColors();
  const color = on ? c.text : c.sub;
  return (
    <PressScale onPress={onPress} scale={0.94} style={s.item} hitSlop={4} accessibilityRole="button" accessibilityLabel={t.title} accessibilityState={{ selected: on }} testID={'tab-' + t.key}>
      <t.Icon color={color} size={22} sw={on ? 1.9 : 1.5} />
      <Text style={[s.label, { color, fontWeight: on ? '800' : '500' }]} {...fit(1, 0.7)} allowFontScaling={false}>{t.title}</Text>
    </PressScale>
  );
}

export function GlassTabBar({ tabs, active, onChange, bottom }) {
  const c = useColors();
  const kb = useKeyboardHeight();
  const idx = Math.max(0, tabs.findIndex((t) => t.key === active));
  const [w, setW] = useState(0);
  const slot = w > 0 ? (w - GLASS_TAB.pad * 2) / tabs.length : 0;
  const x = useRef(new Animated.Value(idx * slot)).current;
  const enter = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => { spring(enter, 1, SPRING.default).start(); }, [enter]);
  useEffect(() => {
    if (reduceMotion() || !slot) { x.setValue(idx * slot); return undefined; }
    const a = spring(x, idx * slot, SPRING.snappy);
    a.start();
    return () => a.stop();
  }, [idx, slot, x]);
  if (kb > 0) return null;
  const lift = Math.max(bottom || 0, 8) + GLASS_TAB.gap;
  return (
    <Animated.View pointerEvents="box-none" style={[s.wrap, { bottom: lift - GLASS_TAB.gap, paddingBottom: GLASS_TAB.gap, opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
      <GlassView radius={GLASS_TAB.radius} intensity={55} dense style={s.bar} contentStyle={s.row} testID="glass-tab-bar" onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {slot ? (
          <Animated.View pointerEvents="none" style={[s.pill, { width: slot, backgroundColor: c.glass.active, borderColor: c.glass.stroke, transform: [{ translateX: x }] }]} />
        ) : null}
        {tabs.map((t) => <Item key={t.key} t={t} on={t.key === active} onPress={() => onChange(t.key)} />)}
      </GlassView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: GLASS_TAB.margin, right: GLASS_TAB.margin },
  bar: { height: GLASS_TAB.height },
  row: { height: GLASS_TAB.height - 2, flexDirection: 'row', alignItems: 'center', paddingHorizontal: GLASS_TAB.pad },
  pill: { position: 'absolute', left: GLASS_TAB.pad, top: GLASS_TAB.pad - 1, bottom: GLASS_TAB.pad - 1, borderRadius: GLASS_TAB.radius - GLASS_TAB.pad, borderWidth: StyleSheet.hairlineWidth || 1 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 3 },
  label: { fontSize: 10.5, width: '100%', textAlign: 'center' },
});
