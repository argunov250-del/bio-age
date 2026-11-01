// Чат с Хироном (наставник Epimely). Работает без интернета: ответы составляются на телефоне из данных
// пользователя и встроенной базы знаний (lib/coachBrain.js, lib/knowledge.js).
// Можно выбрать тему кнопкой или написать вопрос своими словами — Хирон определит тему
// по ключевым словам. К ответу прикладывается факт из исследований с источником.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonBackdrop } from '../glass';
import { Orb, Typing } from '../CoachCard';
import { KineticText, kineticMs } from '../motion';
import { reply, intro, topicLabel, topicsFor } from '../coachBrain';
import { loadMemory, saveMemory, onCoachReset } from '../coach/store';
import { NEON, GAUGE, SIZES, DOCK } from '../theme';
import { tr } from '../i18n';
import { useKeyboardHeight } from '../ui';

// Абзацы проявляются строго по очереди: задержка абзаца — сумма длительностей предыдущих
// (та же формула, что у KineticText). Анимируется только то, что с самого начала помечено
// m.anim, и остаётся таким же — сообщение не переключается между видами и не «моргает».
function Bubble({ m }) {
  const me = m.from === 'me';
  let at = 0;
  return (
    <View style={[s.row, me && { justifyContent: 'flex-end' }]}>
      <View style={[s.bubble, me ? s.me : s.coach]}>
        {m.text.map((p, i) => {
          if (!m.anim) return <Text key={i} style={[s.msg, me && { color: '#06141B' }]}>{p}</Text>;
          const delay = at;
          at += kineticMs(p, 'word');
          return <KineticText key={i} style={s.msg} by="word" delay={delay}>{p}</KineticText>;
        })}
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

const STORE = { msgs: null, next: [], ids: 0, typing: false, timer: null, sub: null, session: {}, loaded: false };

// Состояние коуча (coachState.v1) подгружается один раз: предпочтения и недавние варианты, без текстов сообщений.
const loadOnce = () => {
  if (STORE.loaded) return;
  STORE.loaded = true;
  loadMemory().then((m) => {
    const cur = STORE.session && STORE.session.memory;
    if (!cur || !cur.turn) STORE.session = { ...STORE.session, memory: m };
  });
};
// «Очистить память Хирона» в Профиле: стираем переписку и состояние, следующий ответ начнёт с чистого листа.
onCoachReset(() => { STORE.msgs = null; STORE.next = []; STORE.session = {}; STORE.typing = false; STORE.loaded = true; if (STORE.sub) STORE.sub(); });

const histOf = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text, humorId: m.humorId }));

