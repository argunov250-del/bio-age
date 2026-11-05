// Общие элементы интерфейса. Цвета берутся из палитры текущей вкладки (useColors).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Switch, ScrollView, Pressable, Animated, Easing, RefreshControl, Keyboard, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, ORBIT, MOTION, DOCK, NEON } from './theme';
import { Sheen } from './glass';
import { KineticText, Tilt, reduceMotion } from './motion';
import { useColors } from './colors';
import { tr } from './i18n';

// tab — экран внутри вкладок: фон прозрачный (его плавно меняет App), снизу место под панель.
// onRefresh — потянуть вниз, чтобы обновить данные.
export function Screen({ title, onBack, children, tab, onRefresh }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
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
        contentContainerStyle={[s.body, tab && { paddingBottom: DOCK.height + DOCK.lift + insets.bottom + SIZES.pad * 2 }]}
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
  const body = <><Sheen />{children}</>;
  if (onPress) {
    return <Tilt onPress={onPress} style={base}>{body}</Tilt>;
  }
  return <View style={base}>{body}</View>;
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
      <Animated.View style={{ alignItems: 'center', alignSelf: 'stretch', opacity: pop, transform: [{ scale: Animated.multiply(pop, bounce) }] }}>
        <t.Icon color={on ? DOCK.iconActive : DOCK.icon} />
        <Text style={[s.tabText, { color: on ? DOCK.iconOn : DOCK.icon, opacity: on ? 1 : 0.85 }]} numberOfLines={1}
          adjustsFontSizeToFit minimumFontScale={0.6} allowFontScaling={false}>{t.title}</Text>
      </Animated.View>
    </Pressable>
  );
}

// Высота открытой клавиатуры (0 — закрыта). При edge-to-edge на Android окно не ресайзится,
// поэтому высоту отслеживаем сами по событиям клавиатуры.
export function useKeyboardHeight() {
  const [h, setH] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const subs = [
      Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setH((e && e.endCoordinates && e.endCoordinates.height) || 0)),
      Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setH(0)),
    ];
    return () => subs.forEach((sub) => sub.remove());
  }, []);
  return h;
}

