// Колесо времени в стиле iOS: два барабана (часы и минуты с шагом 5), магнитная привязка
// к строкам, щелчок вибрации на каждой строке, соседние строки плавно гаснут и уменьшаются.
// Без нативных зависимостей: Animated.ScrollView + snapToInterval.
import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useColors } from './colors';
import { SIZES } from './theme';
import { reduceMotion } from './motion';
import { tap } from './haptics';
import { tr } from './i18n';
import { fit } from './fit';

export const ITEM_H = 38;
const ROWS = 3; // видимых строк
export const STEP = 5;
const pad = (n) => (n < 10 ? '0' : '') + n;
const clamp = (i, n) => Math.max(0, Math.min(n - 1, i));

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 / STEP }, (_, i) => i * STEP);

function Column({ values, index, onIndex, name }) {
  const c = useColors();
  const y = useRef(new Animated.Value(index * ITEM_H)).current;
  const ref = useRef(null);
  const cur = useRef(index); // строка, на которой стоит барабан
  const tick = useRef(index); // строка, для которой был щелчок
  const n = values.length;
  const idxOf = (off) => clamp(Math.round(off / ITEM_H), n);

  useEffect(() => {
    if (ref.current && ref.current.scrollTo) ref.current.scrollTo({ y: cur.current * ITEM_H, animated: false });
  }, []);
  useEffect(() => {
    if (cur.current === index) return;
    cur.current = index;
    tick.current = index;
    y.setValue(index * ITEM_H);
    if (ref.current && ref.current.scrollTo) ref.current.scrollTo({ y: index * ITEM_H, animated: !reduceMotion() });
  }, [index, y]);

  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y } } }], {
    useNativeDriver: true,
    listener: (e) => {
      const i = idxOf(e.nativeEvent.contentOffset.y);
      if (i !== tick.current) { tick.current = i; tap(); }
    },
  });
  const settle = (e) => {
    const i = idxOf(e.nativeEvent.contentOffset.y);
    cur.current = i;
    if (i !== index) onIndex(i);
  };

  return (
    <View style={s.col} accessibilityLabel={name}>
      <Animated.ScrollView
        ref={ref}
        style={{ height: ITEM_H * ROWS }}
        contentContainerStyle={{ paddingVertical: ITEM_H * ((ROWS - 1) / 2) }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={settle}
        onScrollEndDrag={(e) => { if (!(e.nativeEvent.velocity && Math.abs(e.nativeEvent.velocity.y) > 0.2)) settle(e); }}
        nestedScrollEnabled
      >
        {values.map((v, i) => {
          const r = [(i - 2) * ITEM_H, (i - 1) * ITEM_H, i * ITEM_H, (i + 1) * ITEM_H, (i + 2) * ITEM_H];
          return (
            <Animated.Text
              key={v}
              {...fit(1, 0.7)}
              style={[s.item, { color: c.text, opacity: y.interpolate({ inputRange: r, outputRange: [0.12, 0.4, 1, 0.4, 0.12], extrapolate: 'clamp' }), transform: [{ scale: y.interpolate({ inputRange: r, outputRange: [0.78, 0.88, 1, 0.88, 0.78], extrapolate: 'clamp' }) }] }]}
            >
              {pad(v)}
            </Animated.Text>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

// value — минуты от полуночи (шаг 5); onChange(минуты).
export function TimeWheel({ value, onChange, label }) {
  const c = useColors();
  const m = ((Math.round(value / STEP) * STEP) % 1440 + 1440) % 1440;
  const h = Math.floor(m / 60), mi = (m % 60) / STEP;
  const shift = (d) => onChange((m + d * STEP + 1440) % 1440);
  return (
    <View
      style={s.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: pad(h) + ':' + pad(m % 60) }}
      accessibilityActions={[{ name: 'increment', label: tr('Позже') }, { name: 'decrement', label: tr('Раньше') }]}
      onAccessibilityAction={(e) => shift(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <View pointerEvents="none" style={[s.band, { backgroundColor: c.cardAlt }]} />
      <View style={s.pair}>
        <Column values={HOURS} index={h} onIndex={(i) => onChange(i * 60 + (m % 60))} name={label + ' ' + tr('часы')} />
        <Text style={[s.colon, { color: c.text }]}>:</Text>
        <Column values={MINUTES} index={mi} onIndex={(i) => onChange(h * 60 + i * STEP)} name={label + ' ' + tr('минуты')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { height: ITEM_H * ROWS, justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: ITEM_H, height: ITEM_H, borderRadius: SIZES.radiusSmall },
  pair: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  col: { width: 56 },
  item: { height: ITEM_H, lineHeight: ITEM_H, textAlign: 'center', fontSize: SIZES.title, fontWeight: '600' },
  colon: { fontSize: SIZES.title, fontWeight: '700', marginHorizontal: 2 },
});
