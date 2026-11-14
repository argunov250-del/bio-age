// Вкладка «Журнал» (стекло): отметки дня (кофе, алкоголь, поздний ужин, экраны, стресс, дыхание, сауна, холод, добавки, заметка)
// с переключателем даты, быстрые действия (вода, витамины, дыхание, пауза), «Влияние на восстановление» (связь, не причина),
// сетка активности (R1), раздел «Рост» с заданиями дня, достижения и ручные записи.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Screen, Note, ProgressBar } from '../ui';
import { GlassCard, GlassPill, GlassTile } from '../glassKit';
import { GHead, GSection, Rise } from '../GlassBits';
import { BreathSheet, PauseSheet } from '../CalmSheets';
import { IconDrop, IconPill, IconWind, IconHourglass } from '../homeIcons';
import { CountUp } from '../motion';
import { loadJournal, subscribe, toggleBehavior, setCount, addJournalNote, normDay, dayKey, journalImpact } from '../journal';
import { addWater, setVitamins, dayKey as actKey } from '../activities';
import { mindfulnessGrid } from '../perf/wellness';
import { light } from '../haptics';
import { useColors } from '../colors';
import { SIZES, ACCENTS } from '../theme';
import { tr, RU } from '../i18n';
import { fit } from '../fit';
import { fmt, signed } from '../format';
import { shortDate } from '../time';


const DAY = 86400000;
const EMPTY = {};
const BACK_DAYS = 6; // сколько дней назад можно отметить
export const BEHAVIOR_LIST = [
  ['caffeineLate', '☕', 'Кофе после 14:00'], ['alcohol', '🍷', 'Алкоголь'], ['lateMeal', '🍽', 'Поздний ужин'],
  ['screensBeforeBed', '📱', 'Экраны перед сном'], ['stressHigh', '😣', 'Сильный стресс'], ['meditation', '🧘', 'Медитация или дыхание'],
  ['sauna', '🧖', 'Сауна'], ['coldShower', '🚿', 'Холодный душ'], ['supplements', '💊', 'Добавки'],
];
const NAME = () => ({
  caffeineLate: tr('Кофе после 14:00'), alcohol: tr('Алкоголь'), lateMeal: tr('Поздний ужин'), screensBeforeBed: tr('Экраны перед сном'),
  stressHigh: tr('Сильный стресс'), meditation: tr('Медитация или дыхание'), sauna: tr('Сауна'), coldShower: tr('Холодный душ'),
  supplements: tr('Добавки'), water: tr('Вода от 80% цели'),
});
const CONF = () => ({ high: tr('уверенность высокая'), medium: tr('уверенность средняя'), low: tr('уверенность низкая') });
const WEEKDAYS = () => [tr('Пн'), tr('Вт'), tr('Ср'), tr('Чт'), tr('Пт'), tr('Сб'), tr('Вс')];
const dotStyle = (c, d) => (d.future ? { ...{ backgroundColor: 'transparent', borderStyle: 'dashed', opacity: 0.5 }, borderColor: c.glass.stroke }
  : d.state === 'full' ? { backgroundColor: c.accent, borderColor: 'transparent' }
  : d.state === 'partial' ? { backgroundColor: c.accent + '55', borderColor: c.accent }
  : { backgroundColor: c.text + '14', borderColor: 'transparent' });
const yesOf = (d, id) => (id === 'meditation' ? d.meditation === true || d.meditation > 0 : id === 'alcohol' ? d.alcohol > 0 : !!d[id]);
const noonMs = (back) => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime() - back * DAY; };

// Журнал из хранилища с подпиской: любое изменение (в том числе с другой вкладки) обновляет экран.
function useJournal() {
  const [map, setMap] = useState({});
  useEffect(() => {
    let alive = true;
    Promise.resolve(loadJournal()).then((m) => { if (alive) setMap(m || {}); }).catch(() => {});
    const un = subscribe((m) => { if (alive) setMap({ ...(m || {}) }); });
    return () => { alive = false; un(); };
  }, []);
  return map;
}

function Toggle({ icon, label, on, onPress, testID }) {
  return <GlassPill label={icon + '  ' + label} active={on} onPress={onPress} height={40} accessibilityLabel={label + (on ? ': ' + tr('да') : '')} testID={testID} />;
}

