// Чат с Хироном (наставник Epimely). Работает без интернета. Текст пользователь не вводит: выбирает вопрос кнопкой
// (подсказки под чатом или «Все темы»), Хирон отвечает коротко, «Подробнее» раскрывает разбор с источниками.
// Старый движок свободного текста (lib/coachBrain.js reply) остаётся в репозитории, но экраном не используется.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NeonBackdrop } from '../glass';
import { Orb, Typing } from '../CoachCard';
import { KineticText, kineticMs, PopIn, PressScale, Sheet, SheetScroll, ScreenIn } from '../motion';
import { reply, intro } from '../coachBrain';
import { loadMemory, saveMemory, onCoachReset } from '../coach/store';
import { makeEnv, answerQuestion, suggestions } from '../coach/qaEngine';
import { QA_BY_ID, sectionsFor, questionsOf, search, qText, sectionTitle } from '../coach/qa';
import * as ICONS from '../icons';
import { IconChiron } from '../icons';
import { IconChip } from '../ui';
import { GAUGE, SIZES, DOCK } from '../theme';
import { useColors } from '../colors';
import { tr } from '../i18n';
import { askChiron } from '../llm';

const srcLine = (x) => (x.source ? x.source : x.title + (x.year ? ', ' + x.year : ''));

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
      {!me && m.err ? <Text style={s.err}>{m.err}</Text> : null}
    </View>
  );
}

const STORE = { msgs: null, next: [], ids: 0, typing: false, timer: null, sub: null, session: {}, loaded: false, pending: null, chips: null, lastQ: null };

const loadOnce = () => {
  if (STORE.loaded) return;
  STORE.loaded = true;
  loadMemory().then((m) => {
    const cur = STORE.session && STORE.session.memory;
    if (!cur || !cur.turn) { STORE.session = { ...STORE.session, memory: m }; STORE.chips = null; if (STORE.sub) STORE.sub(); }
  });
};

onCoachReset(() => { STORE.msgs = null; STORE.next = []; STORE.session = {}; STORE.typing = false; STORE.loaded = true; STORE.chips = null; STORE.lastQ = null; if (STORE.sub) STORE.sub(); });

const histOf = (msgs) => msgs.map((m) => ({ from: m.from, text: m.text, humorId: m.humorId }));

