// Чат с Хироном (наставник Epimely). Работает без интернета. Текст пользователь не вводит: выбирает вопрос кнопкой
// (подсказки под чатом или «Все темы»), Хирон отвечает коротко, «Подробнее» раскрывает разбор с источниками.
// Старый движок свободного текста (lib/coachBrain.js reply) остаётся в репозитории, но экраном не используется.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonBackdrop } from '../glass';
import { Orb, Typing } from '../CoachCard';
import { KineticText, kineticMs, PopIn, PressScale, Sheet } from '../motion';
import { reply, intro } from '../coachBrain';
import { loadMemory, saveMemory, onCoachReset } from '../coach/store';
import { makeEnv, answerQuestion, suggestions, safetyAnswer } from '../coach/qaEngine';
import { QA_BY_ID, sectionsFor, questionsOf, search, qText, sectionTitle } from '../coach/qa';
import { GAUGE, SIZES, DOCK } from '../theme';
import { useColors } from '../colors';
import { tr } from '../i18n';

const srcLine = (x) => (x.source ? x.source : x.title + (x.year ? ', ' + x.year : ''));

// Абзацы проявляются строго по очереди: задержка абзаца — сумма длительностей предыдущих
// (та же формула, что у KineticText). Анимируется только то, что с самого начала помечено
// m.anim, и остаётся таким же — сообщение не переключается между видами и не «моргает».
function Bubble({ m, s, onMore }) {
  const me = m.from === 'me';
  let at = 0;
  return (
    <View style={[s.row, me && { justifyContent: 'flex-end' }]}>
      <PopIn instant={!m.anim} style={[s.bubble, me ? s.me : s.coach]}>
        {m.text.map((p, i) => {
          if (!m.anim) return <Text key={i} style={[s.msg, me && s.msgMe]}>{p}</Text>;
          const delay = at;
          at += kineticMs(p, 'word');
          return <KineticText key={i} style={[s.msg, me && s.msgMe]} by="word" delay={delay}>{p}</KineticText>;
        })}
        {m.fact ? (
          <View style={s.fact}>
            <Text style={s.factText}>📚 {m.fact.text}</Text>
            <Text style={s.factSrc}>{m.fact.source}</Text>
          </View>
        ) : null}
        {m.more && !m.open ? (
          <PressScale onPress={() => onMore(m.id)} style={s.morePill} accessibilityRole="button" accessibilityLabel={tr('Подробнее')}>
            <Text style={s.morePillText}>{tr('Подробнее')}</Text>
          </PressScale>
        ) : null}
        {m.more && m.open ? (
          <View style={s.moreBox}>
            {m.more.split('\n').filter(Boolean).map((p, i) => <Text key={i} style={s.msg}>{p}</Text>)}
            {(m.sources || []).map((x, i) => (
              <View key={i} style={s.fact}>
                {x.text ? <Text style={s.factText}>📚 {x.text}</Text> : null}
                <Text style={s.factSrc}>{x.text ? srcLine(x) : '📚 ' + srcLine(x)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </PopIn>
    </View>
  );
}

const STORE = { msgs: null, next: [], ids: 0, typing: false, timer: null, sub: null, session: {}, loaded: false, pending: null, chips: null, lastQ: null };

// Состояние коуча (coachState.v1) подгружается один раз: предпочтения и недавние варианты, без текстов сообщений.
const loadOnce = () => {
  if (STORE.loaded) return;
  STORE.loaded = true;
  loadMemory().then((m) => {
    const cur = STORE.session && STORE.session.memory;
    if (!cur || !cur.turn) { STORE.session = { ...STORE.session, memory: m }; STORE.chips = null; if (STORE.sub) STORE.sub(); }
  });
};
// «Очистить память Хирона» в Профиле: стираем переписку и состояние, следующий ответ начнёт с чистого листа.
onCoachReset(() => { STORE.msgs = null; STORE.next = []; STORE.session = {}; STORE.typing = false; STORE.loaded = true; STORE.chips = null; STORE.lastQ = null; if (STORE.sub) STORE.sub(); });

const histOf = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text, humorId: m.humorId }));

// Окно «Все темы»: разделы -> вопросы; поиск фильтрует только список вопросов (текст Хирону не отправляется).
function TopicsSheet({ env, s, c, onClose, onPick }) {
  const [sec, setSec] = useState(null);
  const [term, setTerm] = useState('');
  const searching = term.trim().length > 0;
  const secs = sectionsFor(env);
  const list = searching ? search(term, env) : sec ? questionsOf(sec, env) : [];
  const cur = secs.find((x) => x.id === sec);
  return (
    <Sheet onClose={onClose} style={s.sheet}>
      <View style={s.grab} />
      <View style={s.sheetTop}>
        {sec && !searching ? <Pressable onPress={() => setSec(null)} hitSlop={12}><Text style={s.back}>‹ {tr('Назад')}</Text></Pressable> : <View />}
        <Text style={s.sheetTitle}>{sec && !searching && cur ? sectionTitle(cur) : tr('Все темы')}</Text>
        <View />
      </View>
      <TextInput value={term} onChangeText={setTerm} placeholder={tr('Найти вопрос')} placeholderTextColor={c.muted} style={s.search} accessibilityLabel={tr('Найти вопрос')} />
      <ScrollView style={s.sheetList} keyboardShouldPersistTaps="handled">
        {!searching && !sec ? secs.map((x) => (
          <PressScale key={x.id} onPress={() => setSec(x.id)} style={s.item}>
            <Text style={s.itemText}>{sectionTitle(x)}</Text>
            <Text style={s.chev}>›</Text>
          </PressScale>
        )) : list.map((q) => (
          <PressScale key={q.id} onPress={() => onPick(q.id)} style={s.item}>
            <Text style={s.itemText}>{qText(q)}{q.level === 'pro' ? '  · PRO' : ''}</Text>
          </PressScale>
        ))}
        {(searching || sec) && !list.length ? <Text style={s.empty}>{tr('Ничего не найдено')}</Text> : null}
      </ScrollView>
    </Sheet>
  );
}

// extra — { arc, rank, quests, rest } для приветствия (lib/coach/greetExtra.js); onReply(a) получает holdSet/consumed.
export function CoachScreen({ result, profile, onBack, onTips, tabbed, bottom = 0, extra, onReply }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  // Диалог живёт в модульном хранилище: переживает уход с вкладки, сбрасывается при перезапуске.
  const [, bump] = useState(0);
  const [sheet, setSheet] = useState(false);
  loadOnce();
  if (!STORE.msgs) {
    const a = reply('today', result, profile, { history: [], tone: profile.coachTone || 'balanced', session: STORE.session, extra: extra || null });
    STORE.pending = a;
    STORE.msgs = [{ id: STORE.ids++, from: 'coach', text: [intro(), ...a.text], fact: a.fact, humorId: a.humorId || null, anim: true }];
    STORE.next = a.next;
    STORE.session = a.session || {};
    STORE.chips = null;
  }
  useEffect(() => { // ответ, собранный при первой отрисовке: сообщаем наружу уже после неё
    if (STORE.pending) { const p = STORE.pending; STORE.pending = null; if (onReply) onReply(p); }
  }, []);
  const { msgs, typing } = STORE;
  const scroll = useRef(null);
  const toEnd = (animated = true) => { if (scroll.current) scroll.current.scrollToEnd({ animated }); };
  const dockPad = tabbed ? DOCK.height + DOCK.lift + bottom + SIZES.gap : SIZES.gap;
  useEffect(() => {
    STORE.sub = () => bump((n) => n + 1);
    // При уходе с вкладки историю делаем статичной, чтобы она не проигрывалась заново.
    return () => { STORE.sub = null; STORE.msgs = STORE.msgs.map((m) => (m.anim ? { ...m, anim: false } : m)); };
  }, []);

  const mkEnv = () => makeEnv({ result, profile, extra, memory: STORE.session.memory, history: histOf(STORE.msgs), tone: profile.coachTone || 'balanced' });
  const env = mkEnv();
  if (!STORE.chips) STORE.chips = suggestions(env, STORE.session.memory, STORE.lastQ);

  const ask = (id) => {
    const q = QA_BY_ID[id];
    if (STORE.typing || !q) return;
    setSheet(false);
    STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'me', text: [qText(q)] }];
    STORE.typing = true;
    bump((n) => n + 1);
    // Таймер не отменяется при уходе с вкладки: ответ всё равно добавится в хранилище.
    STORE.timer = setTimeout(() => {
      const e = makeEnv({ result, profile, extra, memory: STORE.session.memory, history: histOf(STORE.msgs), tone: profile.coachTone || 'balanced', now: Date.now() });
      const a = answerQuestion(id, e, STORE.session.memory);
      if (a) {
        STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'coach', text: a.text, more: a.more, sources: a.sources, open: false, humorId: a.humorId || null, anim: true }];
        STORE.session = { ...STORE.session, memory: a.memory };
        saveMemory(a.memory);
        STORE.lastQ = id;
        STORE.chips = suggestions(e, a.memory, id);
      }
      STORE.typing = false;
      if (STORE.sub) STORE.sub();
    }, GAUGE.typingMs);
  };
  const openMore = (id) => { STORE.msgs = STORE.msgs.map((m) => (m.id === id ? { ...m, open: true } : m)); bump((n) => n + 1); };
  // «Мне плохо»: готовые тексты безопасности (103/112, кризисные линии). Ничего не сохраняем и не считаем.
  const unwell = () => {
    STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'coach', text: safetyAnswer(mkEnv()), anim: true }];
    bump((n) => n + 1);
  };

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
        <View style={s.body}>
          <View style={s.listWrap}>
            <ScrollView ref={scroll} style={s.listScroll} contentContainerStyle={s.list} onContentSizeChange={() => toEnd(true)}>
              {msgs.map((m) => <Bubble key={m.id} m={m} s={s} onMore={openMore} />)}
              {typing ? <View style={s.row}><View style={[s.bubble, s.coach]}><Typing /></View></View> : null}
              <Text style={s.note}>{tr('Хирон даёт общие советы и не заменяет врача.')}</Text>
            </ScrollView>
          </View>
          <View style={s.chipsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipsScroll} contentContainerStyle={s.chips}>
              {STORE.chips.map((id) => (
                <PressScale key={id} onPress={() => ask(id)} style={s.chip} accessibilityRole="button">
                  <Text style={s.chipText} numberOfLines={1}>{qText(QA_BY_ID[id])}</Text>
                </PressScale>
              ))}
            </ScrollView>
          </View>
          <View style={[s.actions, { paddingBottom: dockPad }]}>
            <PressScale onPress={() => setSheet(true)} style={s.all} accessibilityRole="button" accessibilityLabel={tr('Все темы')}>
              <Text style={s.allText}>{tr('Все темы')}</Text>
            </PressScale>
            <PressScale onPress={unwell} style={s.unwell} accessibilityRole="button" accessibilityLabel={tr('Мне плохо')}>
              <Text style={s.unwellText}>{tr('Мне плохо')}</Text>
            </PressScale>
          </View>
        </View>
      </SafeAreaView>
      {sheet ? <TopicsSheet env={env} s={s} c={c} onClose={() => setSheet(false)} onPick={ask} /> : null}
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: c.bg },
  header: { flexShrink: 0, paddingHorizontal: SIZES.pad, paddingTop: SIZES.gap, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: c.sub, fontSize: SIZES.text },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: c.text, fontSize: SIZES.title, fontWeight: '800', textTransform: 'uppercase' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1 },
  body: { flex: 1 },
  listWrap: { flex: 1, overflow: 'hidden' },
  listScroll: { flex: 1 },
  chipsWrap: { flexGrow: 0, flexShrink: 0, height: 56 },
  chipsScroll: { flexGrow: 0 },
  list: { padding: SIZES.pad, gap: 10 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '88%', borderRadius: 22, padding: 14, gap: 8 },
  coach: { backgroundColor: c.card, borderWidth: c.border, borderColor: c.line, borderTopLeftRadius: 6, ...c.shadow },
  me: { backgroundColor: c.primary, borderTopRightRadius: 6 },
  msg: { color: c.text, fontSize: SIZES.text - 1, lineHeight: 22 },
  msgMe: { color: c.onPrimary },
  fact: { backgroundColor: c.cardAlt, borderRadius: 14, padding: 10, gap: 4 },
  factText: { color: c.text, fontSize: SIZES.small, lineHeight: 19 },
  factSrc: { color: c.sub, fontSize: SIZES.tiny, fontStyle: 'italic' },
  morePill: { alignSelf: 'flex-start', height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: c.cardAlt, borderWidth: c.border, borderColor: c.line },
  morePillText: { color: c.text, fontSize: SIZES.small, fontWeight: '700' },
  moreBox: { gap: 8 },
  note: { color: c.muted, fontSize: SIZES.tiny + 1, textAlign: 'center', marginTop: 6 },
  chips: { paddingLeft: SIZES.pad, paddingRight: SIZES.pad * 2, gap: 8, paddingVertical: 10, alignItems: 'center' },
  chip: { height: 36, maxWidth: 300, borderRadius: 18, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: c.card, borderWidth: c.border, borderColor: c.line, ...c.shadow },
  chipText: { color: c.text, fontSize: SIZES.small, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: SIZES.pad },
  all: { height: 44, borderRadius: 22, paddingHorizontal: 22, justifyContent: 'center', backgroundColor: c.primary },
  allText: { color: c.onPrimary, fontSize: SIZES.text - 1, fontWeight: '800' },
  unwell: { height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: c.card, borderWidth: c.border, borderColor: c.line },
  unwellText: { color: c.sub, fontSize: SIZES.small, fontWeight: '600' },
  sheet: { height: '78%', backgroundColor: c.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, gap: 12, borderWidth: c.border, borderColor: c.line },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.line, marginBottom: 2 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { color: c.text, fontSize: SIZES.text, fontWeight: '800' },
  search: { height: 44, borderRadius: 22, paddingHorizontal: 16, color: c.text, fontSize: SIZES.text - 1, backgroundColor: c.cardAlt, borderWidth: c.border, borderColor: c.line },
  sheetList: { flex: 1 },
  item: { minHeight: 48, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line },
  itemText: { color: c.text, fontSize: SIZES.text - 1, flexShrink: 1 },
  chev: { color: c.sub, fontSize: 22 },
  empty: { color: c.muted, fontSize: SIZES.small, paddingVertical: 16, textAlign: 'center' },
});
