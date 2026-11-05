// Экран запуска в стиле приложения: тёмный фон с подсветкой по времени суток,
// рамка логотипа «рисуется», загорается BIO, имя Epimely собирается из букв,
// вокруг логотипа крутится дуга, пока грузятся данные. Затем логотип плавно
// перелетает на своё место в шапке «Обзора», а экран запуска растворяется поверх
// уже готового главного экрана — переход без шва. При первом запуске — кнопка «Начать».
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NeonBackdrop } from '../glass';
import { KineticText, reduceMotion } from '../motion';
import { NEON_DARK as NEON, SIZES, SPLASH } from '../theme';
import { tr } from '../i18n';

const ARect = Animated.createAnimatedComponent(Rect);
const LOGO = 96;
const RX = 26;
const PERIM = 4 * (LOGO - 6) - (8 - 2 * Math.PI) * RX;
const HEADER_LOGO = 44; // как в lib/AppHeader.js

export function LaunchScreen({ ready, firstRun, amb, onReveal, onDone }) {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  // Реальный размер экрана запуска (на Android окно и экран с прозрачной строкой состояния различаются).
  const [box, setBox] = useState({ w: win.width, h: win.height });
  const { w: width, h: height } = box;
  const quick = reduceMotion();
  const draw = useRef(new Animated.Value(quick ? 1 : 0)).current; // рамка логотипа
  const show = useRef(new Animated.Value(quick ? 1 : 0)).current; // BIO, имя, подпись
  const fly = useRef(new Animated.Value(0)).current; // перелёт логотипа в шапку
  const fade = useRef(new Animated.Value(1)).current; // растворение экрана
  const [minPassed, setMinPassed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(draw, { toValue: 1, duration: quick ? 0 : 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.timing(show, { toValue: 1, duration: quick ? 0 : 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(() => setMinPassed(true), SPLASH.minLoadMs);
    return () => clearTimeout(timer);
  }, [draw, show, quick]);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    // Главный экран открывается под нами, пока логотип летит; логотип садится
    // ровно на место логотипа в шапке и остаётся видимым, пока растворяется фон.
    if (onReveal) onReveal();
    Animated.timing(fly, { toValue: 1, duration: quick ? 0 : 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      Animated.timing(fade, { toValue: 0, duration: quick ? 0 : 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone && onDone());
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

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={leaving ? 'none' : 'auto'}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {/* Фон растворяется, логотип — нет: он уже стоит на месте логотипа в шапке. */}
      <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: fade }]}>
        <NeonBackdrop amb={amb} />
      </Animated.View>
      <Animated.View style={[s.texts, { top: height / 2 + LOGO / 2 + 34, opacity: Animated.multiply(restOut, fade) }]}>
        <View style={s.nameRow}>
          <KineticText style={s.name} by="char" delay={quick ? 0 : 900}>Epimely</KineticText>
          <Animated.View style={[s.chip, { opacity: show, transform: [{ scale: show }] }]}><Text style={s.chipText}>AGE</Text></Animated.View>
        </View>
        <Animated.Text style={[s.motto, { opacity: show }]}>{tr('забота о себе')}</Animated.Text>
        <Animated.Text style={[s.tag, { opacity: show }]}>{tr('Возраст тела · сон · восстановление')}</Animated.Text>
      </Animated.View>
      <View style={[s.logoAt, { left: width / 2 - LOGO / 2, top: height / 2 - LOGO / 2 }]} pointerEvents="none">
        <Animated.View style={[s.logoBox, logoMove]}>
          {/* Мягкое свечение вокруг рамки (SVG вместо тени — на Android тень даёт тёмный квадрат). */}
          <Svg width={LOGO + 28} height={LOGO + 28} style={s.halo}>
            <Rect x={6} y={6} width={LOGO + 16} height={LOGO + 16} rx={RX + 8} fill="none" stroke={NEON.emerald} strokeOpacity={0.12} strokeWidth={10} />
            <Rect x={10} y={10} width={LOGO + 8} height={LOGO + 8} rx={RX + 4} fill="none" stroke={NEON.emerald} strokeOpacity={0.22} strokeWidth={4} />
          </Svg>
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

      </View>

      {firstRun && ready ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + 40, opacity: Animated.multiply(show, restOut) }]}>
          <Text style={s.welcome}>{tr('Всё считается на телефоне, данные о здоровье никуда не отправляются.')}</Text>
          <Pressable onPress={leave} style={({ pressed }) => [s.btn, pressed && s.pressed]}>
            <Text style={s.btnText}>{tr('Начать')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: SPLASH.bg },
  logoAt: { position: 'absolute', width: LOGO, height: LOGO },
  halo: { position: 'absolute', left: -14, top: -14 },
  logoBox: { width: LOGO, height: LOGO, alignItems: 'center', justifyContent: 'center' },
  bio: { color: NEON.emerald, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  texts: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: NEON.text, fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
  chip: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { color: NEON.emerald, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  motto: { color: NEON.emerald, fontSize: SIZES.body + 2, fontWeight: '700', letterSpacing: 1.5 },
  tag: { color: NEON.sub, fontSize: SIZES.small, marginTop: 4 },
  bottom: { position: 'absolute', left: SIZES.pad * 1.5, right: SIZES.pad * 1.5, alignItems: 'center', gap: SIZES.pad },
  welcome: { color: NEON.soft, fontSize: SIZES.body, textAlign: 'center', lineHeight: SIZES.lineHeight },
  btn: { alignSelf: 'stretch', height: SIZES.button + 4, borderRadius: (SIZES.button + 4) / 2, backgroundColor: NEON.emerald, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  btnText: { color: NEON.ink, fontSize: SIZES.text + 1, fontWeight: '800' },
});
