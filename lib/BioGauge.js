// Стеклянный индикатор «Возраст образа жизни» в центре «Обзора».
// Слои (снизу вверх): неоновое свечение с морфингом, два 3D-кольца с бусинами,
// стеклянный диск с рисками шкалы, светящееся изумрудное кольцо прогресса,
// силуэт из частиц и число. Диск мягко покачивается в 3D по замкнутому циклу.
// Кольцо: где возраст образа жизни лежит в пределах формулы — от «на 15 лет старше
// паспортного» (пусто) до «на 10 лет моложе» (полное).
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { GAUGE, NEON, MOTION } from './theme';
import { MorphBlob } from './MorphBlob';
import { Silhouette } from './Silhouette';
import { reduceMotion } from './motion';

const GYRO = [
  { tilt: '-16deg', lean: '74deg', dir: 1, r: GAUGE.size * 0.47 },
  { tilt: '24deg', lean: '68deg', dir: -1, r: GAUGE.size * 0.43 },
];

function useLoop(ms) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, ms]);
  return t;
}

// 3D-кольцо: вращается в своей плоскости, плоскость наклонена в глубину.
function GyroRing({ ring, ms, color }) {
  const spin = useLoop(ms);
  const d = ring.r * 2 + 12;
  const len = 2 * Math.PI * ring.r;
  const rotateZ = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${ring.dir * 360}deg`] });
  return (
    <Animated.View style={{ position: 'absolute', width: d, height: d, transform: [{ perspective: 900 }, { rotateZ: ring.tilt }, { rotateX: ring.lean }, { rotateZ }] }}>
      <Svg width={d} height={d}>
        <Defs>
          <LinearGradient id={'arc' + ring.dir} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0" />
            <Stop offset="1" stopColor={color} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        <Circle cx={d / 2} cy={d / 2} r={ring.r} stroke={color} strokeOpacity={0.12} strokeWidth={1.2} fill="none" />
        <Circle cx={d / 2} cy={d / 2} r={ring.r} stroke={'url(#arc' + ring.dir + ')'} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeDasharray={`${len * 0.5} ${len}`} />
        <Circle cx={d / 2 + ring.r} cy={d / 2} r={6} fill={color} opacity={0.25} />
        <Circle cx={d / 2 + ring.r} cy={d / 2} r={3.5} fill={NEON.mint} />
      </Svg>
    </Animated.View>
  );
}

// Стеклянный диск, риски и светящееся кольцо прогресса (fill 0…1).
function Disc({ fill }) {
  const D = GAUGE.disc;
  const c = D / 2;
  const r = c - GAUGE.ring - 6;
  const len = 2 * Math.PI * r;
  const shown = fill == null ? 0 : Math.max(0, Math.min(1, fill));
  const ticks = [];
  for (let i = 0; i < GAUGE.ticks; i++) {
    const a = (i / GAUGE.ticks) * Math.PI * 2 - Math.PI / 2;
    const r1 = r - GAUGE.ring - 4, r2 = r1 - (i % 5 === 0 ? 7 : 4);
    ticks.push(<Line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}
      stroke="#FFFFFF" strokeOpacity={i / GAUGE.ticks <= shown ? 0.35 : 0.1} strokeWidth={1} />);
  }
  const arc = { cx: c, cy: c, r, fill: 'none', strokeLinecap: 'round', strokeDasharray: `${len * shown} ${len}`, transform: `rotate(-90 ${c} ${c})` };
  return (
    <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="glassBody" cx="50%" cy="35%" r="65%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.10" />
          <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.03" />
          <Stop offset="1" stopColor={NEON.emerald} stopOpacity="0.06" />
        </RadialGradient>
        <LinearGradient id="glassRim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={NEON.mint} stopOpacity="0.55" />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.06" />
          <Stop offset="1" stopColor={NEON.emerald} stopOpacity="0.25" />
        </LinearGradient>
        <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={NEON.mint} />
          <Stop offset="1" stopColor={NEON.emerald} />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 1} fill="url(#glassBody)" stroke="url(#glassRim)" strokeWidth={1.4} />
      <Circle cx={c} cy={c} r={r} stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={GAUGE.ring} fill="none" />
      {ticks}
      {shown > 0 ? (
        <>
          <Circle {...arc} stroke={NEON.emerald} strokeOpacity={0.12} strokeWidth={GAUGE.ring * 3.2} />
          <Circle {...arc} stroke={NEON.emerald} strokeOpacity={0.25} strokeWidth={GAUGE.ring * 1.9} />
          <Circle {...arc} stroke="url(#ringGrad)" strokeWidth={GAUGE.ring} />
        </>
      ) : null}
    </Svg>
  );
}

export function BioGauge({ value, text, chrono, label, sub, busy }) {
  const sway = useLoop(GAUGE.swayMs);
  const fill = value != null && chrono != null ? (chrono + GAUGE.older - value) / (GAUGE.older + GAUGE.younger) : null;
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const deg = (f) => sway.interpolate({ inputRange: steps, outputRange: steps.map((k) => `${GAUGE.swayDeg * f(k * Math.PI * 2)}deg`) });
  const D = GAUGE.disc;
  return (
    <View style={s.wrap}>
      <MorphBlob size={GAUGE.size} radius={D * 0.5} color={NEON.emerald} busy={busy} style={s.abs} />
      {GYRO.map((g, i) => <GyroRing key={i} ring={g} ms={MOTION.gyroMs[i]} color={i ? NEON.teal : NEON.emerald} />)}
      <Animated.View style={[s.disc, { transform: [{ perspective: 900 }, { rotateX: deg(Math.sin) }, { rotateY: deg(Math.cos) }] }]}>
        <Disc fill={fill} />
        <View style={s.figure}><Silhouette height={D * 0.74} opacity={0.7} /></View>
        <Text style={s.label}>{label}</Text>
        <Text style={s.age}>{text}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { width: GAUGE.size, height: GAUGE.size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute', left: 0, top: 0 },
  disc: { width: GAUGE.disc, height: GAUGE.disc, borderRadius: GAUGE.disc / 2, alignItems: 'center', justifyContent: 'center' },
  figure: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: GAUGE.disc * 0.13 },
  label: { color: NEON.mint, fontSize: 11, fontWeight: '700', letterSpacing: 2, opacity: 0.85 },
  age: { color: '#FFFFFF', fontSize: GAUGE.ageSize, fontWeight: '700', letterSpacing: -1, textShadowColor: 'rgba(52,232,158,0.55)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
  sub: { color: '#CFE9DC', fontSize: 12, fontWeight: '600', marginTop: -2 },
});
