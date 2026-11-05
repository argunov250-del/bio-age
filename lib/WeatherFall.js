// Погода, которая «падает на интерфейс». Дождь, снег, листья и лепестки 30 секунд
// падают и ложатся на верхние края карточек «Обзора», ещё 30 секунд лежат, потом
// почти всё тает — остаётся несколько штук, и анимация полностью останавливается
// (телефон больше не нагружается). Повторно сцена играет не чаще раза в 30 минут
// или при смене погоды; до этого — сразу лежат только оставшиеся.
// Слой лежит внутри прокрутки первым ребёнком — под карточками — и не перехватывает касания.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { reduceMotion } from './motion';
import { isLite } from './perf';
import { useColors } from './colors';

// Цвета частиц: на светлом фоне — приглушённые серо-голубые, без белого и неона.
export const particleColors = (dark) => (dark
  ? { snow: '#FFFFFF', rain: '#A9D1FF', drop: '#BFE0FF', petal: '#FFC4DD', haze: '#FFFFFF', star: '#FFFFFF', firefly: '#FFE58A', flash: '#DCEBFF', op: 1 }
  : { snow: '#B4C0D0', rain: '#8EA4C2', drop: '#9DB3CF', petal: '#F1C3D3', haze: '#9AA7B8', star: '#9AA7B8', firefly: '#C9D3E0', flash: '#FFFFFF', op: 0.8 });

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

// Поверхности (верхние края карточек). Карточки регистрируют себя, а слой погоды
// перед стартом меряет их настоящее положение на экране относительно себя — так
// частицы ложатся ровно на верхний край, даже если карточки сдвинулись.
const Ctx = createContext(null);
export function useSurfaces() {
  const refs = useRef({});
  const [tick, setTick] = useState(0);
  const timer = useRef(null);
  const api = useMemo(() => ({
    refs,
    changed: () => { clearTimeout(timer.current); timer.current = setTimeout(() => setTick((x) => x + 1), 1500); },
  }), []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [{ refs, tick }, api];
}
export const SurfaceProvider = ({ register, children }) => <Ctx.Provider value={register}>{children}</Ctx.Provider>;

// Обёртка блока «Обзора»: его верхний край — поверхность для частиц.
export function Landing({ id, children, style }) {
  const api = useContext(Ctx);
  const ref = useRef(null);
  useEffect(() => {
    if (!api) return undefined;
    api.refs.current[id] = ref;
    api.changed();
    return () => { delete api.refs.current[id]; };
  }, [api, id]);
  return <View ref={ref} collapsable={false} style={style} onLayout={() => api && api.changed()}>{children}</View>;
}

const measure = (ref) => new Promise((res) => {
  if (!ref || !ref.current || !ref.current.measure) return res(null);
  ref.current.measure((x, y, w, h, px, py) => res({ x: px, y: py, w, h }));
});

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
      // Каждая пятая (кроме капель) — на самый край: соскользнёт и упадёт вниз.
      const edge = type !== 'rain' && r() < 0.2;
      const left = r() < 0.5;
      out.push({
        type, size,
        slip: edge ? (left ? -1 : 1) : 0,
        x: edge ? (left ? s.x - size * 0.3 : s.x + s.w - size * 0.7) : s.x + 10 + r() * (s.w - 20),
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
  const stay = out.filter((p) => !p.slip);
  const keep = Math.max(3, Math.round(stay.length * KEEP));
  for (let i = 0; i < keep && i < stay.length; i++) stay[Math.floor((i * stay.length) / keep)].keep = true;
  return out;
}

function Piece({ p, fade, still, fall }) {
  const PC = particleColors(useColors().dark);
  const t = useRef(new Animated.Value(still ? 1 : 0)).current;
  const slip = useRef(new Animated.Value(0)).current; // соскальзывание с края
  useEffect(() => {
    if (still) return undefined;
    const a = Animated.sequence([
      Animated.timing(t, { toValue: 1, duration: p.dur, delay: p.delay, easing: p.type === 'rain' ? Easing.in(Easing.quad) : Easing.linear, useNativeDriver: true }),
      ...(p.slip ? [Animated.timing(slip, { toValue: 1, duration: 1400, easing: Easing.in(Easing.quad), useNativeDriver: true })] : []),
    ]);
    a.start();
    return () => a.stop();
  }, [t, slip, p, still]);
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const y = t.interpolate({ inputRange: [0, 1], outputRange: [p.start, p.land] });
  const x = p.sway ? t.interpolate({ inputRange: steps, outputRange: steps.map((k) => (k === 1 ? 0 : p.sway * Math.sin(k * Math.PI * 2))) }) : 0;
  const appear = t.interpolate({ inputRange: [0, 0.04, 1], outputRange: [0, 1, 1] });
  let opacity = p.keep ? appear : Animated.multiply(appear, fade);
  const transform = [{ translateY: y }, { translateX: x }];
  if (p.slip) {
    // Ударилась о край, чуть подпрыгнула, ушла вбок и вниз за экран, растворяясь.
    transform.push({ translateY: slip.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, -14, fall] }) });
    transform.push({ translateX: slip.interpolate({ inputRange: [0, 1], outputRange: [0, p.slip * 46] }) });
    opacity = Animated.multiply(opacity, slip.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }));
  }
  const base = { position: 'absolute', left: p.x, top: 0, opacity, transform };
  if (p.type === 'rain') {
    // В полёте — штрих, на карточке — капля.
    const streak = t.interpolate({ inputRange: [0, 0.97, 1], outputRange: [0.55, 0.55, 0] });
    const drop = t.interpolate({ inputRange: [0, 0.97, 1], outputRange: [0, 0, 0.8] });
    return (
      <Animated.View style={base}>
        <Animated.View style={[s.streak, { backgroundColor: PC.rain, height: p.size, opacity: streak, top: -p.size }]} />
        <Animated.View style={[s.drop, { backgroundColor: PC.drop, opacity: drop }]} />
      </Animated.View>
    );
  }
  if (p.type === 'snow') {
    return <Animated.View style={[base, { width: p.size, height: p.size, borderRadius: p.size, backgroundColor: PC.snow, marginTop: -p.size }]} />;
  }
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: [`${p.spin}deg`, `${p.rest}deg`] });
  if (p.type === 'leaf') {
    return <Animated.View style={[base, { transform: [...base.transform, { rotate }] }]}><Text style={{ fontSize: p.size, marginTop: -p.size }}>🍂</Text></Animated.View>;
  }
  return <Animated.View style={[base, { width: p.size * 1.5, height: p.size, borderRadius: p.size, backgroundColor: PC.petal, marginTop: -p.size, transform: [...base.transform, { rotate }] }]} />;
}

