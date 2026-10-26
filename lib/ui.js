// Простые общие элементы интерфейса.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from './theme';
import { tr } from './i18n';

export function Screen({ title, onBack, children }) {
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {onBack || title ? (
        <View style={s.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={s.back}>
              <Text style={s.backText}>‹ {tr('Назад')}</Text>
            </Pressable>
          ) : null}
          {title ? <Text style={s.title}>{title}</Text> : null}
        </View>
      ) : null}
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function T({ children, style, sub, small }) {
  return <Text style={[s.text, sub && s.sub, small && s.small, style]}>{children}</Text>;
}

export function Button({ title, onPress, secondary, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.btn, secondary && s.btnSecondary, (pressed || disabled) && { opacity: 0.6 }]}
    >
      <Text style={[s.btnText, secondary && { color: COLORS.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Row({ label, value, color }) {
  return (
    <View style={s.row}>
      <Text style={[s.text, s.sub, { flex: 1 }]}>{label}</Text>
      <Text style={[s.text, color && { color }]}>{value}</Text>
    </View>
  );
}

export function Disclaimer() {
  return <T sub small style={{ textAlign: 'center', marginTop: SIZES.gap }}>{tr('Не медицинский показатель, только для информации.')}</T>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap },
  back: { paddingVertical: 6 },
  backText: { color: COLORS.accent, fontSize: SIZES.text },
  title: { color: COLORS.text, fontSize: SIZES.title, fontWeight: '600', marginTop: 4 },
  body: { padding: SIZES.pad, gap: SIZES.gap },
  card: { backgroundColor: COLORS.card, borderRadius: SIZES.radius, padding: SIZES.pad, gap: 6 },
  text: { color: COLORS.text, fontSize: SIZES.text },
  sub: { color: COLORS.sub },
  small: { fontSize: SIZES.small },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIZES.pad },
  btnSecondary: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line },
  btnText: { color: COLORS.onAccent, fontSize: SIZES.text, fontWeight: '500' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
