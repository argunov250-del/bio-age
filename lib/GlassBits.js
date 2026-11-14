// Общие мелочи стеклянных экранов вкладок: заголовок раздела на фото, стеклянный переключатель,
// ступенчатое появление. Ничего тут не бросает исключений.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { GlassView } from './glassKit';
import { Appear, PressScale, staggerDelay } from './motion';
import { useColors } from './colors';
import { SIZES } from './theme';
import { fit } from './fit';

// Ступенчатое появление: карточка i выезжает с задержкой i·60 мс.
export function Rise({ i = 0, children, style }) {
  return <Appear delay={staggerDelay(i, 60)} style={style}>{children}</Appear>;
}

// Заголовок раздела прямо на фото-фоне (слева), ссылка справа.
export function GSection({ title, right, onRight }) {
  const c = useColors();
  return (
    <View style={s.secRow}>
      <Text style={[s.sec, { color: c.onBg }]} {...fit(1, 0.7)}>{title}</Text>
      {right ? (
        <Pressable onPress={onRight} disabled={!onRight} hitSlop={8} accessibilityRole="button">
          <Text style={[s.secRight, { color: c.onBgSub }]} {...fit(1, 0.75)}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// Заголовок внутри карточки: подпись слева, значение/пояснение справа.
export function GHead({ title, right, rightColor }) {
  const c = useColors();
  return (
    <View style={s.head}>
      <Text style={[s.headTitle, { color: c.text }]} {...fit(1, 0.7)}>{title}</Text>
      {right ? <Text style={[s.headRight, { color: rightColor || c.sub }]} {...fit(1, 0.7)}>{right}</Text> : null}
    </View>
  );
}

// Стеклянный переключатель на 2–4 пункта. options: [[value, label]].
export function GlassSegmented({ options, value, onChange, testID }) {
  const c = useColors();
  return (
    <GlassView radius={22} intensity={34} sheen={false} testID={testID} contentStyle={s.seg}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <PressScale key={String(v)} onPress={() => onChange(v)} scale={0.96} style={[s.segItem, on && { backgroundColor: c.glass.active, borderColor: c.glass.stroke, borderWidth: 1 }]}
            accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} testID={testID ? testID + '-' + v : undefined}>
            <Text style={[s.segText, { color: on ? c.text : c.sub, fontWeight: on ? '800' : '600' }]} {...fit(1, 0.7)}>{label}</Text>
          </PressScale>
        );
      })}
    </GlassView>
  );
}

const s = StyleSheet.create({
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 6, paddingHorizontal: 4 },
  sec: { flex: 1, fontSize: SIZES.text, fontWeight: '800', letterSpacing: 0.2 },
  secRight: { fontSize: SIZES.small, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 },
  headTitle: { flex: 1, fontSize: SIZES.text, fontWeight: '800' },
  headRight: { fontSize: SIZES.small, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  seg: { flexDirection: 'row', padding: 4, gap: 4 },
  segItem: { flex: 1, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderWidth: 0, borderColor: 'transparent' },
  segText: { fontSize: 14 },
});
