// Статичное фото-фон: одна картинка на всё приложение, монтируется один раз в App
// (смена вкладок её не перезагружает), один раз плавно проявляется. Поверх — затемняющий
// градиент (снизу темнее), чтобы подписи и карточки читались. Фото тёмное в обеих темах,
// поэтому текст прямо на нём берёт цвета c.onBg / c.onBgSub (lib/theme.js), а не text/sub.
import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { reduceMotion } from './motion';

export const BACKDROP_BASE = '#0B0F1A'; // цвет под фото, пока оно грузится
export const FADE_FALLBACK_MS = 600;
const SOURCE = require('../assets/bg/mountain.jpg');

// Фото сдвинуто вниз (кольцо в небе — за героем «Сегодня», а не за заголовками), верх — спокойное тёмное небо.
const IMAGE_TOP = 150;
const TOP_SCRIM_H = 400;

function TopScrim() {
  // Без второго LinearGradient: стопки градиента — слои Rect с прозрачностью (маска из нескольких полос).
  const steps = 50;
  const rows = [];
  for (let i = 0; i < steps; i++) {
    const k = i / (steps - 1);
    const a = k < 0.38 ? 1 - 0.05 * (k / 0.38) : 0.95 * Math.pow(1 - (k - 0.38) / 0.62, 1.15);
    rows.push(<Rect key={i} x="0" y={(i * TOP_SCRIM_H) / steps} width="100%" height={TOP_SCRIM_H / steps} fill={BACKDROP_BASE} fillOpacity={a} />);
  }
  return (
    <Svg style={{ position: 'absolute', top: 0, left: 0, right: 0, height: TOP_SCRIM_H }} width="100%" height={TOP_SCRIM_H} pointerEvents="none">
      {rows}
    </Svg>
  );
}

function Scrim() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.25" />
          <Stop offset="0.35" stopColor="#000000" stopOpacity="0.3" />
          <Stop offset="0.7" stopColor="#000000" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.82" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
    </Svg>
  );
}

export function PhotoBackdrop() {
  const fade = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const loaded = useRef(false);
  const onLoad = () => {
    loaded.current = true;
    Animated.timing(fade, { toValue: 1, duration: reduceMotion() ? 0 : 600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  // onLoad мог не прийти (кэш, ошибка декодирования): через FADE_FALLBACK_MS фон показываем в любом случае.
  useEffect(() => {
    const t = setTimeout(() => { if (loaded.current) return; try { fade.setValue(1); } catch (e) { /* нечего показывать */ } }, FADE_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [fade]);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: BACKDROP_BASE }]} pointerEvents="none" testID="photo-backdrop">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Image source={SOURCE} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: IMAGE_TOP }} resizeMode="cover" fadeDuration={0} onLoad={onLoad} testID="photo-backdrop-image" />
      </Animated.View>
      <Scrim />
      <TopScrim />
    </View>
  );
}