export function WeatherFall({ fx, registry }) {
  const box = useRef(null);
  const [surfaces, setSurfaces] = useState([]);
  const tick = registry ? registry.tick : 0;
  // Меряем карточки относительно слоя (после того, как раскладка успокоилась).
  useEffect(() => {
    if (!registry || !fallsFor(fx)) return undefined;
    let alive = true;
    (async () => {
      const me = await measure(box);
      if (!me || !alive) return;
      const list = [];
      for (const ref of Object.values(registry.refs.current)) {
        const m = await measure(ref);
        if (m && m.w > 40) list.push({ x: m.x - me.x, y: m.y - me.y, w: m.w });
      }
      if (alive && list.length) setSurfaces((prev) => (prev.length ? prev : list)); // раскладку частиц не перестраиваем на лету
    })();
    return () => { alive = false; };
  }, [tick, fx, registry]);
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
  const shown = done ? parts.filter((p) => p.keep) : parts;
  return (
    <View ref={box} collapsable={false} style={[StyleSheet.absoluteFill, LAYER]} pointerEvents="none" testID="weather-layer">
      {shown.map((p, i) => <Piece key={fx + i + (done ? 'k' : '')} p={p} fade={fade} still={still || done} fall={900} />)}
    </View>
  );
}

// Слой под карточками: zIndex 0 и elevation 0 (на Android elevation влияет на порядок отрисовки).
const LAYER = { zIndex: 0, elevation: 0 };

const s = StyleSheet.create({
  streak: { position: 'absolute', width: 1.5, borderRadius: 1, backgroundColor: '#A9D1FF', transform: [{ rotate: '8deg' }] },
  drop: { position: 'absolute', top: -3, left: -2, width: 5, height: 3, borderRadius: 3, backgroundColor: '#BFE0FF' },
});
