// Экран цикла: кольцо фаз и описание текущей фазы, календарь на месяц (месячные,
// прогноз, фертильное окно, овуляция), быстрые отметки, статистика по циклам,
// предупреждения по нормам FIGO, что происходит в каждой фазе и источники.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, T, Button } from '../ui';
import { Glass } from '../glass';
import { CycleRing } from '../CycleRing';
import { KineticText } from '../motion';
import { cycleToday, calendarMarks } from '../cycle';
import { phaseName, phaseText, flagText, nextLine, range, SOURCES } from '../cycleText';
import { CYCLE_COLORS, SIZES, NEON } from '../theme';
import { tr, RU } from '../i18n';
import { dayKey } from '../metrics';

const WEEK_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEK_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const MONTH_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function Calendar({ marks }) {
  const now = new Date();
  const [shift, setShift] = useState(0);
  const first = new Date(now.getFullYear(), now.getMonth() + shift, 1, 12);
  const daysIn = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // понедельник — первый
  const today = dayKey(now);
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(dayKey(new Date(first.getFullYear(), first.getMonth(), d, 12)));
  while (cells.length % 7) cells.push(null);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.calHead}>
        <Pressable onPress={() => setShift(shift - 1)} hitSlop={12}><Text style={s.nav}>‹</Text></Pressable>
        <Text style={s.month}>{(RU ? MONTH_RU : MONTH_EN)[first.getMonth()]} {first.getFullYear()}</Text>
        <Pressable onPress={() => setShift(shift + 1)} hitSlop={12}><Text style={s.nav}>›</Text></Pressable>
      </View>
      <View style={s.week}>{(RU ? WEEK_RU : WEEK_EN).map((w) => <Text key={w} style={s.wd}>{w}</Text>)}</View>
      <View style={s.grid}>
        {cells.map((k, i) => {
          if (!k) return <View key={i} style={s.cell} />;
          const m = marks[k];
          const isToday = k === today;
          const st = [s.dot];
          let color = '#E6F5EE';
          if (m === 'period') { st.push({ backgroundColor: CYCLE_COLORS.menstrual }); color = '#FFFFFF'; }
          if (m === 'predicted') st.push({ borderWidth: 1.5, borderColor: CYCLE_COLORS.menstrual, borderStyle: 'dashed' });
          if (m === 'fertile') st.push({ backgroundColor: 'rgba(79,209,197,0.22)' });
          if (m === 'ovulation') { st.push({ backgroundColor: CYCLE_COLORS.fertile }); color = '#06141B'; }
          if (isToday) st.push(s.today);
          return (
            <View key={i} style={s.cell}>
              <View style={st}><Text style={[s.num, { color }]}>{Number(k.slice(8))}</Text></View>
            </View>
          );
        })}
      </View>
      <View style={s.legend}>
        <Legend color={CYCLE_COLORS.menstrual} label={tr('месячные')} />
        <Legend color={CYCLE_COLORS.menstrual} label={tr('прогноз')} outline />
        <Legend color="rgba(79,209,197,0.5)" label={tr('фертильные дни')} />
        <Legend color={CYCLE_COLORS.fertile} label={tr('овуляция')} />
      </View>
    </View>
  );
}

function Legend({ color, label, outline }) {
  return (
    <View style={s.legItem}>
      <View style={[s.legDot, outline ? { borderWidth: 1.5, borderColor: color, borderStyle: 'dashed' } : { backgroundColor: color }]} />
      <Text style={s.legText}>{label}</Text>
    </View>
  );
}

const Row = ({ label, value }) => (
  <View style={s.row}><Text style={s.rowLabel}>{label}</Text><Text style={s.rowValue}>{value}</Text></View>
);

