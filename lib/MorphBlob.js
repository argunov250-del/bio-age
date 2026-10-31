// Живая форма за возрастом: замкнутая плавная кривая, точки которой «дышат».
// Радиус каждой точки — сумма синусов с целыми частотами, поэтому за цикл форма
// возвращается в исходную — движение бесшовное. Пока данные обновляются,
// форма плавно начинает колыхаться сильнее, потом успокаивается.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { MOTION } from './theme';
import { reduceMotion } from './motion';
import { isLite } from './perf';

const TAU = Math.PI * 2;

function makeSeeds(n, seed) {
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, () => ({ k1: 1 + Math.floor(rnd() * 2), k2: 2 + Math.floor(rnd() * 2), p1: rnd() * TAU, p2: rnd() * TAU }));
}

// Точки по кругу → гладкая кривая (Catmull-Rom в кубические Безье).
function blobPath(c, R, t, amp, seeds, turn) {
  const n = seeds.length;
  const pts = seeds.map((s, i) => {
    const a = (i / n) * TAU + turn * TAU;
    const r = R * (1 + amp * (0.6 * Math.sin(TAU * s.k1 * t + s.p1) + 0.4 * Math.sin(TAU * s.k2 * t + s.p2)));
    return [c + Math.cos(a) * r, c + Math.sin(a) * r];
  });
  const p = (i) => pts[(i + n) % n];
  let d = `M${p(0)[0].toFixed(1)},${p(0)[1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

export function MorphBlob({ size, radius, color, busy, style }) {
  const fill = useMemo(() => makeSeeds(7, 7331), []);
  const line = useMemo(() => makeSeeds(9, 1999), []);
  const [t, setT] = useState(0);
  const amp = useRef(MOTION.blobAmp);
  const busyRef = useRef(busy);
  busyRef.current = busy;

  useEffect(() => {
    if (reduceMotion() || isLite()) return undefined; // на слабых телефонах форма неподвижна
    let raf = 0;
    let last = 0;
    const t0 = Date.now();
    const frame = () => {
      const now = Date.now();
      if (now - last >= 1000 / MOTION.blobFps) {
        last = now;
        const target = busyRef.current ? MOTION.blobAmpBusy : MOTION.blobAmp;
        amp.current += (target - amp.current) * 0.05;
        setT(((now - t0) % MOTION.blobPeriodMs) / MOTION.blobPeriodMs);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const c = size / 2;
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Defs>
        <RadialGradient id="blobFill" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity="0.22" />
          <Stop offset="0.7" stopColor={color} stopOpacity="0.08" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d={blobPath(c, radius, t, amp.current, fill, t)} fill="url(#blobFill)" />
      <Path d={blobPath(c, radius * 1.12, t, amp.current * 1.2, line, -t)} fill="none" stroke={color} strokeOpacity={0.28} strokeWidth={1.2} />
    </Svg>
  );
}
