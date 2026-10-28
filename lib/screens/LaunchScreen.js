// Экран загрузки и приветствие — один экран, чтобы переход был без швов.
// 1. Загрузка (по шаблону Launch Screen из Figma): логотип по центру, «bio» внизу,
//    зелёная дуга логотипа вращается, пока грузятся профиль и сохранённые данные.
// 2. Переход: логотип с зелёным свечением увеличивается и тает.
// 3. Приветствие (Splash → Startup из Figma): сверху выезжает зелёная шапка с рельефом,
//    слева въезжает «Приветствую» / «Welcome», снизу поднимается кнопка.
// При первом запуске экран ждёт кнопку, дальше уходит сам (нажатие — пропустить).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPLASH, COLORS, SIZES } from '../theme';
import { tr } from '../i18n';
import { KineticText } from '../motion';

const RING = require('../../assets/mark-ring.png');
const PULSE = require('../../assets/mark-pulse.png');
const HEADER = require('../../assets/welcome-header.png');
const HEADER_RATIO = 550 / 393; // пропорции шапки из макета

export function LaunchScreen({ ready, firstRun, onDone }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const spin = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const [minPassed, setMinPassed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [entering, setEntering] = useState(false);
  const headerH = Math.min(width * HEADER_RATIO, height * 0.62);
  const mark = Math.round(width * SPLASH.markWidth);

  // Вращение дуги — бесконечный цикл без рывка (0° и 360° совпадают).
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SPLASH.spinMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    const timer = setTimeout(() => setMinPassed(true), SPLASH.minLoadMs);
    return () => { loop.stop(); clearTimeout(timer); };
  }, [spin]);

  // Загрузка закончилась — переход к приветствию.
  useEffect(() => {
    if (!ready || !minPassed) return undefined;
    const timer = setTimeout(() => setEntering(true), SPLASH.growMs - SPLASH.overlapMs);
    Animated.parallel([
      Animated.timing(grow, { toValue: 1, duration: SPLASH.growMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(SPLASH.growMs - SPLASH.overlapMs),
        Animated.timing(enter, { toValue: 1, duration: SPLASH.enterMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start(() => setEntered(true));
    return () => clearTimeout(timer);
  }, [ready, minPassed, grow, enter]);

  useEffect(() => {
    if (!entered || firstRun || !onDone) return undefined;
    const timer = setTimeout(onDone, SPLASH.holdMs);
    return () => clearTimeout(timer);
  }, [entered, firstRun, onDone]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const markScale = grow.interpolate({ inputRange: [0, 1], outputRange: [1, SPLASH.growScale] });
  const markOpacity = grow.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  const glowScale = grow.interpolate({ inputRange: [0, 1], outputRange: [0.5, SPLASH.growScale * 1.3] });
  const glowOpacity = grow.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.45, 0] });
  const nameOpacity = grow.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  const headerY = enter.interpolate({ inputRange: [0, 1], outputRange: [-headerH, 0] });
  const textX = enter.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });
  const buttonY = enter.interpolate({ inputRange: [0, 1], outputRange: [160, 0] });
  const skip = entered && !firstRun && onDone ? onDone : undefined;

  return (
    <Pressable style={s.wrap} onPress={skip}>
      <Animated.View style={[s.header, { height: headerH, transform: [{ translateY: headerY }] }]}>
        <Animated.Image source={HEADER} style={{ width, height: headerH }} resizeMode="cover" />
      </Animated.View>

      <View style={s.center} pointerEvents="none">
        <Animated.View style={[s.glow, { width: mark * 0.6, height: mark * 0.6, borderRadius: mark * 0.3, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        <Animated.View style={{ width: mark, height: mark, opacity: markOpacity, transform: [{ scale: markScale }] }}>
          <Animated.Image source={RING} style={[s.layer, { transform: [{ rotate }] }]} resizeMode="contain" />
          <Animated.Image source={PULSE} style={s.layer} resizeMode="contain" />
        </Animated.View>
      </View>

      <Animated.View style={[s.nameWrap, { bottom: insets.bottom + SPLASH.nameBottom, opacity: nameOpacity }]}>
        <KineticText style={s.name} center by="char" delay={250}>Epimely</KineticText>
      </Animated.View>

      <Animated.View style={[s.texts, { top: headerH + SIZES.pad, transform: [{ translateX: textX }] }]}>
        {entering ? <KineticText style={s.title} by="char" delay={SPLASH.enterMs / 3}>{tr('Приветствую')}</KineticText> : <Text style={[s.title, { opacity: 0 }]}>{tr('Приветствую')}</Text>}
        <Text style={s.body}>{tr('Возраст тела, сон, восстановление и активность — по данным твоих устройств и записей. Данные остаются на телефоне.')}</Text>
      </Animated.View>

      {firstRun ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + SIZES.pad * 2, transform: [{ translateY: buttonY }] }]}>
          <Pressable onPress={entered ? onDone : undefined} style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]} hitSlop={12}>
            <Text style={s.btnText}>{tr('Продолжить')}</Text>
            <View style={s.circle}><Text style={s.arrow}>→</Text></View>
          </Pressable>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SPLASH.bg },
  header: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: SPLASH.accent },
  layer: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  nameWrap: { position: 'absolute', left: 0, right: 0 },
  name: { textAlign: 'center', color: SPLASH.text, fontSize: SPLASH.nameSize, fontWeight: '500', letterSpacing: 2 },
  texts: { position: 'absolute', left: SIZES.pad + 4, right: SIZES.pad * 3, gap: 8 },
  title: { color: SPLASH.text, fontSize: 34, fontWeight: '700' },
  body: { color: COLORS.sub, fontSize: SIZES.small + 1, lineHeight: 20 },
  bottom: { position: 'absolute', right: SIZES.pad + 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  btnText: { color: SPLASH.text, fontSize: SIZES.text - 1, fontWeight: '500' },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: SPLASH.accent, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: SPLASH.bg, fontSize: 20, fontWeight: '700', marginTop: -2 },
});
