// Погода, которая «падает на интерфейс». Дождь, снег, листья и лепестки 30 секунд
// падают и ложатся на верхние края карточек «Обзора», ещё 30 секунд лежат, потом
// почти всё тает — остаётся несколько штук, и анимация полностью останавливается
// (телефон больше не нагружается). Повторно сцена играет не чаще раза в 30 минут
// или при смене погоды; до этого — сразу лежат только оставшиеся.
// Слой лежит внутри прокрутки поверх карточек и не перехватывает касания.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { reduceMotion } from './motion';
import { isLite } from './perf';

export const FALL_MS = 30000; // падают
export const STAY_MS = 30000; // лежат
const KEEP = 0.1; // доля, что остаётся лежать
const REPLAY_MS = 30 * 60000;

// Какие частицы падают для эффекта (остальное — фоном, см. SeasonLayer).
const MIX = {
  rain: [['rain', 34]], storm: [['rain', 42]], snow: [['snow', 34]], winter: [['snow', 34]],
  leaves: [['leaf', 12]], autumn: [['rain', 20], ['leaf', 10]], spring: [['petal', 18]],
};
export const fallsFor = (fx) => !!MIX[fx];

// Поверхности (верхние края карточек) — карточки сообщают свои места.
const Ctx = createContext(null);
export function useSurfaces() {
  const [list, setList] = useState([]);
  const map = useRef({});
  const timer = useRef(null);
  const register = useCallback((id, rect) => {
    map.current[id] = rect;
    clearTimeout(timer.current);
    // Ждём, пока раскладка успокоится, и только потом раскладываем частицы.
    timer.current = setTimeout(() => setList(Object.values(map.current).filter((r) => r.w > 40)), 1500);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [list, register];
}
export const SurfaceProvider = ({ register, children }) => <Ctx.Provider value={register}>{children}</Ctx.Provider>;

// Обёртка блока «Обзора»: верхний край — поверхность, на которую ложатся частицы.
export function Landing({ id, children, style }) {
  const register = useContext(Ctx);
  return (
    <View style={style} onLayout={(e) => { const l = e.nativeEvent.layout; if (register) register(id, { x: l.x, y: l.y, w: l.width }); }}>
      {children}
    </View>
  );
}

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

const played = {}; // эффект → когда играла сцена

function makeParts(fx, surfaces) {
  const r = rng(424242);
  const total = surfaces.reduce((a, s) => a + s.w, 0);
  const pick = () => { let k = r() * total; for (const s of surfaces) { k -= s.w; if (k <= 0) return s; } return surfaces[0]; };
  const out = [];
  const lite = isLite();
  for (const [type, count] of MIX[fx]) {
    const n = lite ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < n; i++) {
      const s = pick();
      const size = type === 'rain' ? 14 + r() * 8 : type === 'snow' ? 3 + r() * 3 : type === 'leaf' ? 14 : 6 + r() * 3;
      const land = s.y - (type === 'leaf' ? 10 : type === 'petal' ? 3 : 2);
      out.push({
        type, size,
        x: s.x + 10 + r() * (s.w - 20),
        land,
        start: land - (160 + r() * 320),
        delay: r() * (FALL_MS - 7000),
        dur: type === 'rain' ? 650 + r() * 350 : type === 'snow' ? 4500 + r() * 2500 : 5000 + r() * 2500,
        sway: type === 'rain' ? 0 : 10 + r() * 18,
        spin: (r() - 0.5) * 540,
        rest: (r() - 0.5) * 70,
        keep: false,
      });
    }
  }
  // Остаются лежать — каждая десятая (минимум 3).
  const keep = Math.max(3, Math.round(out.length * KEEP));
  for (let i = 0; i < keep && i < out.length; i++) out[Math.floor((i * out.length) / keep)].keep = true;
  return out;
}

function Piece({ p, fade, still }) {
  const t = useRef(new Animated.Value(still ? 1 : 0)).current;
  useEffect(() => {
    if (still) return undefined;
    const a = Animated.timing(t, { toValue: 1, duration: p.dur, delay: p.delay, easing: p.type === 'rain' ? Easing.in(Easing.quad) : Easing.linear, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [t, p, still]);
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const y = t.interpolate({ inputRange: [0, 1], outputRange: [p.start, p.land] });
  const x = p.sway ? t.interpolate({ inputRange: steps, outputRange: steps.map((k) => (k === 1 ? 0 : p.sway * Math.sin(k * Math.PI * 2))) }) : 0;
  const appear = t.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] });
  const opacity = p.keep ? appear : Animated.multiply(appear, fade);
  const base = { position: 'absolute', left: p.x, top: 0, opacity, transform: [{ translateY: y }, { translateX: x }] };
  if (p.type === 'rain') {
    // В полёте — штрих, на карточке — капля.
    const streak = t.interpolate({ inputRange: [0, 0.97, 1], outputRange: [0.55, 0.55, 0] });
    const drop = t.interpolate({ inputRange: [0, 0.97, 1], outputRange: [0, 0, 0.8] });
    return (
      <Animated.View style={base}>
        <Animated.View style={[s.streak, { height: p.size, opacity: streak, top: -p.size }]} />
        <Animated.View style={[s.drop, { opacity: drop }]} />
      </Animated.View>
    );
  }
  if (p.type === 'snow') {
    return <Animated.View style={[base, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: '#FFFFFF', marginTop: -p.size }]} />;
  }
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${p.spin}deg`, `${p.rest}deg`] });
  if (p.type === 'leaf') {
    return <Animated.View style={[base, { transform: [...base.transform, { rotate }] }]}><Text style={{ fontSize: p.size, marginTop: -p.size }}>🍂</Text></Animated.View>;
  }
  return <Animated.View style={[base, { width: p.size * 1.5, height: p.size, borderRadius: p.size, backgroundColor: '#FFC4DD', marginTop: -p.size, transform: [...base.transform, { rotate }] }]} />;
}

export function WeatherFall({ fx, surfaces }) {
  const parts = useMemo(() => (fallsFor(fx) && surfaces.length ? makeParts(fx, surfaces) : []), [fx, surfaces]);
  const last = played[fx];
  const replay = !reduceMotion() && (!last || Date.now() - last > REPLAY_MS);
  const [still] = useState(!replay); // уже играла недавно — сразу лежат оставшиеся
  const fade = useRef(new Animated.Value(1)).current;
  const [done, setDone] = useState(!replay);
  useEffect(() => {
    if (!parts.length || still) return undefined;
    played[fx] = Date.now();
    // Через 30 с падения + 30 с лежания — тают все, кроме оставшихся.
    const a = Animated.timing(fade, { toValue: 0, duration: 2500, delay: FALL_MS + STAY_MS, useNativeDriver: true });
    a.start(({ finished }) => { if (finished) setDone(true); });
    return () => a.stop();
  }, [parts, still, fade, fx]);
  if (!parts.length) return null;
  const shown = done ? parts.filter((p) => p.keep) : parts;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {shown.map((p, i) => <Piece key={fx + i + (done ? 'k' : '')} p={p} fade={fade} still={still || done} />)}
    </View>
  );
}

const s = StyleSheet.create({
  streak: { position: 'absolute', width: 1.5, borderRadius: 1, backgroundColor: '#A9D1FF', transform: [{ rotate: '8deg' }] },
  drop: { position: 'absolute', top: -3, left: -2, width: 5, height: 3, borderRadius: 3, backgroundColor: '#BFE0FF' },
});
