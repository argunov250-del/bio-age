// «Задания на сегодня» (spec 1.2.2–1.2.4, 1.3, часть 3): строки источников опыта прямо на экране «Рост»,
// умные замены Хирона на месте обычных заданий, серия чипом, бонус достижений отдельной строкой (вне потолка),
// быстрые действия: вода +250 мл, чек-ин витаминов, «Дыхание 4–6», «Цифровая пауза».
import { fit } from './fit';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Section, IconChip, ProgressBar } from './ui';
import { PressScale, Appear } from './motion';
import { Orb } from './CoachCard';
import { BreathSheet, PauseSheet, PAUSE_MIN } from './CalmSheets';
import { setVitamins, dayKey } from './activities';
import { light } from './haptics';
import { IconSteps, IconMoon, IconDrop, IconPen, IconPill, IconWind, IconHourglass, IconDumbbell, IconCheck, IconHeart } from './homeIcons';
import { fmt } from './format';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr, RU } from './i18n';

const ICONS = { steps: IconSteps, sleep: IconMoon, water: IconDrop, log: IconPen, vitamins: IconPill, breath: IconWind, pause: IconHourglass, workout: IconDumbbell };
const CORE = ['steps', 'sleep', 'water', 'log']; // «всё готово» считается по ним
const BREATH_XP_MIN = 5;

const liters = (ml) => fmt((Number(ml) || 0) / 1000, 1);

function Item({ s, c, id, title, sub, xp, done, dim, right, first, tag }) {
  const Ic = ICONS[id] || IconHeart;
  return (
    <View style={[s.item, !first && { borderTopWidth: 1, borderTopColor: c.line }]} accessibilityLabel={id}>
      <IconChip icon={<Ic color={done ? c.accent : dim ? c.muted : c.text} size={18} sw={1.7} />} size={38} />
      <View style={s.itemText}>
        <Text style={[s.itemTitle, dim && { color: c.sub }]} numberOfLines={2}>{title}</Text>
        {tag ? <Text {...fit(1, 0.7)} style={s.tag}>{tag}</Text> : null}
        {sub ? <Text style={s.itemSub} numberOfLines={2}>{sub}</Text> : null}
      </View>
      {xp ? <Text {...fit(1, 0.7)} style={[s.xp, done && { color: c.accent }]}>{xp}</Text> : null}
      {right || (done ? <View style={s.done}><IconCheck color={c.onAccent} size={14} sw={2.4} /></View> : null)}
    </View>
  );
}

function Pill({ s, label, onPress, onLongPress, a11y, tone }) {
  return (
    <PressScale onPress={onPress} onLongPress={onLongPress} accessibilityLabel={a11y || label} style={[s.pill, tone === 'ghost' && s.pillGhost]}>
      <Text {...fit(1, 0.7)} style={[s.pillText, tone === 'ghost' && s.pillTextGhost]}>{label}</Text>
    </PressScale>
  );
}

// Реплика Хирона под заменой задания.
function ChironLine({ s, text }) {
  return (
    <View style={s.chiron}>
      <Orb size={22} />
      <Text style={s.chironText}>{text}</Text>
    </View>
  );
}

const qText = (q) => {
  const l = q && q.i18n ? q.i18n[RU ? 'ru' : 'en'] : null;
  return { title: l ? l.title : q.title, why: l ? l.why : q.why };
};