export function TabBar({ tabs, active, onChange, bottom }) {
  const kb = useKeyboardHeight();
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
  // Обводка во всю ячейку вкладки (с небольшим отступом), чтобы иконка и подпись были внутри.
  const pill = Math.max(0, tw - DOCK.ringGap * 2);
  const x = (v) => v.interpolate({ inputRange: [0, 1], outputRange: [DOCK.ringGap, tw + DOCK.ringGap] });
  const left = dir > 0 ? x(tail) : x(head);
  const width = (dir > 0 ? Animated.subtract(head, tail) : Animated.subtract(tail, head)).interpolate({ inputRange: [0, 1], outputRange: [pill, pill + tw] });
  if (kb > 0) return null; // пока открыта клавиатура, плавающая панель скрыта
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
          <>
            {/* Мягкое свечение вокруг обводки: слой чуть шире и прозрачнее. */}
            <Animated.View pointerEvents="none" style={[s.halo, { left: Animated.add(left, -4), width: Animated.add(width, 8) }]} />
            <Animated.View pointerEvents="none" style={[s.ring, { left, width }]} />
          </>
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

// Абзац: основной текст (по умолчанию) или приглушённый (sub).
export function Body({ children, sub, style }) {
  const c = useColors();
  return <Text style={[s.para, { color: sub ? c.sub : c.text }, style]}>{children}</Text>;
}

// Пункт списка с точкой.
export function Bullet({ children }) {
  const c = useColors();
  return <Text style={[s.para, { color: c.text }]}>• {children}</Text>;
}

// Подпись внутри карточки: «ПОЧЕМУ», «Источники».
export function Subhead({ children, color }) {
  const c = useColors();
  return <Text style={[s.subhead, { color: color || c.sub }]}>{children}</Text>;
}

// Пояснение под полями и карточками: мелкий приглушённый текст.
export function Note({ children, center, style }) {
  const c = useColors();
  return <Text style={[s.note, { color: c.sub }, center && s.center, style]}>{children}</Text>;
}

// Результат действия: зелёный — готово, красный — ошибка.
export function Msg({ children, bad }) {
  const c = useColors();
  return children ? <Text style={[s.note, { color: bad ? c.bad : c.good }]}>{children}</Text> : null;
}

// Число с подписью в половинной карточке: «5 / тренировок за 30 дней / было 4».
export function Stat({ value, label, hint, hintColor, style }) {
  const c = useColors();
  return (
    <View style={style}>
      <Text style={[s.stat, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {label ? <Text style={[s.note, { color: c.sub }]}>{label}</Text> : null}
      {hint ? <Text style={[s.note, { color: hintColor || c.sub }]}>{hint}</Text> : null}
    </View>
  );
}

// Переключатель из нескольких вариантов в одну строку: options = [[значение, подпись], …].
export function Segmented({ options, value, onChange }) {
  const c = useColors();
  return (
    <View style={[s.segmented, { backgroundColor: c.raised }]}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={String(v)} onPress={() => onChange(v)} style={[s.segItem, on && { backgroundColor: c.accent }]}>
            <Text style={[s.chipText, { color: on ? c.onAccent : c.sub }]} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Чипы с переносом строк. clearable — повторное нажатие снимает выбор.
export function Chips({ options, value, onChange, clearable }) {
  const c = useColors();
  return (
    <View style={s.chips}>
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={String(v)} onPress={() => onChange(clearable && on ? null : v)} style={[s.chip, { backgroundColor: c.raised }, on && { backgroundColor: c.accent }]}>
            <Text style={[s.chipText, { color: on ? c.onAccent : c.sub }]}>{tr(label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Поле ввода с подписью. half — занимает половину строки рядом с другим полем.
export function Field({ label, value, onChange, placeholder, numeric, keyboard, multiline, half }) {
  const c = useColors();
  return (
    <View style={[s.field, half && s.half]}>
      <Text style={[s.label, { color: c.text }]}>{label}</Text>
      <TextInput
        style={[s.input, { borderColor: c.line, color: c.text }, multiline && s.multi]}
        value={value} onChangeText={onChange} placeholder={placeholder || '—'} placeholderTextColor={c.sub}
        keyboardType={keyboard || (numeric ? 'decimal-pad' : 'default')} multiline={multiline}
      />
    </View>
  );
}

// Строка формы: поля рядом.
export function FieldRow({ children }) {
  return <View style={s.fieldRow}>{children}</View>;
}

// Подпись поля или группы чипов вне Field.
export function Label({ children }) {
  const c = useColors();
  return <Text style={[s.label, { color: c.text }]}>{children}</Text>;
}

// Строка с выключателем.
export function SwitchRow({ label, value, onChange }) {
  const c = useColors();
  return (
    <View style={s.row}>
      <Text style={[s.text, { color: c.text, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accent, false: c.raised }} thumbColor={c.text} />
    </View>
  );
}

// Строка-ссылка со стрелкой.
export function LinkRow({ title, onPress, disabled }) {
  const c = useColors();
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [s.link, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[s.text, { color: c.text, flex: 1 }]}>{title}</Text>
      <Text style={[s.chev, { color: c.sub }]}>›</Text>
    </Pressable>
  );
}

// Полоска прогресса (0–1).
export function ProgressBar({ value, color }) {
  const c = useColors();
  return (
    <View style={[s.track, { backgroundColor: c.raised }]}>
      <View style={[s.trackFill, { width: `${Math.round(Math.max(0, Math.min(1, value || 0)) * 100)}%`, backgroundColor: color || c.accent }]} />
    </View>
  );
}

// Строка списка внутри карточки: тонкая линия сверху, у первой строки — без неё.
export function ListItem({ children, onPress, first }) {
  const c = useColors();
  const style = [s.listItem, !first && { borderTopWidth: 1, borderTopColor: c.edge }];
  return onPress
    ? <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { opacity: 0.7 }]}>{children}</Pressable>
    : <View style={style}>{children}</View>;
}

export function Disclaimer() {
  return <Note center>{tr('Не медицинский показатель, только для информации.')}</Note>;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap },
  back: { paddingVertical: 6 },
  backText: { fontSize: SIZES.text },
  title: { fontSize: SIZES.pageTitle, fontWeight: '700', marginTop: 4 },
  body: { padding: SIZES.pad, gap: SIZES.gap },
  card: { borderRadius: SIZES.radius, padding: SIZES.pad, gap: 8, borderWidth: 1, borderTopColor: NEON.glassTop, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headTitle: { fontSize: SIZES.small, fontWeight: '600', letterSpacing: 0.3 },
  headRight: { fontSize: SIZES.small },
  big: { fontSize: SIZES.display, fontWeight: '700' },
  bigUnit: { fontSize: SIZES.text, fontWeight: '500' },
  bigSub: { fontSize: SIZES.small, marginTop: 2 },
  section: { fontSize: SIZES.title - 2, fontWeight: '700', marginTop: SIZES.gap },
  pageTitle: { fontSize: SIZES.pageTitle, fontWeight: '700', marginTop: SIZES.gap },
  para: { fontSize: SIZES.body, lineHeight: SIZES.lineHeight },
  subhead: { fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  note: { fontSize: SIZES.small, lineHeight: 18 },
  center: { textAlign: 'center' },
  stat: { fontSize: SIZES.stat, fontWeight: '700' },
  segmented: { flexDirection: 'row', borderRadius: SIZES.radiusSmall, padding: 3 },
  segItem: { flex: 1, height: SIZES.chip - 4, borderRadius: SIZES.radiusSmall - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: SIZES.chip, height: SIZES.chip, paddingHorizontal: SIZES.gap, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: SIZES.body, fontWeight: '600' },
  field: { gap: 4 },
  half: { flex: 1 },
  fieldRow: { flexDirection: 'row', gap: SIZES.gap },
  label: { fontSize: SIZES.body, fontWeight: '500' },
  input: { height: SIZES.field, borderRadius: SIZES.radiusSmall, borderWidth: 1, fontSize: SIZES.text, paddingHorizontal: SIZES.gap },
  multi: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  chev: { fontSize: 20, marginLeft: 2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  dock: {
    position: 'absolute', left: DOCK.side, right: DOCK.side, height: DOCK.height, borderRadius: DOCK.height / 2,
    backgroundColor: DOCK.bg, borderWidth: 1, borderColor: DOCK.edge,
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14,
  },
  dockInner: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: DOCK.height / 2, overflow: 'hidden' },
  ring: { position: 'absolute', top: 5, bottom: 5, borderRadius: (DOCK.height - 12) / 2, borderWidth: 1.2, borderColor: DOCK.ring, backgroundColor: DOCK.ringFill },
  halo: { position: 'absolute', top: 1, bottom: 1, borderRadius: (DOCK.height - 4) / 2, backgroundColor: 'rgba(52,232,158,0.09)' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },
  tabText: { fontSize: 9.5, fontWeight: '600', marginTop: 3, width: '100%', textAlign: 'center', paddingHorizontal: 0 },
  text: { fontSize: SIZES.text },
  small: { fontSize: SIZES.small },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIZES.pad },
  btnText: { fontSize: SIZES.text, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
