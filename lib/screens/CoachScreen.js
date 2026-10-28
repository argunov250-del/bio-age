// Чат с коучем. Работает без интернета: ответы составляются на телефоне из данных
// пользователя и встроенной базы знаний (lib/coachBrain.js, lib/knowledge.js).
// Можно выбрать тему кнопкой или написать вопрос своими словами — коуч определит тему
// по ключевым словам. К ответу прикладывается факт из исследований с источником.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonBackdrop } from '../glass';
import { Orb, Typing } from '../CoachCard';
import { KineticText } from '../motion';
import { answer, topicLabel, TOPICS } from '../coachBrain';
import { NEON, GAUGE, SIZES } from '../theme';
import { tr } from '../i18n';

function Bubble({ m, last }) {
  const me = m.from === 'me';
  return (
    <View style={[s.row, me && { justifyContent: 'flex-end' }]}>
      <View style={[s.bubble, me ? s.me : s.coach]}>
        {m.text.map((p, i) => (last && !me
          ? <KineticText key={i} style={s.msg} by="word" delay={i * 260}>{p}</KineticText>
          : <Text key={i} style={[s.msg, me && { color: '#06141B' }]}>{p}</Text>))}
        {m.fact ? (
          <View style={s.fact}>
            <Text style={s.factText}>📚 {m.fact.text}</Text>
            <Text style={s.factSrc}>{m.fact.source}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function CoachScreen({ result, profile, onBack, onTips }) {
  const [msgs, setMsgs] = useState(() => {
    const a = answer('today', result, profile);
    return [{ from: 'coach', text: a.text, fact: a.fact }];
  });
  const [next, setNext] = useState(() => answer('today', result, profile).next);
  const [typing, setTyping] = useState(false);
  const [q, setQ] = useState('');
  const scroll = useRef(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const ask = (topicOrText, shown) => {
    if (typing) return;
    setMsgs((x) => [...x, { from: 'me', text: [shown] }]);
    setTyping(true);
    timer.current = setTimeout(() => {
      const a = answer(topicOrText, result, profile);
      setMsgs((x) => [...x, { from: 'coach', text: a.text, fact: a.fact }]);
      setNext(a.next);
      setTyping(false);
    }, GAUGE.typingMs);
  };
  const send = () => {
    const text = q.trim();
    if (!text) return;
    setQ('');
    ask(text, text);
  };
  // Сначала подсказки по теме ответа, потом остальные темы.
  const chips = [...next, ...TOPICS.map((x) => x.id).filter((id) => !next.includes(id))];

  return (
    <View style={s.wrap}>
      <NeonBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={s.header}>
          <View style={s.top}>
            <Pressable onPress={onBack} hitSlop={12}><Text style={s.back}>‹ {tr('Назад')}</Text></Pressable>
            {onTips ? <Pressable onPress={onTips} hitSlop={12}><Text style={s.back}>{tr('Все советы')} ›</Text></Pressable> : null}
          </View>
          <View style={s.title}>
            <Orb />
            <View>
              <Text style={s.name}>{tr('Коуч')}</Text>
              <Text style={s.meta}>{tr('офлайн · база знаний на телефоне')}</Text>
            </View>
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} contentContainerStyle={s.list} onContentSizeChange={() => scroll.current && scroll.current.scrollToEnd({ animated: true })}>
            {msgs.map((m, i) => <Bubble key={i} m={m} last={i === msgs.length - 1} />)}
            {typing ? <View style={s.row}><View style={[s.bubble, s.coach]}><Typing /></View></View> : null}
            <Text style={s.note}>{tr('Коуч даёт общие советы и не заменяет врача.')}</Text>
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            {chips.map((id) => (
              <Pressable key={id} onPress={() => ask(id, topicLabel(id))} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
                <Text style={s.chipText}>{topicLabel(id)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={s.inputRow}>
            <TextInput value={q} onChangeText={setQ} onSubmitEditing={send} returnKeyType="send" placeholder={tr('Спроси про сон, тренировки, пульс…')}
              placeholderTextColor="#7E9A8E" style={s.input} />
            <Pressable onPress={send} style={({ pressed }) => [s.send, (!q.trim() || pressed) && { opacity: 0.5 }]}>
              <Text style={s.sendText}>↑</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#06141B' },
  header: { paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: NEON.emerald, fontSize: SIZES.text },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: '#FFFFFF', fontSize: SIZES.title, fontWeight: '700' },
  meta: { color: '#8FB8A6', fontSize: SIZES.tiny + 1 },
  list: { padding: SIZES.pad, gap: 10 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '88%', borderRadius: 18, padding: 12, gap: 8 },
  coach: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: NEON.glassEdge, borderTopColor: NEON.glassTop, borderTopLeftRadius: 4 },
  me: { backgroundColor: NEON.emerald, borderTopRightRadius: 4 },
  msg: { color: '#E6F5EE', fontSize: SIZES.text - 1, lineHeight: 22 },
  fact: { backgroundColor: 'rgba(52,232,158,0.08)', borderRadius: 12, padding: 10, gap: 4 },
  factText: { color: '#CFE9DC', fontSize: SIZES.small, lineHeight: 19 },
  factSrc: { color: '#7E9A8E', fontSize: SIZES.tiny, fontStyle: 'italic' },
  note: { color: '#7E9A8E', fontSize: SIZES.tiny + 1, textAlign: 'center', marginTop: 6 },
  chips: { paddingHorizontal: SIZES.pad, gap: 8, paddingVertical: 8 },
  chip: { height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(166,255,214,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' },
  chipText: { color: '#E6F5EE', fontSize: SIZES.small, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SIZES.pad, paddingBottom: SIZES.gap },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 16, color: '#FFFFFF', fontSize: SIZES.text - 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: NEON.glassEdge },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: NEON.emerald, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#06141B', fontSize: 22, fontWeight: '800' },
});
