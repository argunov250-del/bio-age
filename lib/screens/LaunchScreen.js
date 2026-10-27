// Приветственный экран. Первый кадр совпадает с системным экраном запуска
// (значок по центру). Затем значок с зелёным свечением увеличивается и тает,
// после чего — переход из макета Figma (Splash → Startup): сверху выезжает
// зелёная шапка с рельефом, слева въезжает текст, снизу поднимается кнопка.
// При первом запуске экран ждёт кнопку, дальше уходит сам (нажатие — пропустить).
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPLASH, COLORS, SIZES } from '../theme';
import { tr } from '../i18n';

const MARK = require('../../assets/bio-mark.png');
const HEADER = require('../../assets/welcome-header.png');
const HEADER_RATIO = 550 / 393; // пропорции шапки из макета

export function LaunchScreen({ firstRun, onDone }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const grow = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  const headerH = Math.min(width * HEADER_RATIO, height * 0.62);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(SPLASH.delayMs),
      Animated.parallel([
        Animated.timing(grow, { toValue: 1, duration: SPLASH.growMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(SPLASH.growMs - SPLASH.overlapMs),
          Animated.timing(enter, { toValue: 1, duration: SPLASH.enterMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, [grow, enter]);

  useEffect(() => {
    if (firstRun || !onDone) return undefined;
    const timer = setTimeout(onDone, SPLASH.holdMs);
    return () => clearTimeout(timer);
  }, [firstRun, onDone]);

  const markScale = grow.interpolate({ inputRange: [0, 1], outputRange: [1, SPLASH.growScale] });
  const markOpacity = grow.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.8, 0] });
  const glowScale = grow.interpolate({ inputRange: [0, 1], outputRange: [0.55, SPLASH.growScale * 1.3] });
  const glowOpacity = grow.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.45, 0] });
  const headerY = enter.interpolate({ inputRange: [0, 1], outputRange: [-headerH, 0] });
  const textX = enter.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] });
  const buttonY = enter.interpolate({ inputRange: [0, 1], outputRange: [160, 0] });

  return (
    <Pressable style={s.wrap} onPress={firstRun || !onDone ? undefined : onDone}>
      <Animated.View style={[s.header, { height: headerH, transform: [{ translateY: headerY }] }]}>
        <Animated.Image source={HEADER} style={{ width, height: headerH }} resizeMode="cover" />
      </Animated.View>

      <View style={s.center} pointerEvents="none">
        <Animated.View style={[s.glow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
        <Animated.Image source={MARK} style={[s.mark, { opacity: markOpacity, transform: [{ scale: markScale }] }]} resizeMode="contain" />
      </View>

      <Animated.View style={[s.texts, { top: headerH + SIZES.pad, transform: [{ translateX: textX }] }]}>
        <Text style={s.title}>{tr('Добро пожаловать')}</Text>
        <Text style={s.body}>{tr('Биологический возраст по данным Health Connect. Всё считается на телефоне, данные никуда не отправляются.')}</Text>
      </Animated.View>

      {firstRun ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + SIZES.pad * 2, transform: [{ translateY: buttonY }] }]}>
          <Pressable onPress={onDone || undefined} style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]} hitSlop={12}>
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
  glow: { position: 'absolute', width: SPLASH.mark * 0.6, height: SPLASH.mark * 0.6, borderRadius: SPLASH.mark * 0.3, backgroundColor: SPLASH.accent },
  mark: { width: SPLASH.mark, height: SPLASH.mark },
  texts: { position: 'absolute', left: SIZES.pad + 4, right: SIZES.pad * 3, gap: 8 },
  title: { color: SPLASH.text, fontSize: 34, fontWeight: '700' },
  body: { color: COLORS.sub, fontSize: SIZES.small + 1, lineHeight: 20 },
  bottom: { position: 'absolute', right: SIZES.pad + 4 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  btnText: { color: SPLASH.text, fontSize: SIZES.text - 1, fontWeight: '500' },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: SPLASH.accent, alignItems: 'center', justifyContent: 'center' },
  arrow: { color: SPLASH.bg, fontSize: 20, fontWeight: '700', marginTop: -2 },
});
