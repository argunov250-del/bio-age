// Общие элементы интерфейса. Цвета берутся из палитры текущей вкладки (useColors).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Switch, ScrollView, Pressable, Animated, Easing, RefreshControl, Keyboard, Platform, StyleSheet } from 'react-native';
import { IconChiron } from './icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SIZES, ORBIT, MOTION, DOCK } from './theme';
import { KineticText, PressScale, Stagger, reduceMotion, spring, SPRING, EASE_IOS, dur } from './motion';
import { tap, light } from './haptics';
import { useColors } from './colors';
import { tr } from './i18n';
import { fit } from './fit';
export { fit };

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
              <Text style={[s.backText, { color: c.sub }]} {...fit(1, 0.8)}>‹ {tr('Назад')}</Text>
            </Pressable>
          ) : null}
          {title ? <KineticText style={[s.title, { color: c.text }]} delay={120}>{upper(title)}</KineticText> : null}
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={[s.body, tab && { paddingBottom: DOCK.height + DOCK.raise + insets.bottom + SIZES.pad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={c.text} colors={[c.accent]} progressBackgroundColor={c.card} /> : undefined}
      >
        <Stagger>{children}</Stagger>
      </ScrollView>
    </SafeAreaView>
  );
}

// Белая карточка с большим скруглением и мягкой тенью (в тёмной теме — тонкая рамка вместо тени).
export const cardStyle = (c) => [{ backgroundColor: c.card, borderRadius: SIZES.radius, borderWidth: c.border, borderColor: c.line }, c.shadow];

export function Card({ children, style, onPress }) {
  const c = useColors();
  const base = [s.card, cardStyle(c), style];
  if (onPress) return <PressScale onPress={onPress} style={base}>{children}</PressScale>;
  return <View style={base}>{children}</View>;
}

// Заголовок карточки: подпись слева, необязательное значение/ссылка справа.
export function CardHead({ icon, title, right, rightColor }) {
  const c = useColors();
  return (
    <View style={s.head}>
      <Text style={[s.headTitle, s.shrink, { color: c.sub }]} {...fit(1, 0.75)}>{icon ? icon + '  ' : ''}{title}</Text>
      {right ? <Text style={[s.headRight, { color: rightColor || c.sub }]} {...fit(1, 0.75)}>{right}</Text> : null}
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
      {sub ? <Text style={[s.bigSub, { color: c.sub }]} {...fit(2, 0.8)}>{sub}</Text> : null}
    </View>
  );
}

const upper = (x) => (typeof x === 'string' ? x.toUpperCase() : x);

