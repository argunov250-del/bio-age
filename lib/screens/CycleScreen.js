// Экран цикла: кольцо фаз и описание текущей фазы, календарь на месяц (месячные,
// прогноз, фертильное окно, овуляция), быстрые отметки, статистика по циклам,
// предупреждения по нормам FIGO, что происходит в каждой фазе и источники.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Note, Button, Row, Body } from '../ui';
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
    <View style={s.cal}>
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
          let color = NEON.soft;
          if (m === 'period') { st.push({ backgroundColor: CYCLE_COLORS.menstrual }); color = NEON.text; }
          if (m === 'predicted') st.push({ borderWidth: 1.5, borderColor: CYCLE_COLORS.menstrual, borderStyle: 'dashed' });
          if (m === 'fertile') st.push({ backgroundColor: 'rgba(79,209,197,0.22)' });
          if (m === 'ovulation') { st.push({ backgroundColor: CYCLE_COLORS.fertile }); color = NEON.ink; }
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
          <View style={s.heroText}>
            {today ? <KineticText style={[s.phase, { color: CYCLE_COLORS[today.phase] }]} by="word">{phaseName(today.phase)}</KineticText> : null}
            <Text style={s.next}>{nextLine(today)}</Text>
            {today && today.fertileFrom && !today.late ? <Text style={s.sub}>{tr('Фертильное окно: ') + range(today.fertileFrom, today.fertileTo)}</Text> : null}
            {today && today.ovKey && !today.late ? <Text style={s.sub}>{tr('Овуляция ≈ ') + range(today.ovKey, today.ovKey)}</Text> : null}
          </View>
        </View>
        {today ? <Body sub>{phaseText(today.phase, today)}</Body> : null}
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
        <Note style={s.dim}>{tr('Норма (FIGO): цикл 24–38 дней, разница между циклами до 7–9 дней, месячные до 8 дней. Только у 13% циклов ровно 28 дней.')}</Note>
      </Glass>

      {base && base.flags.length ? (
        <Glass style={s.warnCard}>
          <Text style={[s.h, { color: NEON.warn }]}>{tr('На что обратить внимание')}</Text>
          {base.flags.map((f) => <Body key={f} sub>• {flagText(f, base)}</Body>)}
        </Glass>
      ) : null}

      <Glass>
        <Text style={s.h}>{tr('Фазы цикла')}</Text>
        {(hormonal ? ['menstrual', 'hormonal'] : ['menstrual', 'follicular', 'fertile', 'luteal']).map((ph) => (
          <View key={ph} style={s.phase2}>
            <Text style={[s.phSmall, { color: CYCLE_COLORS[ph] }]}>{phaseName(ph)}</Text>
            <Body sub>{phaseText(ph, today)}</Body>
          </View>
        ))}
        <Body sub>{tr('Влияние фазы на результаты в спорте в среднем очень небольшое — ориентируйся на своё самочувствие.')}</Body>
      </Glass>

      <Note>{tr('Прогноз — оценка по прошлым циклам, не диагноз и не контрацепция. Сильная боль, обильные или долгие месячные, кровотечение между циклами — повод обратиться к гинекологу.')}</Note>
      <Note>{tr('Источники: ') + SOURCES.join('; ')}</Note>
    </Screen>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: SIZES.pad },
  heroText: { flex: 1, gap: 6 },
  phase: { fontSize: SIZES.title - 2, fontWeight: '700' },
  next: { color: NEON.text, fontSize: SIZES.text, fontWeight: '600' },
  sub: { color: NEON.soft, fontSize: SIZES.small },
  dim: { color: NEON.dim },
  h: { color: NEON.text, fontSize: SIZES.text, fontWeight: '700' },
  warnCard: { borderColor: 'rgba(217,178,106,0.5)', borderTopColor: 'rgba(217,178,106,0.5)' },
  phase2: { gap: 2 },
  phSmall: { fontSize: SIZES.body, fontWeight: '700' },
  cal: { gap: 8 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { color: NEON.emerald, fontSize: SIZES.stat, paddingHorizontal: 8 },
  month: { color: NEON.text, fontSize: SIZES.text, fontWeight: '700' },
  week: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', color: NEON.dim, fontSize: SIZES.tiny + 1, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: '82%', aspectRatio: 1, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: NEON.text },
  num: { fontSize: SIZES.body, fontWeight: '600' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.gap },
  legItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legDot: { width: 12, height: 12, borderRadius: 6 },
  legText: { color: NEON.soft, fontSize: SIZES.tiny + 1 },
});