export function QuestList({ growth, plan, activities, water, noData }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [sheet, setSheet] = useState(null); // 'breath' | 'pause'
  const [note, setNote] = useState(false);
  const today = growth && growth.today;
  const maxed = !!(growth && growth.maxed);
  const day = (activities && activities[dayKey()]) || {};
  const quests = (plan && plan.quests) || [];
  const hide = (plan && plan.hide) || [];
  const rest = plan && plan.mode === 'rest';

  if (!growth) {
    return (
      <>
        <Section>{tr('Задания на сегодня')}</Section>
        <Card style={s.card}>
          {[0, 1, 2].map((i) => <View key={i} style={[s.skel, i > 0 && { marginTop: 10 }]} accessibilityLabel="skeleton" />)}
        </Card>
      </>
    );
  }
  if (rest) {
    const q = qText(quests[0] || {});
    return (
      <>
        <Section>{tr('Задания на сегодня')}</Section>
        <Card style={s.restCard}>
          <ChironLine s={s} text={q.why || tr('Сегодня без заданий. Отдыхай: опыт за день не обязателен.')} />
          <Text style={s.restTitle}>{tr('Сегодня без заданий. Отдыхай: опыт за день не обязателен.')}</Text>
          <Text style={s.restSub}>{tr('Серия не штрафуется.')}</Text>
        </Card>
      </>
    );
  }

  const sources = (today && today.sources) || [];
  const byId = {};
  sources.forEach((x) => { byId[x.id] = x; });
  const replacedBy = (id) => quests.find((q) => q.replaces === id);
  const visible = sources.filter((x) => !hide.includes(x.id) || replacedBy(x.id));
  const required = visible.filter((x) => !x.optional);
  const optional = visible.filter((x) => x.optional);
  const core = required.filter((x) => CORE.includes(x.id));
  const allDone = core.length > 0 && core.every((x) => x.done);
  const capped = !!(today && today.xp >= today.cap);
  const empty = !sources.some((x) => x.done) && !(water && water.ml > 0);
  const xpText = (x) => (maxed ? '' : (x.got || 0) + '/' + (x.max || x.xp) + ' XP');

  const row = (x, first) => {
    const q = replacedBy(x.id);
    if (q) {
      const t = qText(q);
      return (
        <View key={x.id + ':q'}>
          <Item s={s} c={c} id={x.id} first={first} title={t.title} done={!!x.done} tag={tr('Хирон подобрал под сегодняшний день')} />
          <ChironLine s={s} text={t.why} />
        </View>
      );
    }
    const dim = noData && (x.id === 'steps' || x.id === 'sleep') && !x.done;
    const tag = x.optional ? tr('бонус, по желанию') : null;
    if (x.id === 'water' && water) {
      const pct = water.goalMl ? Math.min(1, water.ml / water.goalMl) : 0;
      const undo = () => { if (water.ml > 0 && water.localMl > 0) { light(); water.undo(); } };
      return (
        <View key={x.id}>
          <Item s={s} c={c} id="water" first={first} done={!!x.done} xp={xpText(x)} title={tr('Вода')} tag={tag}
            sub={liters(water.ml) + ' ' + tr('из') + ' ' + liters(water.goalMl) + ' ' + tr('л')}
            right={(
              <View style={s.act}>
                <Pill s={s} label={'+250 ' + tr('мл')} a11y="water-add" onPress={() => { light(); water.add(250); }} onLongPress={undo} />
                {water.localMl > 0 ? <Pill s={s} tone="ghost" label={tr('Отменить')} a11y="water-undo" onPress={undo} /> : null}
              </View>
            )} />
          <View style={s.subBar}><ProgressBar value={pct} /></View>
        </View>
      );
    }
    if (x.id === 'vitamins') {
      const on = !!day.vitamins;
      return (
        <View key={x.id}>
          <Item s={s} c={c} id="vitamins" first={first} done={on} xp={xpText(x)} title={tr('Чек-ин витаминов')}
            sub={tr('Отметь, если принял(а) то, что обычно принимаешь. Лекарства обсуждай с врачом.')}
            right={<Pill s={s} tone={on ? 'ghost' : undefined} label={on ? tr('Отменить') : tr('Принял(а)')} a11y="vitamins-toggle" onPress={() => { light(); setVitamins(!on); }} />} />
        </View>
      );
    }
    if (x.id === 'breath') {
      return (
        <Item key={x.id} s={s} c={c} id="breath" first={first} done={!!x.done} xp={xpText(x)} title={tr('Дыхание 4–6')}
          sub={(Math.round((day.breathMin || 0) * 10) / 10) + ' ' + tr('из') + ' ' + BREATH_XP_MIN + ' ' + tr('мин')}
          right={<Pill s={s} label={tr('Начать')} a11y="breath-open" onPress={() => setSheet('breath')} />} />
      );
    }
    if (x.id === 'pause') {
      return (
        <Item key={x.id} s={s} c={c} id="pause" first={first} done={!!x.done} xp={xpText(x)} title={tr('Цифровая пауза')}
          sub={(Math.round((day.pauseMin || 0) * 10) / 10) + ' ' + tr('из') + ' ' + PAUSE_MIN + ' ' + tr('мин')}
          right={<Pill s={s} label={tr('Начать')} a11y="pause-open" onPress={() => setSheet('pause')} />} />
      );
    }
    return (
      <Item key={x.id} s={s} c={c} id={x.id} first={first} done={!!x.done} xp={xpText(x)} dim={dim} tag={tag}
        title={x.label} sub={dim ? tr('Нет данных') : null} />
    );
  };

  const streak = growth.streak;
  const status = allDone ? tr('Сегодня всё готово. Хорошая работа') : capped ? tr('Опыт на сегодня набран. Отдыхай') : empty && !noData ? tr('Пока ничего. Шаги и сон засчитаются сами, когда придут данные') : null;
  return (
    <>
      <Section right={maxed || !today ? undefined : today.xp + ' ' + tr('из') + ' ' + today.cap + ' XP'}>{allDone ? tr('Сегодня всё готово') : tr('Задания на сегодня')}</Section>
      {noData ? <ChironLine s={s} text={tr('Данных из Health Connect пока нет, но запись можно сделать вручную.')} /> : null}
      {status ? <Text style={s.status}>{status}</Text> : null}
      <Appear>
        <Card style={s.card}>
          {required.length ? required.map((x, i) => row(x, i === 0)) : <Text style={s.status}>{tr('Пока нет данных за сегодня.')}</Text>}
        </Card>
      </Appear>
      {optional.length ? (
        <>
          <Text {...fit(1, 0.7)} style={s.group}>{tr('По желанию')}</Text>
          <Card style={s.card}>{optional.map((x, i) => row(x, i === 0))}</Card>
        </>
      ) : null}
      {streak && !hide.includes('streak') ? (
        <View style={s.chips}>
          <View style={s.chip} accessibilityLabel="streak">
            <Text {...fit(2, 0.8)} style={s.chipText}>{(RU ? 'Серия: ' + streak.days + ' из ' + streak.target : 'Streak: ' + streak.days + ' of ' + streak.target)}</Text>
            {maxed ? null : <Text {...fit(2, 0.8)} style={s.chipSub}>{tr('дней шагов подряд') + ' (+' + streak.bonusXp + ')'}</Text>}
          </View>
        </View>
      ) : null}
      {today && today.bonus > 0 ? (
        <View style={s.bonus} accessibilityLabel="bonus">
          <Text {...fit(2, 0.8)} style={s.bonusTitle}>{tr('Бонус') + ': +' + today.bonus + ' XP'}</Text>
          <Text style={s.bonusSub}>{tr('за достижения, вне дневного лимита')}</Text>
        </View>
      ) : null}
      <PressScale onPress={() => setNote(!note)} style={s.noteBtn}>
        <Text {...fit(2, 0.8)} style={s.noteLink}>{note ? tr('Свернуть') : tr('Как считается опыт?')}</Text>
      </PressScale>
      {note ? <Text style={s.note}>{tr('Опыт в день ограничен, поэтому важна регулярность, а не рывок. Вода: ориентир, не медицинская норма.')}</Text> : null}
      {sheet === 'breath' ? <BreathSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'pause' ? <PauseSheet onClose={() => setSheet(null)} /> : null}
    </>
  );
}