// Жирный заголовок раздела ПРОПИСНЫМИ; справа — необязательная серая ссылка («Все», «One-Tap»).
export function Section({ children, right, onRight }) {
  const c = useColors();
  return (
    <View style={s.sectionRow}>
      <Text style={[s.section, { color: c.text }]} {...fit(1, 0.6)}>{upper(children)}</Text>
      {right ? (
        <Pressable onPress={onRight} disabled={!onRight} hitSlop={8}>
          <Text style={[s.sectionRight, { color: c.sub }]} {...fit(1, 0.8)}>{right}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function PageTitle({ children }) {
  const c = useColors();
  return <KineticText style={[s.pageTitle, { color: c.text }]}>{upper(children)}</KineticText>;
}

// Круглая «фишка» с иконкой: светло-серый круг (или чёрный при dark). icon — элемент или компонент иконки.
export function IconChip({ icon, size = 44, dark, style, children }) {
  const c = useColors();
  const bg = dark ? c.primary : c.cardAlt;
  const fg = dark ? c.onPrimary : c.text;
  const Ic = icon;
  const glyph = typeof Ic === 'function' ? <Ic color={fg} size={Math.round(size * 0.46)} /> : Ic;
  return <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>{glyph || children}</View>;
}

// Большая карточка-«герой»: визуал, жирный заголовок, серый подзаголовок, чёрная кнопка справа.
export function HeroCard({ title, subtitle, cta, onPress, visual, style }) {
  const c = useColors();
  return (
    <View style={[s.hero, cardStyle(c), style]}>
      {visual ? <View style={s.heroVisual}>{visual}</View> : null}
      <View style={s.heroBottom}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.heroTitle, { color: c.text }]} {...fit(2, 0.6)}>{upper(title)}</Text>
          {subtitle ? <Text style={[s.note, { color: c.sub }]} {...fit(2, 0.8)}>{subtitle}</Text> : null}
        </View>
        {cta ? <Button title={cta} onPress={onPress} compact /> : null}
      </View>
    </View>
  );
}

// Плитка для сетки в 2 колонки; highlight — чёрная плитка среди белых.
export function Tile({ title, subtitle, icon, highlight, onPress, style }) {
  const c = useColors();
  const bg = highlight ? c.primary : c.card;
  const fg = highlight ? c.onPrimary : c.text;
  const body = (
    <>
      <View style={s.tileTop}>
        <IconChip icon={icon} size={40} style={highlight ? { backgroundColor: 'rgba(255,255,255,0.14)' } : undefined} />
        <Text style={[s.tileTitle, { color: fg }]} {...fit(2, 0.6)}>{title}</Text>
      </View>
      <View style={s.tileBottom}>
        <Text style={[s.note, { color: highlight ? c.muted : c.sub, flex: 1 }]} {...fit(1, 0.75)}>{subtitle}</Text>
        <Text style={[s.tileArrow, { color: fg }]}>{'\u2197'}</Text>
      </View>
    </>
  );
  const base = [s.tile, { backgroundColor: bg, borderWidth: c.border, borderColor: c.line }, c.shadow, style];
  return onPress ? <PressScale onPress={onPress} style={base}>{body}</PressScale> : <View style={base}>{body}</View>;
}

// Нижняя панель: белая изогнутая док-панель. Центральная вкладка — поднятая круглая чёрная кнопка,
// остальные — иконка с подписью; активная — чёрная/жирная. Иконки при запуске появляются по очереди,
// активная при переключении подпрыгивает.
function DockIcon({ t, on, index, onPress }) {
  const c = useColors();
  const pop = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const act = useRef(new Animated.Value(on ? 1 : 0)).current; // активная вкладка: 0..1
  useEffect(() => {
    spring(pop, 1, SPRING.default, { delay: DOCK.enterMs * 0.5 + index * DOCK.iconStagger }).start();
  }, [pop, index]);
  useEffect(() => {
    if (reduceMotion()) { act.setValue(on ? 1 : 0); return; }
    spring(act, on ? 1 : 0, SPRING.snappy).start();
  }, [on, act]);
  const color = on ? c.text : c.muted;
  return (
    <PressScale onPress={onPress} style={s.tab} hitSlop={6} accessibilityRole="button" accessibilityLabel={t.title}>
      <Animated.View style={{ alignItems: 'center', alignSelf: 'stretch', opacity: pop, transform: [{ scale: Animated.multiply(pop, act.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] })) }] }}>
        <Animated.View style={[s.tabDot, { backgroundColor: c.text, opacity: act, transform: [{ scale: act }] }]} />
        <t.Icon color={color} sw={on ? 2.4 : 1.6} />
        <Text style={[s.tabText, { color, fontWeight: on ? '800' : '500' }]} {...fit(1, 0.7)} allowFontScaling={false}>{t.title}</Text>
      </Animated.View>
    </PressScale>
  );
}

// Центральная кнопка: чёрный круг в светлом кольце, белый значок. Нажатие — пружина.
function DockCenter({ t, on, onPress }) {
  const c = useColors();
  return (
    <View style={s.tab}>
      <PressScale onPress={onPress} scale={0.92} accessibilityRole="button" accessibilityLabel={t.title} hitSlop={6}
        style={[s.centerRing, { backgroundColor: c.card, borderColor: c.line, borderWidth: c.border || 1 }, c.shadow]}>
        <View style={[s.centerBtn, { backgroundColor: c.primary, borderColor: on ? c.accent : c.primary }]}>
          {t.Icon ? <t.Icon color={c.onPrimary} size={26} sw={on ? 2.4 : 2} /> : <IconChiron color={c.onPrimary} size={26} />}
        </View>
      </PressScale>
    </View>
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

// Центральная вкладка — та, у которой center: true (иначе — средняя по порядку).
export function TabBar({ tabs, active, onChange, bottom }) {
  const c = useColors();
  const kb = useKeyboardHeight();
  const enter = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    spring(enter, 1, SPRING.default).start();
  }, [enter]);
  if (kb > 0) return null; // пока открыта клавиатура, панель скрыта
  const mid = Math.floor(tabs.length / 2);
  const total = DOCK.height + (bottom || 0);
  return (
    <Animated.View style={[s.dock, {
      height: total, paddingBottom: bottom || 0, backgroundColor: c.card, borderColor: c.line, borderTopWidth: c.border,
      opacity: enter,
      transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [total * 1.5, 0] }) }],
    }, c.dark ? null : s.dockShadow]}>
      {tabs.map((t, i) => (i === mid
        ? <DockCenter key={t.key} t={t} on={t.key === active} onPress={() => onChange(t.key)} />
        : <DockIcon key={t.key} t={t} index={i} on={t.key === active} onPress={() => onChange(t.key)} />))}
    </Animated.View>
  );
}

