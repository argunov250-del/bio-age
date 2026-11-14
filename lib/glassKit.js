// Стеклянный набор: матовое стекло поверх фото-фона (экраны R1–R4 редизайна).
// expo-blur подключается лениво и осторожно: нет модуля, облегчённый режим или старый Android —
// рисуем то же стекло без размытия (чуть плотнее заливка). Ничто здесь не бросает исключений.
// Android: BlurView размывает только содержимое BlurTargetView, поэтому фото-фон в App.js
// лежит внутри <BlurTargetHost>, а BlurView получает ref цели из контекста (blurTarget).
import React, { createContext, useContext, useMemo, useRef, useEffect } from 'react';
import { View, Text, Animated, Platform, StyleSheet, RefreshControl } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, SurfaceContext } from './colors';
import { PressScale, reduceMotion } from './motion';
import { isLite } from './perf';
import { EDGE, SIZES, tabInset } from './theme';
import { IconProfile } from './icons';
import { fit } from './fit';
import { tr } from './i18n';

// ---- expo-blur (ленивый require) ----
let blurMod;
function blurModule() {
  if (blurMod === undefined) {
    try {
      const m = require('expo-blur');
      blurMod = m && m.BlurView ? m : null;
    } catch (e) {
      blurMod = null;
    }
  }
  return blurMod;
}
// Для тестов: забыть закэшированный результат require.
export function resetBlurCache() { blurMod = undefined; }
// Есть ли модуль expo-blur (не значит, что размытие сейчас включено).
export const hasBlur = () => !!blurModule();

const BlurTargetCtx = createContext(null);

// Цель размытия для Android: оборачивает то, что нужно размывать (фото-фон). Вне Android и без модуля — обычный View.
export function BlurTargetHost({ children, style }) {
  const ref = useRef(null);
  const m = blurModule();
  const Target = m && m.BlurTargetView;
  if (!Target || Platform.OS !== 'android') return <View style={style}>{children}</View>;
  return (
    <BlurTargetCtx.Provider value={ref}>
      <Target ref={ref} style={style}>{children}</Target>
    </BlurTargetCtx.Provider>
  );
}

// Можно ли рисовать BlurView сейчас: модуль есть, режим не облегчённый; на Android — есть цель и API ≥ 31.
function blurReady(target) {
  if (!blurModule() || isLite()) return false;
  if (Platform.OS === 'android') return !!target && Number(Platform.Version) >= 31;
  return true;
}
export function useBlurReady() { return blurReady(useContext(BlurTargetCtx)); }

function BlurLayer({ intensity, tint, style }) {
  const target = useContext(BlurTargetCtx);
  if (!blurReady(target)) return null;
  const B = blurModule().BlurView;
  const extra = Platform.OS === 'android' ? { blurMethod: 'dimezisBlurViewSdk31Plus', blurTarget: target } : null;
  return <B pointerEvents="none" intensity={Math.max(1, Math.min(100, intensity))} tint={tint} style={style || StyleSheet.absoluteFill} {...extra} />;
}

// ---- оболочка навигации: аватар, заголовок вкладки, режим «открыт поверх вкладок» ----
export const ShellContext = createContext({});
export const useShell = () => useContext(ShellContext);

// ---- стекло ----
// style — снаружи (размеры, отступы), contentStyle — внутри (padding, раскладка). strong — плотнее/ярче.
export function GlassView({ children, style, contentStyle, radius = 26, intensity, strong, sheen = true, pointerEvents, testID, ...rest }) {
  const c = useColors();
  const g = c.glass;
  const target = useContext(BlurTargetCtx);
  const blur = blurReady(target);
  const lite = isLite();
  const clip = { borderRadius: radius };
  const fill = blur ? g.fill : g.fillFallback;
  return (
    <View {...rest} testID={testID} pointerEvents={pointerEvents} style={[clip, lite ? null : g.shadow, style]}>
      <View style={[styles.clip, clip, { borderColor: g.stroke }]}>
        <BlurLayer intensity={(intensity || g.intensity) * (strong ? 1.25 : 1)} tint={g.tint} />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: fill }, strong && { backgroundColor: g.active }]} />
        {sheen && !lite ? <Sheen color={g.sheen} /> : null}
        <View pointerEvents="none" style={[styles.hl, { left: radius * 0.6, right: radius * 0.6, backgroundColor: g.highlight }]} />
        <SurfaceContext.Provider value="card"><View style={contentStyle}>{children}</View></SurfaceContext.Provider>
      </View>
    </View>
  );
}