function TopicsSheet({ env, s, c, onClose, onPick }) {
  const [sec, setSec] = useState(null);
  const [term, setTerm] = useState('');
  const searching = term.trim().length > 0;
  const secs = sectionsFor(env);
  const list = searching ? search(term, env) : sec ? questionsOf(sec, env) : [];
  const cur = secs.find((x) => x.id === sec);
  const level = searching ? 'search' : sec || 'root';
  return (
    <Sheet onClose={onClose} style={s.sheet} title={sec && !searching && cur ? sectionTitle(cur) : tr('Все темы')}>
      <View style={s.searchBox}>
        <Text style={s.searchIcon}>⌕</Text>
        <TextInput value={term} onChangeText={setTerm} placeholder={tr('Найти вопрос')} placeholderTextColor={c.muted} style={s.search} accessibilityLabel={tr('Найти вопрос')} returnKeyType="search" />
        {searching ? (
          <Pressable onPress={() => setTerm('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="clear-search" style={s.clear}>
            <Text style={s.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
      {sec && !searching ? (
        <Pressable onPress={() => setSec(null)} hitSlop={12} style={s.backRow} accessibilityRole="button">
          <Text style={s.backLink}>‹ {tr('Все темы')}</Text>
        </Pressable>
      ) : null}
      <View style={s.sheetList}>
        <ScreenIn key={level} dir={sec && !searching ? 1 : -1}>
          <SheetScroll keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.listPad}>
            {!searching && !sec ? secs.map((x) => {
              const Ic = ICONS['Icon' + x.icon] || IconChiron;
              const n = questionsOf(x.id, env).length;
              return (
                <PressScale key={x.id} onPress={() => setSec(x.id)} style={s.secRow} accessibilityRole="button">
                  <IconChip icon={Ic} size={40} />
                  <View style={s.secBody}>
                    <Text style={s.itemText}>{sectionTitle(x)}</Text>
                    <Text style={s.count}>{n}</Text>
                  </View>
                  <Text style={s.chev}>›</Text>
                </PressScale>
              );
            }) : list.map((q) => (
              <PressScale key={q.id} onPress={() => onPick(q.id)} style={s.qRow}>
                <Text style={[s.itemText, { flex: 1 }]}>{qText(q)}</Text>
                {q.level === 'pro' ? <View style={s.pro}><Text style={s.proText}>PRO</Text></View> : null}
              </PressScale>
            ))}
            {(searching || sec) && !list.length ? <Text style={s.empty}>{tr('Ничего не найдено')}</Text> : null}
          </SheetScroll>
        </ScreenIn>
      </View>
    </Sheet>
  );
}

export function CoachScreen({ result, profile, onBack, onTips, tabbed, bottom = 0, extra, onReply }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
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
  useEffect(() => {
    if (STORE.pending) { const p = STORE.pending; STORE.pending = null; if (onReply) onReply(p); }
  }, []);
  const { msgs, typing } = STORE;
  const scroll = useRef(null);
  const toEnd = (animated = true) => { if (scroll.current) scroll.current.scrollToEnd({ animated }); };
  const dockPad = tabbed ? DOCK.height + DOCK.lift + bottom + SIZES.gap : SIZES.gap;
  useEffect(() => {
    STORE.sub = () => bump((n) => n + 1);
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
    // Пузырь — ответ локальной модели. Каталог оставляет «Подробнее», источники и память.
    STORE.timer = setTimeout(() => {
      const e = makeEnv({ result, profile, extra, memory: STORE.session.memory, history: histOf(STORE.msgs), tone: profile.coachTone || 'balanced', now: Date.now() });
      const a = answerQuestion(id, e, STORE.session.memory);
      const question = qText(q);
      const publish = (text, extra) => {
        STORE.msgs = [...STORE.msgs, { id: STORE.ids++, from: 'coach', text, anim: true, open: false, ...extra }];
        STORE.typing = false;
        if (STORE.sub) STORE.sub();
      };
      const show = (line, err) => {
        const extra = err ? { err } : {};
        if (a) {
          STORE.session = { ...STORE.session, memory: a.memory };
          saveMemory(a.memory);
          STORE.lastQ = id;
          STORE.chips = suggestions(e, a.memory, id);
          publish([line], { ...extra, more: a.more, sources: a.sources, humorId: a.humorId || null });
        } else publish([line], extra);
      };
      askChiron(question).then((model) => {
        show(model || 'Не получилось ответить. Попробуй ещё раз.');
      }).catch((err) => {
        const detail = err && (err.detail || err.message);
        show('Не получилось ответить. Попробуй ещё раз.', detail && detail !== 'Не получилось ответить. Попробуй ещё раз.' ? detail : '');
      });
    }, GAUGE.typingMs);
  };

  const openMore = (id) => { STORE.msgs = STORE.msgs.map((m) => (m.id === id ? { ...m, open: true } : m)); bump((n) => n + 1); };

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
  list: { paddingHorizontal: SIZES.pad, paddingBottom: 12, gap: 10 },
  chipsWrap: { flexGrow: 0, flexShrink: 0, height: 56 },
  chipsScroll: { flexGrow: 0 },
  chips: { paddingHorizontal: SIZES.pad, gap: 8, alignItems: 'center' },
  chip: { backgroundColor: c.card, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { color: c.text, fontSize: SIZES.small },
  actions: { paddingHorizontal: SIZES.pad, paddingTop: 8 },
  all: { backgroundColor: c.card, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  allText: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '82%', padding: 12, borderRadius: 16 },
  me: { backgroundColor: c.accent, borderBottomRightRadius: 4 },
  coach: { backgroundColor: c.card, borderBottomLeftRadius: 4 },
  msg: { color: c.text, fontSize: SIZES.text, lineHeight: 22 },
  msgMe: { color: '#fff' },
  note: { color: c.muted, fontSize: SIZES.tiny, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  err: { color: c.muted, fontSize: SIZES.tiny, marginTop: 4, maxWidth: '82%' },
  sheet: { backgroundColor: c.bg },
  searchBox: { flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: c.card, borderRadius: 12, paddingHorizontal: 12 },
  searchIcon: { color: c.muted, fontSize: 18, marginRight: 6 },
  search: { flex: 1, color: c.text, fontSize: SIZES.text, paddingVertical: 10 },
  clear: { padding: 6 },
  clearText: { color: c.muted, fontSize: 18 },
  backRow: { paddingHorizontal: 16, paddingVertical: 8 },
  backLink: { color: c.sub, fontSize: SIZES.text },
  sheetList: { flex: 1 },
  listPad: { paddingBottom: 20 },
  secRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  secBody: { flex: 1 },
  itemText: { color: c.text, fontSize: SIZES.text },
  count: { color: c.muted, fontSize: SIZES.small },
  chev: { color: c.muted, fontSize: 20 },
  qRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  pro: { backgroundColor: c.accent, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  proText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  empty: { color: c.muted, textAlign: 'center', marginTop: 20 },
  fact: { marginTop: 8, padding: 8, backgroundColor: c.bg, borderRadius: 8 },
  factText: { color: c.text, fontSize: SIZES.small },
  factSrc: { color: c.muted, fontSize: SIZES.tiny, marginTop: 2 },
  morePill: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: c.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  morePillText: { color: c.sub, fontSize: SIZES.small },
  moreBox: { marginTop: 8 },
});
