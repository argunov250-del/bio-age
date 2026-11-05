// Карточка «Хирон» на «Обзоре»: сообщение дня в виде сообщения в чате. Хирон работает
// офлайн (lib/coachBrain.js + встроенная база знаний lib/knowledge.js). Сначала он
// «печатает» (три точки), потом сообщение собирается по словам. Кнопки ведут в чат
// с Хироном (запись — кнопкой «＋ Записать» в шапке «Обзора»).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Glass } from './glass';
import { KineticText, reduceMotion } from './motion';
import { GAUGE, SIZES } from './theme';
import { useColors } from './colors';
import { Button } from './ui';
import { tr } from './i18n';
import { dailyMessage } from './coachBrain';

// Аватар: светящаяся сфера с пульсирующим ореолом. mood: 'tired' (тусклая, медленно дышит),
// 'ok' (как обычно), 'happy' (ярче и чаще) — настроение самого Хирона (карточки арок), не фигуры пользователя.
const MOODS = {
  tired: { ms: 4800, opacity: 0.55, mid: ['#9AA7B8', '#8E9BB0'], halo: [0.3, 0] },
  ok: { ms: 2400, opacity: 1, mid: null, halo: [0.5, 0] },
  happy: { ms: 1700, opacity: 1, mid: ['#B8F5D6', '#9CF0C4'], halo: [0.7, 0] },
};
export function Orb({ mood = 'ok', size = 34 }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const m = MOODS[mood] || MOODS.ok;
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion()) return undefined;
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: m.ms, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t, m.ms]);
  const mid = m.mid ? m.mid[c.dark ? 1 : 0] : c.dark ? '#8CE9BC' : '#7EE0B0';
  const box = { width: size, height: size };
  return (
    <View style={[s.orbWrap, box, { opacity: m.opacity }]} accessibilityLabel={'chiron-' + mood}>
      <Animated.View style={[s.halo, box, { borderRadius: size / 2 }, {
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: m.halo }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }],
      }]} />
      <Svg width={size} height={size} viewBox="0 0 34 34">
        <Defs>
          <RadialGradient id={'orb-' + mood} cx="35%" cy="30%" r="70%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.35" stopColor={mid} />
            <Stop offset="1" stopColor={mood === 'tired' ? '#6F7C91' : c.accent} />
          </RadialGradient>
        </Defs>
        <Circle cx={17} cy={17} r={16} fill={'url(#orb-' + mood + ')'} />
      </Svg>
    </View>
  );
}

export function Typing() {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
    <Glass>
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
        <Button title={tr('Спросить Хирона')} onPress={onAsk} compact />
      </View>
    </Glass>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  orbWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: c.accent },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1 },
  bubble: { backgroundColor: c.cardAlt, borderRadius: 18, borderTopLeftRadius: 4, padding: 12, minHeight: 46, justifyContent: 'center' },
  msg: { color: c.text, fontSize: SIZES.text - 1, lineHeight: 22 },
  typing: { flexDirection: 'row', gap: 5, paddingVertical: 6 },
  dotT: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.sub },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