const makeStyles = (c) => StyleSheet.create({
  card: { paddingVertical: 4, paddingHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  itemText: { flex: 1, gap: 1 },
  itemTitle: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '600' },
  itemSub: { color: c.sub, fontSize: SIZES.small },
  tag: { color: c.accent, fontSize: SIZES.tiny + 1, fontWeight: '700' },
  xp: { color: c.muted, fontSize: SIZES.small, fontWeight: '700' },
  done: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' },
  act: { alignItems: 'flex-end', gap: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: c.primary },
  pillGhost: { backgroundColor: c.cardAlt },
  pillText: { color: c.onPrimary, fontSize: SIZES.small, fontWeight: '700' },
  pillTextGhost: { color: c.sub },
  subBar: { paddingBottom: 10 },
  chiron: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.cardAlt, borderRadius: 16, padding: 10, marginBottom: 8 },
  chironText: { color: c.text, fontSize: SIZES.small + 1, lineHeight: 19, flex: 1 },
  status: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 19 },
  group: { color: c.sub, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18, backgroundColor: c.card, borderWidth: c.border, borderColor: c.line },
  chipText: { color: c.text, fontSize: SIZES.small, fontWeight: '700' },
  chipSub: { color: c.sub, fontSize: SIZES.tiny + 1 },
  bonus: { borderRadius: 16, padding: 12, backgroundColor: c.cardAlt, gap: 2 },
  bonusTitle: { color: c.accent, fontSize: SIZES.text - 1, fontWeight: '800' },
  bonusSub: { color: c.sub, fontSize: SIZES.small },
  noteBtn: { alignSelf: 'flex-start', paddingVertical: 2 },
  noteLink: { color: c.sub, fontSize: SIZES.small, textDecorationLine: 'underline' },
  note: { color: c.sub, fontSize: SIZES.small, lineHeight: 18 },
  skel: { height: 38, borderRadius: 12, backgroundColor: c.cardAlt },
  restCard: { gap: 8 },
  restTitle: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  restSub: { color: c.sub, fontSize: SIZES.small },
});
