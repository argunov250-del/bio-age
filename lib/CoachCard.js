// Карточка «Хирон» на «Обзоре»: сообщение дня в виде сообщения в чате. Хирон работает
// офлайн (lib/coachBrain.js + встроенная база знаний lib/knowledge.js). Сначала он
// «печатает» (три точки), потом сообщение собирается по словам. Кнопки ведут в чат
// с Хироном (запись — кнопкой «＋ Записать» в шапке «Обзора»).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Glass } from './glass';
import { KineticText, reduceMotion } from './motion';
import { NEON, GAUGE, SIZES } from './theme';
import { tr } from './i18n';
import { dailyMessage } from './coachBrain';

// Аватар: светящаяся сфера с пульсирующим ореолом.
export function Orb() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={s.orbWrap}>
      <Animated.View style={[s.halo, {
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
      }]} />
      <Svg width={34} height={34}>
        <Defs>
          <RadialGradient id="orb" cx="35%" cy="30%" r="70%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.35" stopColor={NEON.mint} />
            <Stop offset="1" stopColor={NEON.teal} />
          </RadialGradient>
        </Defs>
        <Circle cx={17} cy={17} r={16} fill="url(#orb)" />
      </Svg>
    </View>
  );
}

export function Typing() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={s.typing}>
      {[0, 1, 2].map((i) => {
        const a = i / 3;
        return (
          <Animated.View key={i} style={[s.dotT, {
            transform: [{ translateY: Animated.modulo(Animated.add(t, a), 1).interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [0, -4, 0, 0] }) }],
          }]} />
        );
      })}
    </View>
  );
}

export function CoachCard({ result, profile, onAsk, onLog, busy }) {
  const [typed, setTyped] = useState(reduceMotion());
  const msg = dailyMessage(result, profile);
  const text = msg.text;
  useEffect(() => {
    if (text == null) { setTyped(false); return undefined; }
    if (reduceMotion()) { setTyped(true); return undefined; }
    setTyped(false);
    const timer = setTimeout(() => setTyped(true), GAUGE.typingMs);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <Glass glow>
      <View style={s.head}>
        <Orb />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{tr('Хирон')}</Text>
          <Text style={s.meta}>{busy ? tr('смотрит новые данные…') : tr('наставник Epimely')}</Text>
        </View>
      </View>
      <View style={s.bubble}>
        {typed && text != null ? <KineticText style={s.msg} by="word">{text}</KineticText> : <Typing />}
      </View>
      <View style={s.chips}>
        <Pressable onPress={onAsk} style={({ pressed }) => [s.chip, s.chipOn, pressed && { opacity: 0.7 }]}>
          <Text style={[s.chipText, { color: '#06141B' }]}>{tr('Спросить Хирона')}</Text>
        </Pressable>
      </View>
    </Glass>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orbWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: NEON.emerald },
  name: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '700' },
  meta: { color: '#8FB8A6', fontSize: SIZES.tiny + 1 },
  bubble: { backgroundColor: 'rgba(52,232,158,0.08)', borderRadius: 16, borderTopLeftRadius: 4, padding: 12, minHeight: 46, justifyContent: 'center' },
  msg: { color: '#E6F5EE', fontSize: SIZES.text - 1, lineHeight: 22 },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 6 },
  dotT: { width: 7, height: 7, borderRadius: 4, backgroundColor: NEON.mint },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { height: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(166,255,214,0.25)' },
  chipOn: { backgroundColor: NEON.emerald, borderColor: NEON.emerald },
  chipText: { color: '#E6F5EE', fontSize: SIZES.small, fontWeight: '700' },
});
