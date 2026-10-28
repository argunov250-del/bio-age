// Графики активности: шаги, сон, пульс за сегодня, последние тренировки.
// ActivitySections встраивается во вкладку «Метрики».
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardHead, Big, T, Blink, Section } from '../ui';
import { BarChart, LineChart } from '../charts';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { ago, clock, hoursMin, shortDate } from '../time';
import { workoutName, workoutIcon } from '../workouts';

const STEP_GOAL = 10000;
const SLEEP_GOAL = 7;

const avg = (list) => {
  const v = list.filter((x) => x > 0);
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : 0;
};

function StageBar({ stages }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const total = stages.light + stages.deep + stages.rem + stages.awake;
  if (!total) return null;
  const parts = [
    ['deep', tr('глубокий'), '#3E6C9A'],
    ['light', tr('лёгкий'), c.sleep],
    ['rem', 'REM', '#B49BD6'],
    ['awake', tr('пробуждения'), c.line],
  ];
  return (
    <View style={{ gap: 6 }}>
      <View style={s.stageBar}>
        {parts.map(([k, , c]) => (stages[k] ? <View key={k} style={{ flex: stages[k], backgroundColor: c }} /> : null))}
      </View>
      <View style={s.legend}>
        {parts.map(([k, name, c]) => (stages[k] ? (
          <Text key={k} style={s.legendItem}><Text style={{ color: c }}>● </Text>{name} {hoursMin(stages[k] / 60)}</Text>
        ) : null))}
      </View>
    </View>
  );
}

export function ActivitySections({ result, loading }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sr = (result && result.series) || null;
  const steps = sr ? sr.steps : [];
  const sleep = sr ? sr.sleep : [];
  const hr = sr ? sr.hrToday : [];
  const rhr = sr ? sr.rhr.filter((x) => x.v > 0) : [];
  const workouts = sr ? sr.workouts : [];
  const night = sr && sr.lastNight;
  const today = steps.length ? steps[steps.length - 1].v : 0;
  const dayLabels = steps.length ? [shortDate(steps[0].key), shortDate(steps[14].key), tr('сегодня')] : null;

  return (
    <>

      <Card>
        <CardHead icon="👣" title={tr('Шаги')} right={tr('среднее ') + fmt(avg(steps.map((x) => x.v)))} />
        <Blink active={loading}>
          <Big value={fmt(today)} unit={tr('сегодня')} color={today >= STEP_GOAL ? c.good : null} />
        </Blink>
        {steps.length ? <BarChart data={steps} target={STEP_GOAL} labels={dayLabels} /> : <T sub small>{tr('нет данных')}</T>}
      </Card>

      <Card>
        <CardHead icon="☾" title={tr('Сон')} right={tr('среднее ') + hoursMin(avg(sleep.map((x) => x.v)))} />
        <Blink active={loading}>
          <Big value={night ? hoursMin(night.hours) : '—'} color={night ? c.sleep : null}
            sub={night ? tr('последняя ночь: ') + clock(night.start) + ' – ' + clock(night.end) : tr('нет данных')} />
        </Blink>
        {night && night.stages ? <StageBar stages={night.stages} /> : null}
        {sleep.some((x) => x.v > 0) ? <BarChart data={sleep} color={c.sleep} target={SLEEP_GOAL} labels={dayLabels} /> : null}
      </Card>

      <Card>
        <CardHead icon="♥" title={tr('Пульс сегодня')} right={rhr.length ? tr('в покое ') + fmt(rhr[rhr.length - 1].v) : null} />
        <Blink active={loading}>
          <Big value={sr && sr.lastHr ? fmt(sr.lastHr.bpm) : '—'} unit={tr('уд/мин')} color={sr && sr.lastHr ? c.heart : null}
            sub={sr && sr.lastHr ? ago(sr.lastHr.t) : tr('нет данных')} />
        </Blink>
        {hr.length > 1 ? (
          <LineChart points={hr.map((p) => ({ x: p.t, y: p.v }))} color={c.heart} labels={[clock(hr[0].t), clock(hr[hr.length - 1].t)]} />
        ) : null}
      </Card>

      <Section>{tr('Последние тренировки')}</Section>
      {workouts.length ? workouts.map((w, i) => (
        <Card key={i} style={s.workout}>
          <Text style={s.wIcon}>{workoutIcon(w.type)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.wName}>{workoutName(w.type, w.title)}</Text>
            <Text style={s.wSub}>{ago(w.start)}</Text>
          </View>
          <Text style={s.wDur}>{fmt((w.end - w.start) / 60000)} {tr('мин')}</Text>
        </Card>
      )) : (
        <Card><T sub small>{tr('Тренировок за последние 6 месяцев нет. Их записывают часы или приложения вроде Hevy и Strong через Health Connect.')}</T></Card>
      )}
    </>
  );
}

const makeStyles = (c) => StyleSheet.create({
  title: { color: c.text, fontSize: 30, fontWeight: '700', marginTop: SIZES.gap },
  stageBar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2 },
  legendItem: { color: c.sub, fontSize: SIZES.tiny + 1 },
  workout: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap, paddingVertical: 12 },
  wIcon: { fontSize: 24, width: 40, height: 40, textAlign: 'center', textAlignVertical: 'center', backgroundColor: c.raised, borderRadius: 20, overflow: 'hidden' },
  wName: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
  wSub: { color: c.sub, fontSize: SIZES.small },
  wDur: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
});
