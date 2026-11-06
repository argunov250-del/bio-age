// Новый ранг (spec 1.2.5): вставка на экране «Рост». 2,5 с фигура вспыхивает аурой (×1,3 за 600 мс),
// затем остаётся карточка «Новый ранг» с кнопкой «Дальше». При reduceMotion — сразу карточка, без вспышки.
import { fit } from './fit';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { Button } from './ui';
import { Silhouette } from './Silhouette';
import { reduceMotion } from './motion';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

export const RANK_FLASH_MS = 2500;

export function RankUp({ rank, tier = 0, level, onClose }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const calm = reduceMotion();
  const [stage, setStage] = useState(calm ? 'card' : 'flash');
  const aura = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (calm) return undefined;
    const a = Animated.timing(aura, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    a.start();
    const id = setTimeout(() => setStage('card'), RANK_FLASH_MS);
    return () => { a.stop(); clearTimeout(id); };
  }, [aura, calm]);
  const flash = stage === 'flash';
  return (
    <View style={s.wrap} accessibilityLabel="rank-up">
      <View style={s.scrim} />
      <View style={s.card}>
        <View style={s.figure}>
          {flash ? (
            <Animated.View style={[s.aura, {
              opacity: aura.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
              transform: [{ scale: aura.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
            }]} />
          ) : null}
          <Silhouette height={flash ? 190 : 120} opacity={0.95} tier={tier} level={level} still={!flash} />
        </View>
        <Text {...fit(2, 0.6)} style={s.name}>{rank && rank.name}</Text>
        <Text style={s.sub}>{tr('Новый ранг') + ': ' + (rank ? rank.name : '')}</Text>
        {flash ? null : <Button title={tr('Дальше')} onPress={onClose} style={{ alignSelf: 'stretch' }} />}
      </View>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 50 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: c.dark ? 'rgba(0,0,0,0.7)' : 'rgba(20,20,24,0.45)' },
  card: { alignSelf: 'stretch', alignItems: 'center', gap: 10, padding: 20, borderRadius: 28, backgroundColor: c.card, borderWidth: c.border, borderColor: c.line },
  figure: { height: 200, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  aura: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: c.accent },
  name: { color: c.text, fontSize: SIZES.title, fontWeight: '800', textAlign: 'center' },
  sub: { color: c.sub, fontSize: SIZES.small + 1, textAlign: 'center' },
});
