// Общие элементы интерфейса. Цвета берутся из палитры текущей вкладки (useColors).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, Animated, Easing, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SIZES, ORBIT, MOTION, DOCK } from './theme';
import { KineticText, Tilt, reduceMotion } from './motion';
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
          {title ? <KineticText style={[s.title, { color: c.text }]} delay={120}>{title}</KineticText> : null}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[s.body, tab && { paddingBottom: SIZES.tabBar + SIZES.pad * 5 }]}
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
    return <Tilt onPress={onPress} style={base}>{children}</Tilt>;
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
  return <KineticText style={[s.pageTitle, { color: c.text }]}>{children}</KineticText>;
}

// Нижняя панель: плавающая тёмная капсула. Активная вкладка обведена полупрозрачной
// рамкой, которая перетекает к новой вкладке каплей (передний край уходит быстро,
// задний догоняет). При запуске капсула выезжает снизу,
// иконки появляются по очереди; активная иконка при переключении подпрыгивает.
function DockIcon({ t, on, index, onPress }) {
  const pop = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const bounce = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, delay: DOCK.enterMs * 0.5 + index * DOCK.iconStagger, speed: 10, bounciness: 12, useNativeDriver: true }).start();
  }, [pop, index]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!on || reduceMotion()) return;
    bounce.setValue(0.8);
    Animated.spring(bounce, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }).start();
  }, [on, bounce]);
  return (
    <Pressable onPress={onPress} style={s.tab} hitSlop={6}>
      <Animated.View style={{ alignItems: 'center', opacity: pop, transform: [{ scale: Animated.multiply(pop, bounce) }] }}>
        <t.Icon color={on ? DOCK.iconOn : DOCK.icon} />
        <Text style={[s.tabText, { color: on ? DOCK.iconOn : DOCK.icon, opacity: on ? 1 : 0.85 }]} numberOfLines={1}>{t.title}</Text>
      </Animated.View>
    </Pressable>
  );
}

const PILL = 58;
export function TabBar({ tabs, active, onChange, bottom }) {
  const idx = Math.max(0, tabs.findIndex((t) => t.key === active));
  const [w, setW] = useState(0);
  const head = useRef(new Animated.Value(idx)).current;
  const tail = useRef(new Animated.Value(idx)).current;
  const enter = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const prev = useRef(idx);
  const dirRef = useRef(1);
  if (idx !== prev.current) {
    dirRef.current = idx > prev.current ? 1 : -1;
    prev.current = idx;
  }
  const dir = dirRef.current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: DOCK.enterMs, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [enter]);
  useEffect(() => {
    const go = (v, ms) => Animated.timing(v, { toValue: idx, duration: reduceMotion() ? 0 : ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: false });
    Animated.parallel([go(head, MOTION.pillMs[0]), go(tail, MOTION.pillMs[1])]).start();
  }, [idx, head, tail]);
  const tw = w / tabs.length;
  const x = (v) => v.interpolate({ inputRange: [0, 1], outputRange: [(tw - PILL) / 2, tw + (tw - PILL) / 2] });
  const left = dir > 0 ? x(tail) : x(head);
  const width = (dir > 0 ? Animated.subtract(head, tail) : Animated.subtract(tail, head)).interpolate({ inputRange: [0, 1], outputRange: [PILL, PILL + tw] });
  return (
    <Animated.View style={[s.dock, {
      bottom: bottom + DOCK.lift,
      opacity: enter,
      transform: [
        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [DOCK.height * 2, 0] }) },
        { scaleX: enter.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
      ],
    }]}>
      <View style={s.dockInner} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w ? (
          <Animated.View pointerEvents="none" style={[s.ring, { left, width }]} />
        ) : null}
        {tabs.map((t, i) => <DockIcon key={t.key} t={t} index={i} on={t.key === active} onPress={() => onChange(t.key)} />)}
      </View>
    </Animated.View>
  );
}

// Содержимое вкладки при переключении въезжает со стороны новой вкладки,
// разворачиваясь из глубины. dir: 1 — вкладка правее прежней, −1 — левее.
export function FadeIn({ children, style, dir = 0 }) {
  const v = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: MOTION.screenMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const transform = [
    { perspective: 1200 },
    { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [dir * 36, 0] }) },
    { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [dir ? 0 : 14, 0] }) },
    { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: [`${-dir * MOTION.screenTilt}deg`, '0deg'] }) },
    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
  ];
  return <Animated.View style={[{ flex: 1, opacity: v, transform }, style]}>{children}</Animated.View>;
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
  dock: {
    position: 'absolute', left: DOCK.side, right: DOCK.side, height: DOCK.height, borderRadius: DOCK.height / 2,
    backgroundColor: DOCK.bg, borderWidth: 1, borderColor: DOCK.edge,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  dockInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: DOCK.height / 2, overflow: 'hidden' },
  ring: { position: 'absolute', top: 6, bottom: 6, borderRadius: 26, borderWidth: 1, borderColor: DOCK.ring, backgroundColor: DOCK.ringFill },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabText: { fontSize: SIZES.tiny, fontWeight: '600', marginTop: 2 },
  text: { fontSize: SIZES.text },
  small: { fontSize: SIZES.small },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIZES.pad },
  btnText: { fontSize: SIZES.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