export function CycleScreen({ base, onBack, onStartToday, onLogOther }) {
  const today = cycleToday(base);
  const marks = useMemo(() => calendarMarks(base), [base]);
  const hormonal = base && base.mode === 'contraception';
  const dd = (n) => (n == null ? '—' : n + ' ' + tr('дн.'));
  const periodNow = today && today.phase === 'menstrual' && today.day <= 1;
  return (
    <Screen title={tr('Цикл')} onBack={onBack}>
      <Glass glow>
        <View style={s.hero}>
          <CycleRing today={today} size={168} stroke={13} hormonal={hormonal} />
          <View style={{ flex: 1, gap: 6 }}>
            {today ? <KineticText style={[s.phase, { color: CYCLE_COLORS[today.phase] }]} by="word">{phaseName(today.phase)}</KineticText> : null}
            <Text style={s.next}>{nextLine(today)}</Text>
            {today && today.fertileFrom && !today.late ? <Text style={s.sub}>{tr('Фертильное окно: ') + range(today.fertileFrom, today.fertileTo)}</Text> : null}
            {today && today.ovKey && !today.late ? <Text style={s.sub}>{tr('Овуляция ≈ ') + range(today.ovKey, today.ovKey)}</Text> : null}
          </View>
        </View>
        {today ? <Text style={s.p}>{phaseText(today.phase, today)}</Text> : null}
      </Glass>

      {!periodNow ? <Button title={tr('Месячные начались сегодня')} onPress={onStartToday} /> : null}
      <Button title={tr('Отметить другую дату')} onPress={onLogOther} secondary />

      <Glass>
        <Calendar marks={marks} />
      </Glass>

      <Glass>
        <Text style={s.h}>{tr('Мои циклы')}</Text>
        <Row label={tr('Средняя длина цикла')} value={dd(base && base.avgLen)} />
        <Row label={tr('Разброс между циклами')} value={dd(base && base.spread)} />
        <Row label={tr('Длительность месячных')} value={dd(base && base.periodLen)} />
        <Row label={tr('Циклов в расчёте')} value={String((base && base.n) || 0)} />
        {base && base.lens.length ? <Text style={s.sub}>{tr('Последние циклы: ') + base.lens.join(', ') + ' ' + tr('дн.')}</Text> : null}
        <Text style={s.hint}>{tr('Норма (FIGO): цикл 24–38 дней, разница между циклами до 7–9 дней, месячные до 8 дней. Только у 13% циклов ровно 28 дней.')}</Text>
      </Glass>

      {base && base.flags.length ? (
        <Glass style={{ borderColor: 'rgba(217,178,106,0.5)' }}>
          <Text style={[s.h, { color: '#D9B26A' }]}>{tr('На что обратить внимание')}</Text>
          {base.flags.map((f) => <Text key={f} style={s.p}>• {flagText(f, base)}</Text>)}
        </Glass>
      ) : null}

      <Glass>
        <Text style={s.h}>{tr('Фазы цикла')}</Text>
        {(hormonal ? ['menstrual', 'hormonal'] : ['menstrual', 'follicular', 'fertile', 'luteal']).map((ph) => (
          <View key={ph} style={{ gap: 2 }}>
            <Text style={[s.phSmall, { color: CYCLE_COLORS[ph] }]}>{phaseName(ph)}</Text>
            <Text style={s.p}>{phaseText(ph, today)}</Text>
          </View>
        ))}
        <Text style={s.p}>{tr('Влияние фазы на результаты в спорте в среднем очень небольшое — ориентируйся на своё самочувствие.')}</Text>
      </Glass>

      <T sub small>{tr('Прогноз — оценка по прошлым циклам, а не метод контрацепции и не диагноз. При сильной боли, очень обильных или долгих месячных, кровотечении между циклами — обратись к гинекологу.')}</T>
      <T sub small>{tr('Источники: ') + SOURCES.join('; ')}</T>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: SIZES.pad },
  phase: { fontSize: SIZES.title - 2, fontWeight: '700' },
  next: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '600' },
  sub: { color: '#BFD9CC', fontSize: SIZES.small },
  hint: { color: '#7E9A8E', fontSize: SIZES.small, lineHeight: 18 },
  p: { color: '#CFE9DC', fontSize: SIZES.small + 1, lineHeight: 21 },
  h: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '700' },
  phSmall: { fontSize: SIZES.small + 1, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  rowLabel: { color: '#BFD9CC', fontSize: SIZES.text - 1 },
  rowValue: { color: '#FFFFFF', fontSize: SIZES.text - 1, fontWeight: '600' },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { color: NEON.emerald, fontSize: 26, paddingHorizontal: 8 },
  month: { color: '#FFFFFF', fontSize: SIZES.text, fontWeight: '700' },
  week: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', color: '#7E9A8E', fontSize: SIZES.tiny + 1, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: '82%', aspectRatio: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: '#FFFFFF' },
  num: { fontSize: SIZES.small + 1, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legDot: { width: 12, height: 12, borderRadius: 6 },
  legText: { color: '#BFD9CC', fontSize: SIZES.tiny + 1 },
});
