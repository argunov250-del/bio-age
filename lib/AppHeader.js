// Шапка «Обзора»: слева логотип и название, справа кнопка «＋ Записать» со свечением.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NEON, SIZES } from './theme';
import { tr } from './i18n';

function Logo() {
  return (
    <View style={s.logo}>
      <Svg width={44} height={44} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="logoEdge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={NEON.emerald} />
            <Stop offset="1" stopColor={NEON.teal} />
          </LinearGradient>
        </Defs>
        <Rect x={1.5} y={1.5} width={41} height={41} rx={12} fill="rgba(52,232,158,0.06)" stroke="url(#logoEdge)" strokeWidth={2.5} />
      </Svg>
      <Text style={s.logoText}>BIO</Text>
    </View>
  );
}

export function AppHeader({ onLog }) {
  return (
    <View style={s.row}>
      <Logo />
      <Text style={s.name}>Epimely</Text>
      <View style={s.chip}><Text style={s.chipText}>AGE</Text></View>
      <View style={{ flex: 1 }} />
      <Pressable onPress={onLog} style={({ pressed }) => [s.log, pressed && { opacity: 0.8 }]} hitSlop={6}>
        <Text style={s.logText}>＋  {tr('Записать')}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SIZES.gap / 2 },
  logo: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: NEON.emerald, shadowOpacity: 0.7, shadowRadius: 10, elevation: 8, borderRadius: 12 },
  logoText: { color: NEON.emerald, fontSize: 14, fontWeight: '800' },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  chip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: NEON.emerald, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  log: { height: 38, borderRadius: 19, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: NEON.emerald, shadowColor: NEON.emerald, shadowOpacity: 0.8, shadowRadius: 12, elevation: 10 },
  logText: { color: '#06141B', fontSize: SIZES.small + 1, fontWeight: '800' },
});
