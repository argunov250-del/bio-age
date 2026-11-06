// Карточка «История» (spec 3.3): сюжетная арка Хирона. Хирон показан в своём настроении (Orb: tired / ok / happy),
// это отдельный образ, а не фигура пользователя. Действия — arcAct: принять, позже, закрыть, ответить, отметить шаг.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Section } from './ui';
import { PressScale } from './motion';
import { Orb } from './CoachCard';
import { IconCheck } from './homeIcons';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

function Btn({ s, label, onPress, ghost, a11y }) {
  return (
    <PressScale onPress={onPress} accessibilityLabel={a11y} style={[s.btn, ghost && s.btnGhost]}>
      <Text {...fit(1, 0.7)} style={[s.btnText, ghost && s.btnTextGhost]}>{label}</Text>
    </PressScale>
  );
}

export function ArcCard({ arc, onAct, compact, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  if (!arc || !arc.id || arc.stage === 'none') return null;
  const id = arc.id;
  const act = (a, opts) => () => { if (onAct) onAct(id, a, opts); };
  const quests = arc.quests || [];
  const doneN = quests.filter((q) => q.done).length;
  const offer = arc.stage === 'offer';
  const checkin = arc.stage === 'checkin';
  const active = arc.stage === 'active';
  const healed = arc.stage === 'healed';
  const buttons = offer ? (
    <View style={s.btns}>
      <Btn s={s} label={tr('Помогу')} a11y="arc-accept" onPress={act('accept')} />
      <Btn s={s} label={tr('Позже')} a11y="arc-later" ghost onPress={act('later')} />
      <Btn s={s} label={tr('Закрыть')} a11y="arc-close" ghost onPress={act('close')} />
    </View>
  ) : checkin ? (
    <View style={s.btns}>
      <Btn s={s} label={tr('Всё в порядке')} a11y="arc-answer" onPress={act('answer')} />
      <Btn s={s} label={tr('Позже')} a11y="arc-later" ghost onPress={act('later')} />
      <Btn s={s} label={tr('Закрыть')} a11y="arc-close" ghost onPress={act('close')} />
    </View>
  ) : active ? (
    <View style={s.btns}><Btn s={s} label={tr('Закрыть историю')} a11y="arc-close" ghost onPress={act('close')} /></View>
  ) : null;

  if (compact) {
    return (
      <>
        <Section>{tr('История')}</Section>
        <Card style={s.card} onPress={onOpen}>
          <View style={s.head}>
            <Orb mood={arc.chironMood} size={40} />
            <View style={s.headText}>
              <Text {...fit(2, 0.7)} style={s.title}>{arc.title}</Text>
              <Text style={s.text} numberOfLines={2}>{arc.text}</Text>
              {active || healed ? <Text {...fit(1, 0.7)} style={s.prog}>{doneN + ' ' + tr('из') + ' ' + (quests.length || 3)}</Text> : null}
            </View>
          </View>
          {offer || checkin ? buttons : null}
        </Card>
      </>
    );
  }
  return (
    <>
      <Section>{tr('История')}</Section>
      <Card style={s.card}>
        <View style={s.head}>
          <Orb mood={arc.chironMood} size={52} />
          <View style={s.headText}>
            <Text {...fit(2, 0.7)} style={s.title}>{arc.title}</Text>
            <Text style={s.text}>{arc.text}</Text>
          </View>
        </View>
        {arc.note ? <Text style={s.note}>{arc.note}</Text> : null}
        {quests.length ? (
          <View style={s.list}>
            {quests.map((q, i) => (
              <View key={q.id} style={s.q}>
                <View style={[s.mark, q.done && s.markOn]}>{q.done ? <IconCheck color={c.onAccent} size={12} sw={2.6} /> : null}</View>
                <Text {...fit(2, 0.8)} style={[s.qText, !q.done && !offer && { color: c.text }, offer && { color: c.sub }]}>{q.title}</Text>
                {active && !q.done && !q.auto && id === 'tired' ? <Btn s={s} label={tr('Отметить')} a11y={'arc-check-' + i} ghost onPress={act('check', { index: i })} /> : null}
              </View>
            ))}
          </View>
        ) : null}
        {healed && arc.reward ? <Text style={s.reward}>{'+' + arc.reward.xp + ' XP ' + tr('вне дневного лимита')}</Text> : null}
        {buttons}
      </Card>
    </>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headText: { flex: 1, gap: 2 },
  title: { color: c.text, fontSize: SIZES.text, fontWeight: '800' },
  text: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 19 },
  prog: { color: c.accent, fontSize: SIZES.small, fontWeight: '700' },
  note: { color: c.muted, fontSize: SIZES.small, lineHeight: 18 },
  list: { gap: 8 },
  q: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: c.accent, borderColor: c.accent },
  qText: { flex: 1, color: c.text, fontSize: SIZES.small + 1 },
  reward: { color: c.accent, fontSize: SIZES.small, fontWeight: '700' },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: c.primary },
  btnGhost: { backgroundColor: c.cardAlt },
  btnText: { color: c.onPrimary, fontSize: SIZES.small, fontWeight: '700' },
  btnTextGhost: { color: c.sub },
});
