// Стеклянный индикатор «Возраст образа жизни» в центре «Обзора».
// Слои (снизу вверх): неоновое свечение с морфингом, два 3D-кольца с бусинами,
// стеклянный диск с рисками шкалы, светящееся изумрудное кольцо прогресса,
// силуэт из частиц и число. Диск мягко покачивается в 3D по замкнутому циклу.
// Кольцо: где возраст образа жизни лежит в пределах формулы — от «на 15 лет старше
// паспортного» (пусто) до «на 10 лет моложе» (полное).
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';
import { GAUGE, MOTION } from './theme';
import { useColors } from './colors';
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
function GyroRing({ ring, ms, color, bead }) {
  const spin = useLoop(ms);
  const d = ring.r * 2 + 12;
  const len = 2 * Math.PI * ring.r;
  const rotateZ = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${ring.dir * 360}deg`] });
  return (
    <Animated.View renderToHardwareTextureAndroid style={{ position: 'absolute', width: d, height: d, transform: [{ perspective: 900 }, { rotateZ: ring.tilt }, { rotateX: ring.lean }, { rotateZ }] }}>
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
        <Circle cx={d / 2 + ring.r} cy={d / 2} r={3.5} fill={bead} />
      </Svg>
    </Animated.View>
  );
}

// Стеклянный диск, риски и светящееся кольцо прогресса (fill 0…1).
function Disc({ fill, c: col }) {
  const dk = col.dark;
  const D = GAUGE.disc;
  const c = D / 2;
  const r = c - GAUGE.ring - 6;
  const mint = dk ? '#8CE9BC' : col.accent;
  const len = 2 * Math.PI * r;
  const shown = fill == null ? 0 : Math.max(0, Math.min(1, fill));
  const ticks = [];
  for (let i = 0; i < GAUGE.ticks; i++) {
    const a = (i / GAUGE.ticks) * Math.PI * 2 - Math.PI / 2;
    const r1 = r - GAUGE.ring - 4, r2 = r1 - (i % 5 === 0 ? 7 : 4);
    ticks.push(<Line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}
      stroke={col.text} strokeOpacity={i / GAUGE.ticks <= shown ? (dk ? 0.35 : 0.45) : (dk ? 0.1 : 0.14)} strokeWidth={1} />);
  }
  const arc = { cx: c, cy: c, r, fill: 'none', strokeLinecap: 'round', strokeDasharray: `${len * shown} ${len}`, transform: `rotate(-90 ${c} ${c})` };
  return (
    <Svg width={D} height={D} style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="glassBody" cx="50%" cy="35%" r="65%">
          <Stop offset="0" stopColor={dk ? '#FFFFFF' : col.card} stopOpacity={dk ? 0.1 : 1} />
          <Stop offset="0.6" stopColor={dk ? '#FFFFFF' : col.cardAlt} stopOpacity={dk ? 0.03 : 0.9} />
          <Stop offset="1" stopColor={col.accent} stopOpacity={dk ? 0.06 : 0.08} />
        </RadialGradient>
        <LinearGradient id="glassRim" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={mint} stopOpacity={dk ? 0.55 : 0.35} />
          <Stop offset="0.5" stopColor={col.text} stopOpacity={dk ? 0.06 : 0.04} />
          <Stop offset="1" stopColor={col.accent} stopOpacity={dk ? 0.25 : 0.2} />
        </LinearGradient>
        <LinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={mint} />
          <Stop offset="1" stopColor={col.accent} />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c - 1} fill="url(#glassBody)" stroke="url(#glassRim)" strokeWidth={1.4} />
      <Circle cx={c} cy={c} r={r} stroke={col.text} strokeOpacity={dk ? 0.07 : 0.07} strokeWidth={GAUGE.ring} fill="none" />
      {ticks}
      {shown > 0 ? (
        <>
          <Circle {...arc} stroke={col.accent} strokeOpacity={dk ? 0.12 : 0.06} strokeWidth={GAUGE.ring * 3.2} />
          <Circle {...arc} stroke={col.accent} strokeOpacity={dk ? 0.25 : 0.12} strokeWidth={GAUGE.ring * 1.9} />
          <Circle {...arc} stroke="url(#ringGrad)" strokeWidth={GAUGE.ring} />
        </>
      ) : null}
    </Svg>
  );
}

export function BioGauge({ value, text, chrono, label, sub, busy, tier = 0 }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const bead = c.dark ? '#8CE9BC' : c.accent;
  const sway = useLoop(GAUGE.swayMs);
  const fill = value != null && chrono != null ? (chrono + GAUGE.older - value) / (GAUGE.older + GAUGE.younger) : null;
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const deg = (f) => sway.interpolate({ inputRange: steps, outputRange: steps.map((k) => `${GAUGE.swayDeg * f(k * Math.PI * 2)}deg`) });
  const D = GAUGE.disc;
  return (
    <View style={s.wrap}>
      <MorphBlob size={GAUGE.size} radius={D * 0.5} color={c.accent} busy={busy} style={s.abs} />
      {GYRO.map((g, i) => <GyroRing key={i} ring={g} ms={MOTION.gyroMs[i]} color={c.dark ? (i ? '#2BB5A6' : c.accent) : (i ? c.sub : c.accent)} bead={bead} />)}
      <Animated.View renderToHardwareTextureAndroid style={[s.disc, { transform: [{ perspective: 900 }, { rotateX: deg(Math.sin) }, { rotateY: deg(Math.cos) }] }]}>
        <Disc fill={fill} c={c} />
        <View style={s.figure}><Silhouette height={D * 0.74} opacity={c.dark ? 0.7 : 0.55} tier={tier} /></View>
        {label ? <Text style={s.label}>{label}</Text> : null}
        <Text style={s.age}>{text}</Text>
        {sub ? <Text style={s.sub}>{sub}</Text> : null}
      </Animated.View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: { width: GAUGE.size, height: GAUGE.size, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute', left: 0, top: 0 },
  disc: { width: GAUGE.disc, height: GAUGE.disc, borderRadius: GAUGE.disc / 2, alignItems: 'center', justifyContent: 'center' },
  figure: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: GAUGE.disc * 0.13 },
  label: { color: c.dark ? '#8CE9BC' : c.sub, fontSize: 11, fontWeight: '700', letterSpacing: 2, opacity: 0.85 },
  age: { color: c.text, fontSize: GAUGE.ageSize, fontWeight: '700', letterSpacing: -1, ...(c.dark ? { textShadowColor: 'rgba(61,214,140,0.55)', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } } : { textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } }) },
  sub: { color: c.dark ? '#CFE9DC' : c.sub, fontSize: 12, fontWeight: '600', marginTop: -2 },
});
