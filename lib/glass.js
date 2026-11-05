// Прежнее «стекло» главного экрана. Теперь Glass — это обычная карточка нового стиля
// (белая, мягкая тень; в тёмной теме — рамка), API сохранён. NeonBackdrop — тихая подсветка фона.
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { NEON } from './theme';
import { reduceMotion } from './motion';
import { isLite } from './perf';
import { useColors } from './colors';
import { Card } from './ui';

// Блика стекла больше нет — оставлен пустым для старых импортов.
export function Sheen() {
  return null;
}

// glow — тонкая зелёная обводка (состояние «всё хорошо»).
export function Glass({ children, style, onPress, glow }) {
  const c = useColors();
  return <Card onPress={onPress} style={[glow && { borderWidth: 1, borderColor: c.accent + '55' }, style]}>{children}</Card>;
}

// Фоновая подсветка: два размытых пятна света, плавающих по замкнутому пути.
function Spot({ size, color, x, y, ms, dx, dy, opacity }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion() || isLite()) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, ms]);
  // Окружность точками: начало и конец пути совпадают.
  const steps = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
  const tx = t.interpolate({ inputRange: steps, outputRange: steps.map((k) => dx * Math.cos(k * Math.PI * 2)) });
  const ty = t.interpolate({ inputRange: steps, outputRange: steps.map((k) => dy * Math.sin(k * Math.PI * 2)) });
  return (
    <Animated.View renderToHardwareTextureAndroid pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, transform: [{ translateX: tx }, { translateY: ty }] }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={'spot' + color.replace('#', '')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="0.5" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={'url(#spot' + color.replace('#', '') + ')'} />
      </Svg>
    </Animated.View>
  );
}

// Фоновая подсветка в цветах времени суток (lib/ambience.js). При появлении экрана
// свет «восходит»: утром и днём пятно поднимается снизу, вечером опускается сверху,
// ночью просто медленно проявляется.
export function NeonBackdrop({ amb }) {
  const c = useColors();
  const { width, height } = useWindowDimensions();
  const a = amb || { period: 'day', a: NEON.emerald, b: NEON.teal, op: 0.2, dim: 0 };
  const rise = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);
  const from = a.period === 'evening' ? -height * 0.25 : a.period === 'night' ? 0 : height * 0.35;
  // Светлая тема: едва заметные серо-голубые пятна без свечения. Тёмная: вдвое тише прежнего.
  const colA = c.dark ? a.a : '#B9C4D6';
  const colB = c.dark ? a.b : '#CBD3DF';
  const op = c.dark ? a.op * 0.5 : 0.35;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, {
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
      }]}>
        <Spot size={width * 1.5} color={colA} x={width / 2} y={210} ms={16000} dx={24} dy={18} opacity={op} />
        <Spot size={width * 1.2} color={colB} x={0} y={760} ms={22000} dx={30} dy={26} opacity={op * 0.85} />
      </Animated.View>
      {c.dark && a.dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: a.dim }]} /> : null}
    </View>
  );
}
