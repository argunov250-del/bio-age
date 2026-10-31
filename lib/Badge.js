// Значок достижения: круг с эмодзи. Открытое — изумрудное кольцо со свечением,
// закрытое — приглушённое, с дугой прогресса. Появляется «пружинкой».
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { NEON } from './theme';
import { reduceMotion } from './motion';

export function Badge({ icon, done, progress = 0, size = 52, delay = 0, fresh }) {
  const v = useRef(new Animated.Value(reduceMotion() ? 1 : 0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, speed: 9, bounciness: 12, useNativeDriver: true }).start();
    if (!fresh || reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, glow, delay, fresh]);
  const c = size / 2, r = c - 3, len = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <Animated.View style={{ width: size, height: size, opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      {done ? <Animated.View style={[s.halo, { width: size, height: size, borderRadius: c, opacity: fresh ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) : 0.3, transform: [{ scale: 1.18 }] }]} /> : null}
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="badgeEdge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={NEON.mint} />
            <Stop offset="1" stopColor={NEON.emerald} />
          </LinearGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r} fill={done ? 'rgba(52,232,158,0.14)' : 'rgba(255,255,255,0.04)'} stroke={done ? 'url(#badgeEdge)' : 'rgba(255,255,255,0.10)'} strokeWidth={2.5} />
        {!done && p > 0 ? (
          <Circle cx={c} cy={c} r={r} fill="none" stroke={NEON.emerald} strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round"
            strokeDasharray={`${len * p} ${len}`} transform={`rotate(-90 ${c} ${c})`} />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, s.center]}>
        <Text style={{ fontSize: size * 0.42, opacity: done ? 1 : 0.35 }}>{icon}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: NEON.emerald },
  center: { alignItems: 'center', justifyContent: 'center' },
});