// Блик: диагональный градиент от левого верхнего угла.
function Sheen({ color }) {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="1" />
          <Stop offset="0.55" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glassSheen)" />
    </Svg>
  );
}

// Карточка: отступ, радиус, нажатие с пружиной (если есть onPress).
export function GlassCard({ children, style, contentStyle, padding = SIZES.pad, radius = 26, onPress, strong, intensity, accessibilityLabel, testID }) {
  const body = <GlassView radius={radius} strong={strong} intensity={intensity} contentStyle={[{ padding }, contentStyle]} style={onPress ? undefined : style} testID={onPress ? undefined : testID}>{children}</GlassView>;
  if (!onPress) return body;
  return <PressScale onPress={onPress} scale={0.98} style={style} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}>{body}</PressScale>;
}

// Таблетка: короткая подпись (и значок) на стекле; active — ярче.
export function GlassPill({ label, icon: Icon, active, onPress, style, height = 36, accessibilityLabel, testID }) {
  const c = useColors();
  const inner = (
    <GlassView radius={height / 2} strong={active} intensity={30} sheen={false} style={onPress ? undefined : style}
      contentStyle={{ height, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      {Icon ? <Icon color={c.text} size={16} sw={1.6} /> : null}
      {label ? <Text style={[styles.pillText, { color: c.text }]} {...fit(1, 0.75)}>{label}</Text> : null}
    </GlassView>
  );
  if (!onPress) return inner;
  return <PressScale onPress={onPress} style={style} accessibilityRole="button" accessibilityLabel={accessibilityLabel || label} testID={testID}>{inner}</PressScale>;
}

// Круглая кнопка со значком (аватар, «+»).
export function GlassIconButton({ children, onPress, size = 42, style, accessibilityLabel, testID }) {
  const inner = (
    <GlassView radius={size / 2} intensity={32} sheen={false} style={onPress ? undefined : style} contentStyle={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </GlassView>
  );
  if (!onPress) return inner;
  return <PressScale onPress={onPress} hitSlop={6} scale={0.94} style={style} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}>{inner}</PressScale>;
}

// Малая плитка (R2): значок в круглой подложке, подпись, крупное значение с единицей.
export function GlassTile({ icon: Icon, label, value, unit, color, onPress, style, testID }) {
  const c = useColors();
  const tint = color || c.accent;
  return (
    <GlassCard padding={12} radius={22} onPress={onPress} style={[styles.tile, style]} testID={testID}>
      <View style={styles.tileTop}>
        <View style={[styles.chip, { backgroundColor: tint + '2E' }]}>{Icon ? <Icon color={tint} size={16} sw={1.7} /> : null}</View>
        <Text style={[styles.tileLabel, { color: c.sub }]} {...fit(2, 0.7)}>{label}</Text>
      </View>
      <View style={styles.tileVal}>
        <Text style={[styles.tileNum, { color: c.text }]} {...fit(1, 0.6)}>{value == null ? '—' : String(value)}</Text>
        {unit ? <Text style={[styles.tileUnit, { color: c.sub }]} {...fit(1, 0.7)}>{unit}</Text> : null}
      </View>
    </GlassCard>
  );
}

// Стиль для существующей шторки Sheet (lib/motion.js): <Sheet style={glassSheetStyle(c)}>.
export function glassSheetStyle(c) {
  const g = (c && c.glass) || {};
  return { backgroundColor: g.sheet || (c && c.card), borderColor: g.stroke || (c && c.line), borderWidth: 1 };
}
export function useGlassSheet() { return glassSheetStyle(useColors()); }

// ---- размытие по краям ----
// Полоса у верхнего/нижнего края: две наложенные полосы BlurView (шире — слабее, у края — сильнее)
// и градиентное затемнение. Прозрачность растёт с прокруткой (scrollY), если он передан. Касания не перехватывает.
export function EdgeBlur({ edge = 'top', height = EDGE.top, scrollY, from = 0, to = 48, style, testID }) {
  const target = useContext(BlurTargetCtx);
  const bands = blurReady(target) ? [{ h: 1, i: 16 }, { h: 0.55, i: 34 }] : [];
  const bottom = edge === 'bottom';
  const opacity = scrollY && !reduceMotion() ? scrollY.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: 'clamp' }) : 1;
  const id = bottom ? 'edgeFadeB' : 'edgeFadeT';
  const c = useColors();
  const tint = c.glass.tint;
  return (
    <Animated.View pointerEvents="none" testID={testID || 'edge-blur-' + edge} style={[styles.edge, bottom ? { bottom: 0 } : { top: 0 }, { height, opacity }, style]}>
      {bands.map((b, k) => (
        <View key={k} style={[styles.band, bottom ? { bottom: 0 } : { top: 0 }, { height: height * b.h }]}>
          <BlurLayer intensity={b.i} tint={tint === 'light' ? 'dark' : tint} />
        </View>
      ))}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1={bottom ? '1' : '0'} x2="0" y2={bottom ? '0' : '1'}>
            <Stop offset="0" stopColor="#06141B" stopOpacity={blurReady(target) ? 0.55 : 0.85} />
            <Stop offset="0.6" stopColor="#06141B" stopOpacity={blurReady(target) ? 0.18 : 0.3} />
            <Stop offset="1" stopColor="#06141B" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={'url(#' + id + ')'} />
      </Svg>
    </Animated.View>
  );
}

