// Приветственный экран. Первый кадр совпадает с системным экраном запуска
// (значок по центру), затем значок плавно поднимается и появляется текст.
// При первом запуске экран ждёт кнопку «Начать», дальше — уходит сам через пару секунд
// (нажатие — пропустить).
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPLASH, COLORS, SIZES } from '../theme';
import { tr } from '../i18n';

const MARK = require('../../assets/bio-mark.png');

export function LaunchScreen({ firstRun, onDone }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const t = useRef(new Animated.Value(0)).current;
  const shift = firstRun ? SPLASH.shiftFirst : SPLASH.shift;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: SPLASH.animMs,
      delay: SPLASH.delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t]);

  useEffect(() => {
    if (firstRun || !onDone) return undefined;
    const timer = setTimeout(onDone, SPLASH.holdMs);
    return () => clearTimeout(timer);
  }, [firstRun, onDone]);

  const up = t.interpolate({ inputRange: [0, 1], outputRange: [0, -shift] });
  const rise = t.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const textTop = height / 2 + SPLASH.mark / 2 - shift - SPLASH.markPad;

  return (
    <Pressable style={s.wrap} onPress={firstRun || !onDone ? undefined : onDone}>
      <Animated.Image source={MARK} style={[s.mark, { transform: [{ translateY: up }] }]} resizeMode="contain" />
      <Animated.View style={[s.texts, { top: textTop, opacity: t, transform: [{ translateY: rise }] }]}>
        <Text style={s.tagline}>{tr('Биологический возраст')}</Text>
        <Text style={s.sub}>{tr('по данным Health Connect')}</Text>
        {firstRun ? (
          <View style={s.points}>
            <Text style={s.point}>{tr('Считает по 9 привычкам: сон, шаги, пульс, тренировки и форма.')}</Text>
            <Text style={s.point}>{tr('Всё считается на телефоне, данные никуда не отправляются.')}</Text>
            <Text style={s.point}>{tr('Не медицинский показатель, только для информации.')}</Text>
          </View>
        ) : null}
      </Animated.View>
      {firstRun ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + SPLASH.bottom + 56, opacity: t }]}>
          <Pressable onPress={onDone || undefined} style={({ pressed }) => [s.btn, pressed && { opacity: 0.7 }]}>
            <Text style={s.btnText}>{tr('Начать')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
      <Animated.Text style={[s.title, { bottom: insets.bottom + SPLASH.bottom, opacity: t }]}>bio</Animated.Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: SPLASH.bg, alignItems: 'center', justifyContent: 'center' },
  mark: { width: SPLASH.mark, height: SPLASH.mark },
  texts: { position: 'absolute', left: SIZES.pad * 2, right: SIZES.pad * 2, alignItems: 'center' },
  tagline: { color: SPLASH.text, fontSize: SIZES.title, fontWeight: '600', textAlign: 'center' },
  sub: { color: COLORS.sub, fontSize: SIZES.text, marginTop: 4, textAlign: 'center' },
  points: { marginTop: SIZES.pad * 1.5, gap: SIZES.gap },
  point: { color: SPLASH.text, fontSize: SIZES.text, lineHeight: 22, textAlign: 'center' },
  bottom: { position: 'absolute', left: SIZES.pad, right: SIZES.pad },
  btn: { height: SIZES.button, borderRadius: SIZES.radius, backgroundColor: SPLASH.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: SPLASH.bg, fontSize: SIZES.text, fontWeight: '600' },
  title: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: SPLASH.text, fontSize: SPLASH.title, fontWeight: '500', letterSpacing: 2 },
});