export function CoachScreen({ result, profile, onBack, onTips, tabbed, bottom = 0 }) {
  // Диалог живёт в модульном хранилище: переживает уход с вкладки, сбрасывается при перезапуске.
  const [, bump] = useState(0);
  loadOnce();
  if (!STORE.msgs) {
    const a = reply('today', result, profile, { history: [], tone: profile.coachTone || 'balanced', session: STORE.session });
    STORE.msgs = [{ id: STORE.ids++, from: 'coach', text: [intro(), ...a.text], fact: a.fact, humorId: a.humorId || null, anim: true }];
    STORE.next = a.next;
    STORE.session = a.session || {};
  }
  const { msgs, next, typing } = STORE;
  const [q, setQ] = useState('');
  const scroll = useRef(null);
  const kb = useKeyboardHeight();
  const toEnd = (animated = true) => { if (scroll.current) scroll.current.scrollToEnd({ animated }); };
  useEffect(() => { if (kb > 0) { const id = setTimeout(() => toEnd(true), 50); return () => clearTimeout(id); } return undefined; }, [kb]);
  // Android edge-to-edge: окно не ресайзится, поднимаем контент на высоту клавиатуры сами (она перекрывает и системную панель).
  const lift = Platform.OS === 'android' ? kb : 0;
  const dockPad = tabbed && kb === 0 ? DOCK.height + DOCK.lift + bottom + SIZES.gap : SIZES.gap;
  useEffect(() => {
    STORE.sub = () => bump((n) => n + 1);
    // При уходе с вкладки историю делаем статичной, чтобы она не проигрывалась заново.
    return () => { STORE.sub = null; STORE.msgs = STORE.msgs.map((m) => (m.anim ? { ...m, anim: false } : m)); };
  }, []);

  const ask = (topicOrText, shown) => {
    if (STORE.typing) return;
    STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'me', text: [shown] }];
    STORE.typing = true;
    bump((n) => n + 1);
    // Таймер не отменяется при уходе с вкладки: ответ всё равно добавится в хранилище.
    STORE.timer = setTimeout(() => {
      const a = reply(topicOrText, result, profile, { history: histOf(STORE.msgs), tone: profile.coachTone || 'balanced', session: STORE.session, now: Date.now() });
      STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'coach', text: a.text, fact: a.fact, humorId: a.humorId || null, anim: true }];
      STORE.next = a.next;
      STORE.session = a.session || {};
      if (a.session && a.session.memory) saveMemory(a.session.memory);
      STORE.typing = false;
      if (STORE.sub) STORE.sub();
    }, GAUGE.typingMs);
  };
  const send = () => {
    const text = q.trim();
    if (!text) return;
    setQ('');
    ask(text, text);
  };
  // Сначала подсказки по теме ответа, потом остальные темы.
  const all = topicsFor(profile).map((x) => x.id);
  const chips = [...next.filter((id) => all.includes(id)), ...all.filter((id) => !next.includes(id))];

  return (
    <View style={s.wrap}>
      <NeonBackdrop />
      <SafeAreaView style={{ flex: 1 }} edges={tabbed ? ['top'] : ['top', 'bottom']}>
        <View style={s.header}>
          <View style={s.top}>
            {tabbed ? <View /> : <Pressable onPress={onBack} hitSlop={12}><Text style={s.back}>‹ {tr('Назад')}</Text></Pressable>}
            {onTips ? <Pressable onPress={onTips} hitSlop={12}><Text style={s.back}>{tr('Все советы')} ›</Text></Pressable> : null}
          </View>
          <View style={s.title}>
            <Orb />
            <View>
              <Text style={s.name}>{tr('Хирон')}</Text>
              <Text style={s.meta}>{tr('наставник Epimely')}</Text>
            </View>
          </View>
        </View>
        <KeyboardAvoidingView style={[s.body, { paddingBottom: lift }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.listWrap}>
            <ScrollView ref={scroll} style={s.listScroll} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => toEnd(true)}>
              {msgs.map((m) => <Bubble key={m.id} m={m} />)}
              {typing ? <View style={s.row}><View style={[s.bubble, s.coach]}><Typing /></View></View> : null}
              <Text style={s.note}>{tr('Хирон даёт общие советы и не заменяет врача.')}</Text>
            </ScrollView>
          </View>
          <View style={s.chipsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
              {chips.map((id) => (
                <Pressable key={id} onPress={() => ask(id, topicLabel(id))} style={({ pressed }) => [s.chip, pressed && { opacity: 0.7 }]}>
                  <Text style={s.chipText} numberOfLines={1}>{topicLabel(id)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={[s.inputRow, { paddingBottom: dockPad }]}>
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
  header: { flexShrink: 0, paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: NEON.emerald, fontSize: SIZES.text },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: '#FFFFFF', fontSize: SIZES.title, fontWeight: '700' },
  meta: { color: '#8FB8A6', fontSize: SIZES.tiny + 1 },
  body: { flex: 1 },
  listWrap: { flex: 1, overflow: 'hidden' },
  listScroll: { flex: 1 },
  chipsWrap: { flexGrow: 0, flexShrink: 0, height: 52 },
  chipsScroll: { flexGrow: 0 },
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
  chips: { paddingLeft: SIZES.pad, paddingRight: SIZES.pad * 2, gap: 8, paddingVertical: 8, alignItems: 'center' },
  chip: { height: 36, borderRadius: 18, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(166,255,214,0.3)', backgroundColor: 'rgba(255,255,255,0.04)' },
  chipText: { color: '#E6F5EE', fontSize: SIZES.small, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: SIZES.pad, paddingBottom: SIZES.gap },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 16, color: '#FFFFFF', fontSize: SIZES.text - 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: NEON.glassEdge },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: NEON.emerald, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#06141B', fontSize: 22, fontWeight: '800' },
});
