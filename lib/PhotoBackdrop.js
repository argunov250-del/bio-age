// Статичное фото-фон: одна картинка на всё приложение, монтируется один раз в App
// (смена вкладок её не перезагружает), один раз плавно проявляется. Поверх — затемняющий
// градиент (снизу темнее), чтобы подписи и карточки читались. Фото тёмное в обеих темах,
// поэтому текст прямо на нём берёт цвета c.onBg / c.onBgSub (lib/theme.js), а не text/sub.
import React, { useRef } from 'react';
import { View, Image, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { reduceMotion } from './motion';

export const BACKDROP_BASE = '#06141B'; // цвет под фото, пока оно грузится
const SOURCE = require('../assets/bg/mountain.jpg');

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
  const onLoad = () => {
    Animated.timing(fade, { toValue: 1, duration: reduceMotion() ? 0 : 600, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: BACKDROP_BASE }]} pointerEvents="none" testID="photo-backdrop">
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
        <Image source={SOURCE} style={StyleSheet.absoluteFill} resizeMode="cover" fadeDuration={0} onLoad={onLoad} testID="photo-backdrop-image" />
      </Animated.View>
      <Scrim />
    </View>
  );
}
