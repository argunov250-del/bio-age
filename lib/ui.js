// Общие элементы интерфейса. Цвета берутся из палитры текущей вкладки (useColors).
import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Easing, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZES, ORBIT } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

// tab — экран внутри вкладок: фон прозрачный (его плавно меняет App), снизу место под панель.
// onRefresh — потянуть вниз, чтобы обновить данные.
export function Screen({ title, onBack, children, tab, onRefresh }) {
  const c = useColors();
  return (
    <SafeAreaView style={[s.safe, { backgroundColor: tab ? 'transparent' : c.bg }]} edges={tab ? ['top'] : ['top', 'bottom']}>
      {onBack || title ? (
        <View style={s.header}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} style={s.back}>
              <Text style={[s.backText, { color: c.accent }]}>‹ {tr('Назад')}</Text>
            </Pressable>
          ) : null}
          {title ? <Text style={[s.title, { color: c.text }]}>{title}</Text> : null}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[s.body, tab && { paddingBottom: SIZES.tabBar + SIZES.pad * 3 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={c.accent} colors={[c.accent]} progressBackgroundColor={c.card} /> : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }) {
  const c = useColors();
  const base = [s.card, { backgroundColor: c.card, borderColor: c.edge }, style];
  if (onPress) {
    return <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed && { opacity: 0.8 }]}>{children}</Pressable>;
  }
  return <View style={base}>{children}</View>;
}

// Заголовок карточки: подпись слева, необязательное значение/ссылка справа.
export function CardHead({ icon, title, right, rightColor }) {
  const c = useColors();
  return (
    <View style={s.head}>
      <Text style={[s.headTitle, { color: c.sub }]}>{icon ? icon + '  ' : ''}{title}</Text>
      {right ? <Text style={[s.headRight, { color: rightColor || c.sub }]}>{right}</Text> : null}
    </View>
  );
}

// Крупное число с подписью: «7 ч 25 мин», «62 уд/мин».
// size — размер числа (в половинных карточках меньше, чтобы не переносилось).
export function Big({ value, unit, color, sub, size }) {
  const c = useColors();
  return (
    <View>
      <Text style={[s.big, { color: color || c.text }, size && { fontSize: size }]} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <Text style={[s.bigUnit, { color: c.sub }]}> {unit}</Text> : null}</Text>
      {sub ? <Text style={[s.bigSub, { color: c.sub }]}>{sub}</Text> : null}
    </View>
  );
}

export function Section({ children }) {
  const c = useColors();
  return <Text style={[s.section, { color: c.text }]}>{children}</Text>;
}

export function PageTitle({ children }) {
  const c = useColors();
  return <Text style={[s.pageTitle, { color: c.text }]}>{children}</Text>;
}

// Нижняя панель вкладок. bg/pill — анимированные цвета (плавная смена палитры).
export function TabBar({ tabs, active, onChange, bottom, bg, pill, iconOn, iconOff, textOn, textOff }) {
  return (
    <Animated.View style={[s.tabBar, { paddingBottom: bottom, backgroundColor: bg }]}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable key={t.key} onPress={() => onChange(t.key)} style={s.tab} hitSlop={6}>
            <Animated.View style={[s.tabPill, on && { backgroundColor: pill }]}>
              <t.Icon color={on ? iconOn : iconOff} />
            </Animated.View>
            <Text style={[s.tabText, { color: on ? textOn : textOff }]}>{t.title}</Text>
          </Pressable>
        );
      })}
    </Animated.View>
  );
}

// Содержимое вкладки мягко проявляется и чуть поднимается при каждом переключении.
export function FadeIn({ children, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return <Animated.View style={[{ flex: 1, opacity: v, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export function T({ children, style, sub, small }) {
  const c = useColors();
  return <Text style={[s.text, { color: sub ? c.sub : c.text }, small && s.small, style]}>{children}</Text>;
}

export function Button({ title, onPress, secondary, disabled }) {
  const c = useColors();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        s.btn,
        secondary ? { backgroundColor: c.raised, borderWidth: 1, borderColor: c.edge } : { backgroundColor: c.accent },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[s.btnText, { color: secondary ? c.text : c.onAccent }]}>{title}</Text>
    </Pressable>
  );
}

export function Row({ label, value, color }) {
  const c = useColors();
  return (
    <View style={s.row}>
      <Text style={[s.text, { color: c.sub, flex: 1 }]}>{label}</Text>
      <Text style={[s.text, { color: color || c.text }]}>{value}</Text>
    </View>
  );
}

// Мигает, пока active (данные обновляются), потом плавно возвращается к обычному виду.
export function Blink({ active, children, style }) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active) {
      Animated.timing(v, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      return undefined;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.3, duration: ORBIT.blinkMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 1, duration: ORBIT.blinkMs, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

export function Disclaimer() {
  return <T sub small style={{ textAlign: 'center', marginTop: SIZES.gap }}>{tr('Не медицинский показатель, только для информации.')}</T>;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap },
  back: { paddingVertical: 6 },
  backText: { fontSize: SIZES.text },
  title: { fontSize: SIZES.title, fontWeight: '600', marginTop: 4 },
  body: { padding: SIZES.pad, gap: SIZES.gap },
  card: { borderRadius: SIZES.radius, padding: SIZES.pad, gap: 8, borderWidth: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headTitle: { fontSize: SIZES.small, fontWeight: '600', letterSpacing: 0.3 },
  headRight: { fontSize: SIZES.small },
  big: { fontSize: 32, fontWeight: '700' },
  bigUnit: { fontSize: SIZES.text, fontWeight: '500' },
  bigSub: { fontSize: SIZES.small, marginTop: 2 },
  section: { fontSize: SIZES.title - 2, fontWeight: '700', marginTop: SIZES.gap },
  pageTitle: { fontSize: 30, fontWeight: '700', marginTop: SIZES.gap },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  tabPill: { height: 32, minWidth: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  tabText: { fontSize: SIZES.tiny + 1, fontWeight: '600' },
  text: { fontSize: SIZES.text },
  small: { fontSize: SIZES.small },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIZES.pad },
  btnText: { fontSize: SIZES.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
