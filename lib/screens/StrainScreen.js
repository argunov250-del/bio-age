// Вкладка «Нагрузка» (стекло): шкала с рисками 0–21 и целевой полосой (R3), тренировки сегодня с нагрузкой
// и зонами пульса, «+ Тренировка», нагрузка за неделю, пояснение, карточка Хирона. Открывается и поверх вкладок (onBack).
// Независимая оценка по пульсу из Health Connect, не медицинский показатель.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Note } from '../ui';
import { GlassCard, GlassPill } from '../glassKit';
import { GHead, Rise } from '../GlassBits';
import { ChironGlass } from '../ChironGlass';
import { TickGauge } from '../TickGauge';
import { TargetLine } from '../PerfDials';
import { DayBars, ZoneBars } from '../PerfCharts';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt } from '../format';
import { workoutName, workoutIcon } from '../workouts';
import { num, strainColor, levelWord, suggestionText } from '../perfView';

function WorkoutBlock({ w, first }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const meta = [
    num(w.durationMin) != null ? w.durationMin + ' ' + tr('мин') : null,
    num(w.hrAvg) != null ? tr('пульс ') + w.hrAvg : null,
    num(w.hrMax) != null ? tr('макс. ') + w.hrMax : null,
  ].filter(Boolean).join(' · ');
  return (
    <View style={[s.wk, !first && s.line]}>
      <View style={s.wkHead}>
        <Text style={s.icon}>{workoutIcon(w.type)}</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} {...fit(1, 0.7)}>{workoutName(w.type)}</Text>
          {meta ? <Text style={s.sub} {...fit(2, 0.8)}>{meta}</Text> : null}
        </View>
        <Text style={[s.strain, { color: strainColor(c) }]} {...fit(1, 0.6)}>{num(w.strain) != null ? fmt(w.strain, 1) : '—'}</Text>
      </View>
      {num(w.strain) != null ? <ZoneBars zones={w.zones} color={strainColor(c)} /> : <Text style={s.sub} {...fit(2, 0.8)}>{tr('Нет данных пульса за эту тренировку.')}</Text>}
    </View>
  );
}

export function StrainScreen({ perf, onBack, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const st = perf && perf.strain;
  const col = strainColor(c);
  const day = st ? num(st.day) : null;
  const tgt = perf && perf.strainTarget && num(perf.strainTarget.low) != null ? { low: perf.strainTarget.low, high: perf.strainTarget.high } : null;
  const wk = st && Array.isArray(st.workouts) ? st.workouts : [];
  const week = st && Array.isArray(st.series14) ? st.series14.slice(-7) : [];
  const weekAvg = perf && perf.weekly ? num(perf.weekly.avgStrain) : null;
  const tip = day == null ? tr('Когда часы запишут пульс, подскажу, сколько нагрузки взять сегодня.') : (tgt && suggestionText(perf)) || tr('Спроси, как распределить нагрузку на сегодня.');
  return (
    <Screen title={tr('Нагрузка')} onBack={onBack} tab={!onBack}>
      <Rise i={0}>
        <GlassCard contentStyle={s.hero} testID="strain-hero">
          <TickGauge id="strain-big" value={day} max={21} target={tgt} size={236} status={day != null ? levelWord(st.level) : tr('Нет данных')} statusColor={col} />
          {day == null ? <Text style={s.lead} {...fit(3, 0.85)}>{tr('Нет данных пульса за сегодня: нагрузка появится, когда часы запишут пульс.')}</Text> : null}
          <TargetLine perf={perf} />
        </GlassCard>
      </Rise>

      <Rise i={1}>
        <GlassCard testID="strain-today">
          <View style={s.headRow}>
            <View style={{ flex: 1 }}><GHead title={tr('Тренировки сегодня')} /></View>
            {onOpen ? <GlassPill label={'+ ' + tr('Тренировка')} height={34} onPress={() => onOpen('log:workout')} testID="strain-add-workout" /> : null}
          </View>
          {wk.length ? wk.map((w, i) => <WorkoutBlock key={w.id || i} w={w} first={i === 0} />) : <Text style={s.sub} {...fit(2, 0.8)}>{tr('Сегодня тренировок нет.')}</Text>}
          {onOpen ? (
            <Pressable onPress={() => onOpen('workouts')} hitSlop={8} accessibilityRole="button" style={s.link}>
              <Text style={[s.linkText, { color: c.accent }]} {...fit(1, 0.75)}>{tr('Все тренировки')} ›</Text>
            </Pressable>
          ) : null}
        </GlassCard>
      </Rise>

      <Rise i={2}>
        <GlassCard testID="strain-week">
          <GHead title={tr('Нагрузка за неделю')} right={weekAvg != null ? tr('в среднем ') + fmt(weekAvg, 1) : null} />
          {week.some((x) => num(x.v) != null)
            ? <DayBars data={week} max={21} colorOf={() => col} gap={8} />
            : <Text style={s.sub} {...fit(2, 0.85)}>{tr('График появится, когда накопятся данные пульса.')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={3}>
        <GlassCard>
          <GHead title={tr('Как считается')} />
          <Text style={s.body} {...fit(10, 0.85)}>{tr('Минуты пульса по зонам умножаются на номер зоны и суммируются. Дальше шкала логарифмическая: каждая следующая единица нагрузки даётся труднее, поэтому предел 21 почти недостижим. Зоны тренировки приближённые: по данным видны активные минуты и общая нагрузка.')}</Text>
          <Text style={[s.body, { marginTop: 8 }]} {...fit(6, 0.85)}>{tr('Уровни: до 10 лёгкая, 10–14 умеренная, 14–18 высокая, от 18 предельная.')}</Text>
        </GlassCard>
      </Rise>

      <Rise i={4}><ChironGlass tip={tip} topic="training" onOpen={onOpen} testID="strain-chiron" /></Rise>
      <Note center>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingVertical: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  link: { alignSelf: 'flex-start', paddingTop: 10 },
  linkText: { fontSize: SIZES.body, fontWeight: '800' },
  lead: { color: c.sub, fontSize: SIZES.body, textAlign: 'center' },
  body: { color: c.sub, fontSize: SIZES.body },
  wk: { gap: 10, paddingVertical: 10 },
  line: { borderTopWidth: 1, borderTopColor: c.line },
  wkHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 22 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  sub: { color: c.sub, fontSize: SIZES.small },
  strain: { fontSize: 22, fontWeight: '700', minWidth: 44, textAlign: 'right' },
});
