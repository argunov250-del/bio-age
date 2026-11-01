// Стекло и свет главного экрана: полупрозрачные карточки со светлой верхней кромкой
// и бликом, неоновая подсветка фона, которая медленно и бесшовно дрейфует.
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { NEON, SIZES } from './theme';
import { Tilt, reduceMotion } from './motion';
import { isLite } from './perf';

// Блик стекла: светлая полоса сверху, гаснущая к низу.
export function Sheen() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="sheen" x1="0" y1="0" x2="0.6" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.09" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.015" />
          <Stop offset="1" stopColor={NEON.emerald} stopOpacity="0.03" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#sheen)" />
    </Svg>
  );
}

export function Glass({ children, style, onPress, glow }) {
  const base = [s.glass, glow && s.glow, style];
  const body = (
    <>
      <Sheen />
      {children}
    </>
  );
  return onPress ? <Tilt onPress={onPress} style={base}>{body}</Tilt> : <View style={base}>{body}</View>;
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
  const { width, height } = useWindowDimensions();
  const a = amb || { period: 'day', a: NEON.emerald, b: NEON.teal, op: 0.2, dim: 0 };
  const rise = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(rise, { toValue: 1, duration: 1800, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [rise]);
  const from = a.period === 'evening' ? -height * 0.25 : a.period === 'night' ? 0 : height * 0.35;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, {
        opacity: rise,
        transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }, { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] }) }],
      }]}>
        <Spot size={width * 1.5} color={a.a} x={width / 2} y={210} ms={16000} dx={24} dy={18} opacity={a.op} />
        <Spot size={width * 1.2} color={a.b} x={0} y={760} ms={22000} dx={30} dy={26} opacity={a.op * 0.85} />
      </Animated.View>
      {a.dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000000', opacity: a.dim }]} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  glass: {
    backgroundColor: NEON.glass,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: NEON.glassEdge,
    borderTopColor: NEON.glassTop,
    padding: SIZES.pad,
    overflow: 'hidden',
    gap: 8,
  },
  glow: { borderColor: 'rgba(52,232,158,0.28)', borderTopColor: 'rgba(166,255,214,0.45)' },
});