// ---- аватар ----
export function AvatarButton({ onPress, initial, testID = 'avatar-button' }) {
  const c = useColors();
  return (
    <GlassIconButton onPress={onPress} accessibilityLabel={tr('Профиль')} testID={testID}>
      {initial ? <Text style={[styles.initial, { color: c.text }]}>{String(initial).slice(0, 1).toUpperCase()}</Text> : <IconProfile color={c.text} size={20} sw={1.7} />}
    </GlassIconButton>
  );
}

// ---- экран ----
// Прокручиваемый контейнер: Animated.ScrollView с scrollY, безопасные зоны, размытие сверху и снизу.
// tab — экран вкладки: шапка (заголовок слева, аватар справа — по умолчанию в профиль) лежит поверх контента,
// снизу — отступ под панель вкладок. Без tab: header (узел) стоит над прокруткой, снизу — безопасная зона.
// Текст прямо на фото берёт цвета из SurfaceContext «photo».
const HEADER_H = 56;
export function GlassScreen({ children, tab, header, title, right, onRefresh, scrollRef, contentStyle, scrollY: scrollYProp, testID }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const shell = useShell();
  const own = useRef(new Animated.Value(0)).current;
  const scrollY = scrollYProp || own;
  const onScroll = useMemo(() => Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }), [scrollY]);
  useEffect(() => () => { try { scrollY.removeAllListeners && scrollY.removeAllListeners(); } catch (e) { /* нечего снимать */ } }, [scrollY]);
  const top = tab ? insets.top + HEADER_H : 0;
  const bottomPad = tab ? tabInset(insets.bottom) : insets.bottom + SIZES.pad;
  const ttl = title != null ? title : shell.title;
  const rightNode = right !== undefined ? right : (shell.onProfile ? <AvatarButton onPress={shell.onProfile} initial={shell.initial} /> : null);
  const scroll = (
    <Animated.ScrollView
      ref={scrollRef}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[contentStyle, tab && { paddingTop: top + SIZES.gap }, { paddingBottom: bottomPad }]}
      refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} progressViewOffset={top} tintColor={c.text} colors={[c.accent]} progressBackgroundColor={c.card} /> : undefined}
    >
      <SurfaceContext.Provider value="photo">{children}</SurfaceContext.Provider>
    </Animated.ScrollView>
  );
  if (tab) {
    return (
      <View style={styles.fill} testID={testID || 'glass-screen'}>
        {scroll}
        <EdgeBlur edge="top" height={top + 24} scrollY={scrollY} />
        <EdgeBlur edge="bottom" height={Math.max(EDGE.bottom, tabInset(insets.bottom) + 16)} />
        <View style={[styles.header, { top: insets.top, height: HEADER_H }]} pointerEvents="box-none">
          <Text style={[styles.title, { color: c.onBg }]} {...fit(1, 0.7)}>{ttl || ''}</Text>
          {rightNode}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.fill, { paddingTop: insets.top }]} testID={testID || 'glass-screen'}>
      {header}
      <View style={styles.fill}>
        {scroll}
        <EdgeBlur edge="top" height={28} scrollY={scrollY} />
        <EdgeBlur edge="bottom" height={insets.bottom + 36} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { overflow: 'hidden', borderWidth: 1 },
  hl: { position: 'absolute', top: 0, height: 1 },
  pillText: { fontSize: 13, fontWeight: '700' },
  tile: { flex: 1, minWidth: 0 },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  tileVal: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 10 },
  tileNum: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
  tileUnit: { fontSize: 13, fontWeight: '600' },
  edge: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  band: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' },
  initial: { fontSize: 17, fontWeight: '800' },
  header: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.pad, gap: 12 },
  title: { flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
});