// Содержимое вкладки при переключении: только проявление (без масштаба — он вместе с тенью
// карточек давал тёмную рамку). Пока идёт анимация, слой рисуется целиком в текстуру
// (needsOffscreenAlphaCompositing + renderToHardwareTexture), после — выключается.
// Если анимацию прервали, прозрачность сразу 1. dir оставлен для совместимости.
export function FadeIn({ children, style }) {
  const v = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const [busy, setBusy] = useState(!reduceMotion());
  useEffect(() => {
    if (reduceMotion()) { v.setValue(1); setBusy(false); return undefined; }
    const a = Animated.timing(v, { toValue: 1, duration: dur(MOTION.fadeMs), easing: EASE_IOS, useNativeDriver: true });
    a.start(() => { v.setValue(1); setBusy(false); });
    return () => { a.stop(); v.setValue(1); };
  }, [v]);
  return (
    <Animated.View
      needsOffscreenAlphaCompositing={busy}
      renderToHardwareTextureAndroid={busy}
      style={[{ flex: 1, opacity: v }, style]}
    >
      {children}
    </Animated.View>
  );
}

export function T({ children, style, sub, small }) {
  const c = useColors();
  return <Text style={[s.text, { color: sub ? c.sub : c.text }, small && s.small, style]}>{children}</Text>;
}

// Кнопка: primary — чёрная «таблетка» с белым текстом, secondary — светлая, ghost — без фона.
export function Button({ title, onPress, secondary, ghost, variant, disabled, compact, style }) {
  const c = useColors();
  const v = variant || (ghost ? 'ghost' : secondary ? 'secondary' : 'primary');
  const bg = v === 'primary' ? c.primary : v === 'secondary' ? c.cardAlt : 'transparent';
  const fg = v === 'primary' ? c.onPrimary : c.text;
  return (
    <PressScale
      onPress={disabled ? undefined : () => { if (v === 'primary') light(); if (onPress) onPress(); }}
      disabled={disabled}
      style={[s.btn, compact && s.btnCompact, { backgroundColor: bg }, disabled && { opacity: 0.5 }, style]}
    >
      <Text style={[s.btnText, { color: fg }]} {...fit(1, 0.7)}>{title}</Text>
    </PressScale>
  );
}

export function Row({ label, value, color }) {
  const c = useColors();
  return (
    <View style={s.row}>
      <Text style={[s.text, { color: c.sub, flex: 1 }]} {...fit(2, 0.8)}>{label}</Text>
      <Text style={[s.text, { color: color || c.text, flexShrink: 0, maxWidth: '55%' }]} {...fit(1, 0.7)}>{value}</Text>
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
  return <Text style={[s.para, { color: sub ? c.sub : c.text }, style]} textBreakStrategy="simple" android_hyphenationFrequency="none">{children}</Text>;
}

// Пункт списка с точкой.
export function Bullet({ children }) {
  const c = useColors();
  return <Text style={[s.para, { color: c.text }]}>• {children}</Text>;
}

// Подпись внутри карточки: «ПОЧЕМУ», «Источники».
export function Subhead({ children, color }) {
  const c = useColors();
  return <Text style={[s.subhead, { color: color || c.sub }]} {...fit(2, 0.8)}>{children}</Text>;
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
// С icon — компактный вид: иконка, серая подпись и жирное значение.
export function Stat({ value, label, hint, hintColor, style, icon }) {
  const c = useColors();
  if (icon) {
    const Ic = icon;
    return (
      <View style={[s.statIcon, style]}>
        {typeof Ic === 'function' ? <Ic color={c.text} size={22} sw={1.5} /> : Ic}
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          {label ? <Text style={[s.note, { color: c.sub }]} {...fit(1, 0.7)}>{label}</Text> : null}
          <Text style={[s.statVal, { color: c.text }]} {...fit(1, 0.6)}>{value}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={style}>
      <Text style={[s.stat, { color: c.text }]} {...fit(1, 0.5)}>{value}</Text>
      {label ? <Text style={[s.note, { color: c.sub }]} {...fit(2, 0.8)}>{label}</Text> : null}
      {hint ? <Text style={[s.note, { color: hintColor || c.sub }]} {...fit(2, 0.8)}>{hint}</Text> : null}
    </View>
  );
}

// Белая строка показателей с вертикальными разделителями: items = [{ icon, label, value }].
export function StatRow({ items, style }) {
  const c = useColors();
  return (
    <View style={[s.statRow, cardStyle(c), style]}>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={[s.vline, { backgroundColor: c.line }]} /> : null}
          <Stat icon={it.icon} label={it.label} value={it.value} style={{ flex: 1, justifyContent: 'center' }} />
        </React.Fragment>
      ))}
    </View>
  );
}