export function JournalScreen({ perf, profile, growth, plan, activities, water, achievements, onOpen, onRefresh }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const map = useJournal();
  const [back, setBack] = useState(0);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState(null);
  const ms = noonMs(back);
  const key = dayKey(ms);
  const day = normDay(map[key]);
  const acts = activities || EMPTY;
  const today = acts[actKey()] || {};

  const flip = useCallback((id) => { light(); toggleBehavior(id, ms); }, [ms]);
  const addNote = () => { if (note.trim()) { addJournalNote(note, ms); setNote(''); } };
  const dayLabel = back === 0 ? tr('Сегодня') : back === 1 ? tr('Вчера') : shortDate(ms);

  const recSeries = perf && perf.trends ? perf.trends.recovery : null;
  const impact = useMemo(() => (recSeries ? journalImpact(map, recSeries, { activities: acts }) : { insights: [], needMore: [] }), [map, recSeries, acts]);
  const hasJournal = Object.keys(map).length > 0;
  const grid = (perf && perf.activityGrid) || mindfulnessGrid(acts, { now: Date.now(), weeks: 6 });
  const wd = WEEKDAYS();

  const g = growth || null;
  const hide = (plan && plan.hide) || [];
  const quests = g && g.today ? g.today.sources.filter((x) => !x.optional && !hide.includes(x.id)).slice(0, 6) : [];
  const done = (achievements || []).filter((a) => a.done).length;
  const waterLine = water ? fmt(water.ml / 1000, 1) : fmt((today.waterMl || 0) / 1000, 1);
  const addWaterNow = () => { light(); if (water && water.add) water.add(250); else addWater(250, profile); };

  return (
    <Screen title={tr('Журнал')} tab onRefresh={onRefresh}>
      <Rise i={0}>
        <GlassCard testID="journal-checkin">
          <View style={s.dateRow}>
            <GlassPill label="‹" height={36} onPress={back < BACK_DAYS ? () => setBack(back + 1) : undefined} accessibilityLabel={tr('Предыдущий день')} testID="journal-prev" style={back >= BACK_DAYS ? s.dim : undefined} />
            <View style={s.dateMid}>
              <Text style={[s.date, { color: c.text }]} {...fit(1, 0.7)} testID="journal-date">{dayLabel}</Text>
              <Text style={[s.sub, { textAlign: 'center' }]} {...fit(1, 0.8)}>{tr('Отметки дня')}</Text>
            </View>
            <GlassPill label="›" height={36} onPress={back > 0 ? () => setBack(back - 1) : undefined} accessibilityLabel={tr('Следующий день')} testID="journal-next" style={back <= 0 ? s.dim : undefined} />
          </View>
          <View style={s.wrap}>
            {BEHAVIOR_LIST.map(([id, icon, ru]) => <Toggle key={id} icon={icon} label={tr(ru)} on={yesOf(day, id)} onPress={() => flip(id)} testID={'jr-' + id} />)}
          </View>
          {day.alcohol > 0 ? (
            <View style={s.counter} testID="jr-alcohol-count">
              <Text style={[s.sub, { flex: 1 }]} {...fit(1, 0.75)}>{tr('Порций алкоголя')}</Text>
              <GlassPill label="−" height={34} onPress={() => setCount('alcohol', day.alcohol - 1, ms)} testID="jr-alcohol-minus" />
              <Text style={[s.date, { color: c.text, minWidth: 28, textAlign: 'center' }]}>{String(day.alcohol)}</Text>
              <GlassPill label="+" height={34} onPress={() => setCount('alcohol', day.alcohol + 1, ms)} testID="jr-alcohol-plus" />
            </View>
          ) : null}
          <View style={s.noteRow}>
            <TextInput value={note} onChangeText={setNote} placeholder={tr('Заметка о дне')} placeholderTextColor={c.muted} style={[s.input, { color: c.text, borderColor: c.glass.stroke }]}
              accessibilityLabel={tr('Заметка о дне')} returnKeyType="done" onSubmitEditing={addNote} maxLength={280} testID="journal-note-input" />
            <GlassPill label={tr('Добавить')} height={40} onPress={note.trim() ? addNote : undefined} testID="journal-note-add" />
          </View>
          {day.notes.map((t, i) => <Text key={i} style={[s.noteText, { color: c.text }]} {...fit(4, 0.85)}>{'• ' + t}</Text>)}
        </GlassCard>
      </Rise>

      <Rise i={1}>
        <View style={s.tiles} testID="journal-quick">
          <GlassTile icon={IconDrop} label={tr('Вода +250 мл')} value={waterLine} unit={tr('л')} color={ACCENTS.strain} onPress={addWaterNow} testID="quick-water" />
          <GlassTile icon={IconPill} label={tr('Витамины')} value={today.vitamins ? '✓' : '—'} color={ACCENTS.energy} onPress={() => { light(); setVitamins(!today.vitamins); }} testID="quick-vitamins" />
        </View>
        <View style={[s.tiles, { marginTop: SIZES.gap }]}>
          <GlassTile icon={IconWind} label={tr('Дыхание 4–6')} value={fmt(today.breathMin || 0, 0)} unit={tr('мин')} color={ACCENTS.recovery} onPress={() => setSheet('breath')} testID="quick-breath" />
          <GlassTile icon={IconHourglass} label={tr('Цифровая пауза')} value={fmt(today.pauseMin || 0, 0)} unit={tr('мин')} color={ACCENTS.sleep} onPress={() => setSheet('pause')} testID="quick-pause" />
        </View>
      </Rise>

      <Rise i={2}>
        <GlassCard testID="journal-impact">
          <GHead title={tr('Влияние на восстановление')} />
          {impact.insights.length ? impact.insights.map((i, k) => {
            const col = i.sign === 'pos' ? c.good : i.sign === 'neg' ? c.warn : c.sub;
            return (
              <View key={i.id} style={[s.irow, k > 0 && { borderTopWidth: 1, borderTopColor: c.line }]} testID={'impact-' + i.id}>
                <Text style={[s.arrow, { color: col }]}>{i.sign === 'pos' ? '↑' : i.sign === 'neg' ? '↓' : '→'}</Text>
                <View style={s.ibody}>
                  <Text style={[s.iname, { color: c.text }]} {...fit(1, 0.75)}>{NAME()[i.id]}</Text>
                  <Text style={s.sub} {...fit(2, 0.8)}>{i.nYes + ' ' + tr('и') + ' ' + i.nNo + ' ' + tr('дней с отметкой и без')}</Text>
                </View>
                <View style={s.iright}>
                  <Text style={[s.idelta, { color: col }]} {...fit(1, 0.7)}>{signed(i.deltaPct, 1) + ' ' + tr('п.п.')}</Text>
                  <Text style={[s.chip, { color: c.sub, borderColor: c.glass.stroke }]} {...fit(1, 0.7)}>{CONF()[i.confidence]}</Text>
                </View>
              </View>
            );
          }) : <Text style={s.sub} {...fit(4, 0.85)}>{hasJournal ? tr('Пока мало записей, чтобы что-то заметить. Отмечай день несколько недель, и я покажу связь с восстановлением на следующее утро.') : tr('Отмечай привычки несколько недель, и я покажу, как они связаны с восстановлением на следующее утро.')}</Text>}
          {impact.needMore.length ? (
            <View style={s.more}>
              {impact.needMore.slice(0, 6).map((n) => (
                <Text key={n.id} style={s.sub} {...fit(1, 0.8)} testID={'need-' + n.id}>{NAME()[n.id] + ': ' + tr('Нужно ещё') + ' ' + Math.max(n.needYes, n.needNo) + ' ' + tr('дн. записей')}</Text>
              ))}
            </View>
          ) : null}
          <Text style={[s.sub, { marginTop: 8 }]} {...fit(3, 0.8)}>{tr('Это связь на небольшой выборке, а не причина.')}</Text>
        </GlassCard>
      </Rise>

      <Rise i={3}>
        <GlassCard testID="journal-grid">
          <GHead title={tr('Осознанность')} right={grid.full + ' ' + tr('дн. с целью')} />
          <View style={s.grid}>
            <View style={s.gcol}>{wd.map((w, r) => <Text key={r} style={[s.gday, { color: c.sub }]}>{w}</Text>)}</View>
            {grid.weeks.map((w, wi) => (
              <Rise key={wi} i={wi}>
                <View style={s.gcol}>
                  {w.days.map((d) => (
                    <View key={d.key} testID={'dot-' + d.state + (d.future ? '-future' : '')} style={[s.dot, dotStyle(c, d)]} />
                  ))}
                </View>
              </Rise>
            ))}
          </View>
          <View style={s.legend} testID="grid-legend">
            <View style={s.lg}><View style={[s.dotS, { backgroundColor: c.accent }]} /><Text style={s.sub} {...fit(1, 0.7)}>{tr('Цель достигнута')}</Text></View>
            <View style={s.lg}><View style={[s.dotS, { backgroundColor: c.accent + '55', borderColor: c.accent, borderWidth: 1 }]} /><Text style={s.sub} {...fit(1, 0.7)}>{tr('Частично')}</Text></View>
            <View style={s.lg}><View style={[s.dotS, { backgroundColor: c.text + '14' }]} /><Text style={s.sub} {...fit(1, 0.7)}>{tr('Нет')}</Text></View>
          </View>
          <Text style={s.sub} {...fit(2, 0.8)}>{tr('Дыхание и цифровая пауза, цель 10 минут в день.')}</Text>
        </GlassCard>
      </Rise>

      <GSection title={RU ? 'Рост' : 'Growth'} right={tr('Весь раздел') + ' ›'} onRight={onOpen ? () => onOpen('growth') : undefined} />
      <Rise i={4}>
        <GlassCard onPress={onOpen ? () => onOpen('growth') : undefined} testID="journal-growth">
          {g ? (
            <>
              <View style={s.lvlRow}>
                <CountUp id="journal-level" value={g.level} suffix=" lvl" style={[s.lvl, { color: c.onPrimary, backgroundColor: c.primary }]} />
                {g.rank ? <Text style={[s.iname, { color: c.text, flex: 1 }]} {...fit(1, 0.7)}>{'· ' + g.rank.name}</Text> : null}
              </View>
              <View style={{ marginVertical: 8 }}><ProgressBar value={g.progress} /></View>
              <Text style={s.sub} {...fit(2, 0.8)}>{g.maxed ? tr('Максимальный уровень') : g.xpInLevel + ' / ' + (g.xpInLevel + g.xpToNext) + ' XP · ' + tr('до следующего уровня')}</Text>
              {quests.length ? (
                <View style={s.quests}>
                  <Text style={[s.qhead, { color: c.text }]} {...fit(1, 0.7)}>{tr('Задания на сегодня')}</Text>
                  {quests.map((q) => (
                    <View key={q.id} style={s.qrow} testID={'quest-' + q.id}>
                      <Text style={[s.qmark, { color: q.done ? c.accentText : c.muted }]}>{q.done ? '●' : '○'}</Text>
                      <Text style={[s.qtext, { color: c.text }]} {...fit(1, 0.75)}>{q.label}</Text>
                      <Text style={s.sub} {...fit(1, 0.7)}>{(q.got || 0) + '/' + (q.max || q.xp) + ' XP'}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : <Text style={s.sub} {...fit(2, 0.85)}>{tr('Считаю прогресс…')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={5}>
        <View style={s.links}>
          <GlassPill label={tr('Достижения') + (achievements && achievements.length ? ' ' + done + '/' + achievements.length : '') + ' ›'} onPress={onOpen ? () => onOpen('achievements') : undefined} testID="journal-achievements" />
          <GlassPill label={tr('Ручные записи') + ' ›'} onPress={onOpen ? () => onOpen('log') : undefined} testID="journal-log" />
        </View>
      </Rise>
      <Note center>{tr('Журнал хранится только на этом телефоне. Связи в нём не медицинские выводы.')}</Note>
      {sheet === 'breath' ? <BreathSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'pause' ? <PauseSheet onClose={() => setSheet(null)} /> : null}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  sub: { color: c.sub, fontSize: SIZES.small },
  dim: { opacity: 0.4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  dateMid: { flex: 1, minWidth: 0 },
  date: { fontSize: SIZES.title, fontWeight: '800', textAlign: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  input: { flex: 1, minWidth: 0, height: 40, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, fontSize: SIZES.body },
  noteText: { fontSize: SIZES.body, marginTop: 8 },
  tiles: { flexDirection: 'row', gap: SIZES.gap },
  irow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  arrow: { fontSize: 22, fontWeight: '800', width: 22, textAlign: 'center' },
  ibody: { flex: 1, minWidth: 0, gap: 2 },
  iname: { fontSize: SIZES.text, fontWeight: '700' },
  iright: { alignItems: 'flex-end', maxWidth: '42%', gap: 3 },
  idelta: { fontSize: SIZES.text, fontWeight: '800' },
  chip: { fontSize: SIZES.tiny + 1, fontWeight: '700', borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  more: { gap: 4, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line },
  grid: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginVertical: 8 },
  gcol: { gap: 6, alignItems: 'center' },
  gday: { fontSize: SIZES.tiny + 1, height: 24, lineHeight: 24, fontWeight: '600' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  dotS: { width: 14, height: 14, borderRadius: 7 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lvlRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lvl: { fontSize: SIZES.text, fontWeight: '800', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 16, overflow: 'hidden' },
  quests: { marginTop: 12, gap: 8 },
  qhead: { fontSize: SIZES.body, fontWeight: '800' },
  qrow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qmark: { fontSize: 16, width: 18 },
  qtext: { flex: 1, fontSize: SIZES.body },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
