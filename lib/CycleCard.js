// Карточка цикла на «Обзоре» (только для женщин): кольцо фаз с отметкой «сегодня»,
// фаза, когда следующие месячные и фертильное окно. Открывает экран цикла.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glass } from './glass';
import { CycleRing } from './CycleRing';
import { KineticText } from './motion';
import { cycleToday } from './cycle';
import { phaseName, nextLine, range } from './cycleText';
import { CYCLE_COLORS, SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

export function CycleCard({ base, onPress }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const today = cycleToday(base);
  const hormonal = base && base.mode === 'contraception';
  const color = today ? CYCLE_COLORS[today.phase] : c.sub;
  return (
    <Glass onPress={onPress}>
      <View style={s.head}>
        <Text {...fit(1, 0.7)} style={s.title}>{tr('Цикл')}</Text>
        <Text {...fit(1, 0.7)} style={s.more}>{tr('Календарь')} ›</Text>
      </View>
      <View style={s.row}>
        <CycleRing today={today} size={112} hormonal={hormonal} />
        <View style={s.info}>
          {today ? <KineticText style={[s.phase, { color }]} by="word">{phaseName(today.phase)}</KineticText> : null}
          <Text style={s.line}>{nextLine(today)}</Text>
          {today && today.fertileFrom && ['follicular', 'fertile', 'ovulation'].includes(today.phase) ? (
            <Text style={s.sub}>{tr('Фертильное окно: ') + range(today.fertileFrom, today.fertileTo)}</Text>
          ) : null}
          {today && today.estimate ? <Text style={s.hint}>{tr('Прогноз по средним значениям — уточнится через 2–3 цикла.')}</Text> : null}
        </View>
      </View>
    </Glass>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.text, fontSize: SIZES.small, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  more: { color: c.sub, fontSize: SIZES.small },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.pad },
  info: { flex: 1, gap: 4 },
  phase: { fontSize: SIZES.text + 1, fontWeight: '700' },
  line: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '600' },
  sub: { color: c.sub, fontSize: SIZES.small },
  hint: { color: c.muted, fontSize: SIZES.tiny + 1 },
});