// Переключатель-фильтр в виде «таблеток»: выбранная — чёрная. options = [[значение, подпись], …].
export function Segmented({ options, value, onChange }) {
  const c = useColors();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);
  const n = options.length || 1;
  const idx = Math.max(0, options.findIndex(([v]) => v === value));
  const itemW = Math.max(0, (w - 8 - 2 * (c.border || 0)) / n);
  useEffect(() => {
    if (!w) return;
    if (!placed.current || reduceMotion()) { x.setValue(idx * itemW); placed.current = true; return; }
    spring(x, idx * itemW, SPRING.default).start();
  }, [idx, itemW, w, x]);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[s.segmented, { backgroundColor: c.card, borderWidth: c.border, borderColor: c.line }, c.shadow]}>
      {w ? <Animated.View pointerEvents="none" style={[s.segPill, { width: itemW, backgroundColor: c.primary, transform: [{ translateX: x }] }]} /> : null}
      {options.map(([v, label]) => {
        const on = v === value;
        return (
          <PressScale key={String(v)} scale={0.97} onPress={() => { if (!on) tap(); onChange(v); }}
            style={[s.segItem, !w && on && { backgroundColor: c.primary }]}>
            <Text style={[s.chipText, { color: on ? c.onPrimary : c.text, fontWeight: on ? '700' : '500' }]} {...fit(1, 0.6)}>{label}</Text>
          </PressScale>
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
          <PressScale key={String(v)} onPress={() => { tap(); onChange(clearable && on ? null : v); }} style={[s.chip, { backgroundColor: on ? c.primary : c.cardAlt }]}>
            <Text style={[s.chipText, { color: on ? c.onPrimary : c.sub }]} {...fit(1, 0.75)}>{tr(label)}</Text>
          </PressScale>
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
      <Text style={[s.label, { color: c.text }]} {...fit(2, 0.8)}>{label}</Text>
      <TextInput
        style={[s.input, { backgroundColor: c.cardAlt, color: c.text }, multiline && s.multi]}
        value={value} onChangeText={onChange} placeholder={placeholder || '—'} placeholderTextColor={c.muted}
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
  return <Text style={[s.label, { color: c.text }]} {...fit(2, 0.8)}>{children}</Text>;
}

// Строка с выключателем.
export function SwitchRow({ label, value, onChange }) {
  const c = useColors();
  return (
    <View style={s.row}>
      <Text style={[s.text, { color: c.text, flex: 1 }]} {...fit(2, 0.8)}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.line }} thumbColor={c.card} />
    </View>
  );
}

// Строка-ссылка со стрелкой.
export function LinkRow({ title, onPress, disabled }) {
  const c = useColors();
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [s.link, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={[s.text, { color: c.text, flex: 1 }]} {...fit(2, 0.8)}>{title}</Text>
      <Text style={[s.chev, { color: c.sub }]}>›</Text>
    </Pressable>
  );
}

// Полоска прогресса (0–1).
export function ProgressBar({ value, color }) {
  const c = useColors();
  const k = Math.max(0, Math.min(1, value || 0));
  const w = useRef(new Animated.Value(k)).current;
  useEffect(() => {
    if (reduceMotion()) { w.setValue(k); return undefined; }
    const a = Animated.timing(w, { toValue: k, duration: dur(500), easing: EASE_IOS, useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [k, w]);
  return (
    <View style={[s.track, { backgroundColor: c.line }]}>
      <Animated.View style={[s.trackFill, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: color || c.accent }]} />
    </View>
  );
}

// Строка списка внутри карточки: тонкая линия сверху, у первой строки — без неё.
export function ListItem({ children, onPress, first }) {
  const c = useColors();
  const style = [s.listItem, !first && { borderTopWidth: 1, borderTopColor: c.line }];
  return onPress
    ? <PressScale onPress={onPress} scale={0.985} style={style}>{children}</PressScale>
    : <View style={style}>{children}</View>;
}

export function Disclaimer() {
  return <Note center>{tr('Не медицинский показатель, только для информации.')}</Note>;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap },
  back: { paddingVertical: 6 },
  backText: { fontSize: SIZES.text, fontWeight: '600' },
  title: { fontSize: SIZES.pageTitle - 4, fontWeight: '800', marginTop: 4, letterSpacing: 0.3 },
  body: { padding: SIZES.pad, gap: SIZES.gap },
  card: { padding: SIZES.pad, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shrink: { flexShrink: 1, minWidth: 0 },
  headTitle: { fontSize: SIZES.small, fontWeight: '600', letterSpacing: 0.3 },
  headRight: { fontSize: SIZES.small },
  big: { fontSize: SIZES.display, fontWeight: '800' },
  bigUnit: { fontSize: SIZES.text, fontWeight: '500' },
  bigSub: { fontSize: SIZES.small, marginTop: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.gap },
  section: { fontSize: SIZES.title - 3, fontWeight: '800', letterSpacing: 0.3, flexShrink: 1 },
  sectionRight: { fontSize: SIZES.body, fontWeight: '500' },
  pageTitle: { fontSize: SIZES.pageTitle - 4, fontWeight: '800', letterSpacing: 0.3, marginTop: SIZES.gap },
  para: { fontSize: SIZES.body, lineHeight: SIZES.lineHeight },
  subhead: { fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 4 },
  note: { fontSize: SIZES.small, lineHeight: 18 },
  center: { textAlign: 'center' },
  stat: { fontSize: SIZES.stat, fontWeight: '800' },
  statVal: { fontSize: SIZES.text, fontWeight: '800' },
  statIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: SIZES.gap },
  vline: { width: 1, alignSelf: 'stretch', marginHorizontal: 8 },
  segmented: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  segPill: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: 999 },
  tabDot: { position: 'absolute', top: -5, width: 4, height: 4, borderRadius: 2 },
  segItem: { flex: 1, height: SIZES.chip - 2, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minWidth: SIZES.chip, height: SIZES.chip, paddingHorizontal: SIZES.pad, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: SIZES.body, fontWeight: '600' },
  field: { gap: 4 },
  half: { flex: 1 },
  fieldRow: { flexDirection: 'row', gap: SIZES.gap },
  label: { fontSize: SIZES.body, fontWeight: '600' },
  input: { height: SIZES.field, borderRadius: SIZES.radiusSmall + 2, fontSize: SIZES.text, paddingHorizontal: SIZES.pad },
  multi: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  chev: { fontSize: 20, marginLeft: 2 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  hero: { padding: SIZES.pad, gap: SIZES.gap },
  heroVisual: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', gap: SIZES.gap },
  heroTitle: { fontSize: SIZES.title, fontWeight: '800', letterSpacing: 0.2 },
  tile: { flex: 1, minHeight: 132, borderRadius: SIZES.radius, padding: 14, justifyContent: 'space-between' },
  tileTop: { gap: 10 },
  tileTitle: { fontSize: SIZES.text, fontWeight: '800' },
  tileBottom: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileArrow: { fontSize: 18, fontWeight: '600' },
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center',
    borderTopLeftRadius: DOCK.radius, borderTopRightRadius: DOCK.radius,
  },
  dockShadow: { shadowColor: '#1B2430', shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: -6 }, elevation: 16 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: DOCK.height },
  tabText: { fontSize: 11, marginTop: 3, width: '100%', textAlign: 'center' },
  centerRing: { width: DOCK.ring, height: DOCK.ring, borderRadius: DOCK.ring / 2, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -(DOCK.raise - 2) }] },
  centerBtn: { width: DOCK.center, height: DOCK.center, borderRadius: DOCK.center / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  text: { fontSize: SIZES.text },
  small: { fontSize: SIZES.small },
  btn: { height: SIZES.button, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SIZES.pad + 8 },
  btnCompact: { height: 44, paddingHorizontal: 20 },
  btnText: { fontSize: SIZES.text, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
