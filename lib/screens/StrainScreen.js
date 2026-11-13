// Нагрузка за день (0–21): кольцо с целевым диапазоном, сегодняшние тренировки (нагрузка и зоны пульса),
// 14 дней и пояснение. Независимая оценка по пульсу из Health Connect, не медицинский показатель.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Note } from '../ui';
import { Dial, TargetLine } from '../PerfDials';
import { DayBars, ZoneBars } from '../PerfCharts';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt } from '../format';
import { workoutName, workoutIcon } from '../workouts';
import { num, strainColor, levelWord } from '../perfView';

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

export function StrainScreen({ perf, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const st = perf && perf.strain;
  const col = strainColor(c);
  const day = st ? num(st.day) : null;
  const tgt = perf && perf.strainTarget && num(perf.strainTarget.low) != null ? { low: perf.strainTarget.low, high: perf.strainTarget.high } : null;
  const wk = st && Array.isArray(st.workouts) ? st.workouts : [];
  return (
    <Screen title={tr('Нагрузка')} onBack={onBack}>
      <Card style={s.hero}>
        <Dial id="strain-big" label="" value={day} max={21} digits={1} color={col} size={190} big target={tgt}
          status={day != null ? levelWord(st.level) : tr('Нет данных')} statusColor={col} />
        {day == null ? <Text style={s.lead} {...fit(3, 0.85)}>{tr('Нет данных пульса за сегодня: нагрузка появится, когда часы запишут пульс.')}</Text> : null}
        <TargetLine perf={perf} />
      </Card>

      <Card>
        <CardHead title={tr('Тренировки сегодня')} />
        {wk.length ? wk.map((w, i) => <WorkoutBlock key={w.id || i} w={w} first={i === 0} />) : <Text style={s.sub} {...fit(2, 0.8)}>{tr('Сегодня тренировок нет.')}</Text>}
      </Card>

      <Card>
        <CardHead title={tr('14 дней')} />
        {st && st.series14 && st.series14.some((x) => num(x.v) != null)
          ? <DayBars data={st.series14} max={21} colorOf={() => col} />
          : <Text style={s.sub}>{tr('График появится, когда накопятся данные пульса.')}</Text>}
      </Card>

      <Card>
        <CardHead title={tr('Как считается')} />
        <Text style={s.body} {...fit(10, 0.85)}>{tr('Минуты пульса по зонам умножаются на номер зоны и суммируются. Дальше шкала логарифмическая: каждая следующая единица нагрузки даётся труднее, поэтому предел 21 почти недостижим. Зоны тренировки приближённые: по данным видны активные минуты и общая нагрузка.')}</Text>
        <Text style={s.body} {...fit(6, 0.85)}>{tr('Уровни: до 10 лёгкая, 10–14 умеренная, 14–18 высокая, от 18 предельная.')}</Text>
      </Card>
      <Note center>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingVertical: 18 },
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
