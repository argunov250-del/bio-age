// Экран запуска в стиле приложения: тёмный фон с подсветкой по времени суток,
// рамка логотипа «рисуется», загорается BIO, имя Epimely собирается из букв,
// вокруг логотипа крутится дуга, пока грузятся данные. Затем логотип плавно
// перелетает на своё место в шапке «Обзора», а экран запуска растворяется поверх
// уже готового главного экрана — переход без шва. При первом запуске — кнопка «Начать».
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NeonBackdrop } from '../glass';
import { KineticText, reduceMotion } from '../motion';
import { NEON, SIZES, SPLASH } from '../theme';
import { tr } from '../i18n';

const ARect = Animated.createAnimatedComponent(Rect);
const LOGO = 96;
const RX = 26;
const PERIM = 4 * (LOGO - 6) - (8 - 2 * Math.PI) * RX;
const HEADER_LOGO = 44; // как в lib/AppHeader.js

export function LaunchScreen({ ready, firstRun, amb, onReveal, onDone }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const quick = reduceMotion();
  const draw = useRef(new Animated.Value(quick ? 1 : 0)).current; // рамка логотипа
  const show = useRef(new Animated.Value(quick ? 1 : 0)).current; // BIO, имя, подпись
  const spin = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current; // перелёт логотипа в шапку
  const fade = useRef(new Animated.Value(1)).current; // растворение экрана
  const [minPassed, setMinPassed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: quick ? 0 : 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(show, { toValue: 1, duration: quick ? 0 : 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: SPLASH.spinMs, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    const timer = setTimeout(() => setMinPassed(true), SPLASH.minLoadMs);
    return () => { loop.stop(); clearTimeout(timer); };
  }, [draw, show, spin, quick]);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    // Сначала логотип летит в шапку (или просто тает при первом запуске),
    // главный экран появляется под нами, потом растворяется фон.
    Animated.timing(fly, { toValue: 1, duration: quick ? 0 : 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      if (onReveal) onReveal();
      Animated.timing(fade, { toValue: 0, duration: quick ? 0 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone && onDone());
    });
  };

  useEffect(() => {
    if (ready && minPassed && !firstRun) leave();
  }, [ready, minPassed, firstRun]);

  // Куда лететь: центр логотипа в шапке «Обзора» (отступ экрана 16 + 6 сверху).
  const toX = SIZES.pad + HEADER_LOGO / 2 - width / 2;
  const toY = insets.top + SIZES.pad + 6 + HEADER_LOGO / 2 - height / 2;
  const goHeader = !firstRun;
  const logoMove = {
    transform: [
      { translateX: fly.interpolate({ inputRange: [0, 1], outputRange: [0, goHeader ? toX : 0] }) },
      { translateY: fly.interpolate({ inputRange: [0, 1], outputRange: [0, goHeader ? toY : -40] }) },
      { scale: fly.interpolate({ inputRange: [0, 1], outputRange: [1, goHeader ? HEADER_LOGO / LOGO : 0.8] }) },
    ],
    opacity: goHeader ? 1 : fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
  };
  const restOut = fly.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const busy = !(ready && minPassed);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: fade }]} pointerEvents={leaving ? 'none' : 'auto'}>
      <NeonBackdrop amb={amb} />
      <View style={s.center}>
        <Animated.View style={[s.logoBox, logoMove]}>
          {/* Дуга загрузки вокруг логотипа */}
          <Animated.View style={[s.spinner, { opacity: busy ? 1 : restOut, transform: [{ rotate }] }]}>
            <Svg width={LOGO + 40} height={LOGO + 40}>
              <Circle cx={(LOGO + 40) / 2} cy={(LOGO + 40) / 2} r={(LOGO + 28) / 2} stroke={NEON.emerald} strokeOpacity={0.12} strokeWidth={2} fill="none" />
              <Circle cx={(LOGO + 40) / 2} cy={(LOGO + 40) / 2} r={(LOGO + 28) / 2} stroke={NEON.mint} strokeWidth={2.5} fill="none" strokeLinecap="round"
                strokeDasharray={`${Math.PI * (LOGO + 28) * 0.22} ${Math.PI * (LOGO + 28)}`} />
            </Svg>
          </Animated.View>
          <View style={s.logoGlow} />
          <Svg width={LOGO} height={LOGO} style={StyleSheet.absoluteFill}>
            <Defs>
              <LinearGradient id="launchEdge" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={NEON.mint} />
                <Stop offset="0.5" stopColor={NEON.emerald} />
                <Stop offset="1" stopColor={NEON.teal} />
              </LinearGradient>
            </Defs>
            <Rect x={3} y={3} width={LOGO - 6} height={LOGO - 6} rx={RX} fill="rgba(52,232,158,0.07)" />
            <ARect x={3} y={3} width={LOGO - 6} height={LOGO - 6} rx={RX} fill="none" stroke="url(#launchEdge)" strokeWidth={5}
              strokeDasharray={`${PERIM} ${PERIM}`} strokeDashoffset={draw.interpolate({ inputRange: [0, 1], outputRange: [PERIM, 0] })} />
          </Svg>
          <Animated.Text style={[s.bio, { opacity: show, transform: [{ scale: show.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }]}>BIO</Animated.Text>
        </Animated.View>

        <Animated.View style={[s.texts, { opacity: restOut }]}>
          <View style={s.nameRow}>
            <KineticText style={s.name} by="char" delay={quick ? 0 : 900}>Epimely</KineticText>
            <Animated.View style={[s.chip, { opacity: show, transform: [{ scale: show }] }]}><Text style={s.chipText}>AGE</Text></Animated.View>
          </View>
          <Animated.Text style={[s.tag, { opacity: show }]}>{tr('Возраст тела · сон · восстановление')}</Animated.Text>
        </Animated.View>
      </View>

      {firstRun && ready ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + 40, opacity: Animated.multiply(show, restOut) }]}>
          <Text style={s.welcome}>{tr('Всё считается на телефоне, данные никуда не отправляются.')}</Text>
          <Pressable onPress={leave} style={({ pressed }) => [s.btn, pressed && { opacity: 0.8 }]}>
            <Text style={s.btnText}>{tr('Начать')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#06141B' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 34 },
  logoBox: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  spinner: { position: 'absolute', left: -20, top: -20, width: LOGO + 40, height: LOGO + 40 },
  logoGlow: { position: 'absolute', width: LOGO, height: LOGO, borderRadius: RX, shadowColor: NEON.emerald, shadowOpacity: 0.8, shadowRadius: 24 },
  bio: { color: NEON.emerald, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  texts: { alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  chip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { color: NEON.emerald, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  tag: { color: '#8FB8A6', fontSize: SIZES.small + 1 },
  bottom: { position: 'absolute', left: SIZES.pad * 1.5, right: SIZES.pad * 1.5, alignItems: 'center', gap: 16 },
  welcome: { color: '#BFD9CC', fontSize: SIZES.small + 1, textAlign: 'center', lineHeight: 20 },
  btn: { alignSelf: 'stretch', height: 54, borderRadius: 27, backgroundColor: NEON.emerald, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#06141B', fontSize: SIZES.text + 1, fontWeight: '800' },
});
