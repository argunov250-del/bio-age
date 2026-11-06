// Экран запуска в стиле приложения: светлый (или тёмный по теме) фон, чёрный скруглённый
// знак «E» как в шапке «Обзора», имя Epimely и «забота о себе», тонкий индикатор загрузки.
// Затем знак плавно перелетает на своё место в шапке, а экран запуска растворяется поверх
// уже готового главного экрана — переход без шва. При первом запуске — кнопка «Начать».
import { fit } from '../fit';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reduceMotion } from '../motion';
import { SIZES, SPLASH } from '../theme';
import { useColors } from '../colors';
import { tr } from '../i18n';

const LOGO = 88;
const HEADER_LOGO = 42; // как в lib/AppHeader.js

export function LaunchScreen({ ready, firstRun, onReveal, onDone }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  const [box, setBox] = useState({ w: win.width, h: win.height });
  const { w: width, h: height } = box;
  const quick = reduceMotion();
  const show = useRef(new Animated.Value(quick ? 1 : 0)).current; // знак, имя, подпись
  const load = useRef(new Animated.Value(0)).current; // бегущий индикатор
  const fly = useRef(new Animated.Value(0)).current; // перелёт знака в шапку
  const fade = useRef(new Animated.Value(1)).current; // растворение экрана
  const [minPassed, setMinPassed] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const a = Animated.timing(show, { toValue: 1, duration: quick ? 0 : 450, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    const loop = Animated.loop(Animated.timing(load, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }));
    if (!quick) loop.start();
    const timer = setTimeout(() => setMinPassed(true), SPLASH.minLoadMs);
    return () => { clearTimeout(timer); a.stop(); loop.stop(); };
  }, [show, load, quick]);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    if (onReveal) onReveal();
    Animated.timing(fly, { toValue: 1, duration: quick ? 0 : 700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => {
      Animated.timing(fade, { toValue: 0, duration: quick ? 0 : 450, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => onDone && onDone());
    });
  };

  useEffect(() => {
    if (ready && minPassed && !firstRun) leave();
  }, [ready, minPassed, firstRun]);

  // Куда лететь: центр знака в шапке «Обзора» (отступ экрана 16 + 6 сверху).
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
      <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: fade }]} />
      <Animated.View style={[s.texts, { top: height / 2 + LOGO / 2 + 26, opacity: Animated.multiply(Animated.multiply(show, restOut), fade) }]}>
        <Text style={s.name}>Epimely</Text>
        <Text style={s.motto}>{tr('забота о себе')}</Text>
        {!(firstRun && ready) ? (
          <View style={s.track}>
            <Animated.View style={[s.bar, { transform: [{ translateX: load.interpolate({ inputRange: [0, 1], outputRange: [-40, 80] }) }] }]} />
          </View>
        ) : null}
      </Animated.View>
      <View style={[s.logoAt, { left: width / 2 - LOGO / 2, top: height / 2 - LOGO / 2 }]} pointerEvents="none">
        <Animated.View style={[s.logo, logoMove, { opacity: Animated.multiply(logoMove.opacity, show) }]}>
          <Text style={s.logoText}>E</Text>
        </Animated.View>
      </View>

      {firstRun && ready ? (
        <Animated.View style={[s.bottom, { bottom: insets.bottom + 40, opacity: Animated.multiply(show, restOut) }]}>
          <Text style={s.welcome}>{tr('Всё считается на телефоне, данные о здоровье никуда не отправляются.')}</Text>
          <Pressable onPress={leave} style={({ pressed }) => [s.btn, pressed && s.pressed]}>
            <Text {...fit(1, 0.7)} style={s.btnText}>{tr('Начать')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: { backgroundColor: c.bg },
  logoAt: { position: 'absolute', width: LOGO, height: LOGO },
  logo: { width: LOGO, height: LOGO, borderRadius: LOGO * 0.31, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: c.onPrimary, fontSize: 42, fontWeight: '800' },
  texts: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 4 },
  name: { color: c.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  motto: { color: c.sub, fontSize: SIZES.body, letterSpacing: 0.4 },
  track: { width: 40, height: 3, borderRadius: 2, backgroundColor: c.line, overflow: 'hidden', marginTop: 22 },
  bar: { width: 40, height: 3, borderRadius: 2, backgroundColor: c.muted },
  bottom: { position: 'absolute', left: SIZES.pad * 1.5, right: SIZES.pad * 1.5, alignItems: 'center', gap: SIZES.pad },
  welcome: { color: c.sub, fontSize: SIZES.body, textAlign: 'center', lineHeight: SIZES.lineHeight },
  btn: { alignSelf: 'stretch', height: SIZES.button + 4, borderRadius: (SIZES.button + 4) / 2, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8 },
  btnText: { color: c.onPrimary, fontSize: SIZES.text + 1, fontWeight: '800' },
});
