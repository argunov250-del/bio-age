// Карточки «Монитор здоровья» (вкладка «Метрики») и «Итоги недели по форме» (главная).
// Личный диапазон — среднее ± 1,5 SD за 30 дней; вне диапазона — повод присмотреться, а не диагноз.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardHead, Note } from './ui';
import { StackBar } from './PerfCharts';
import { useColors } from './colors';
import { SIZES } from './theme';
import { tr } from './i18n';
import { fit } from './fit';
import { fmt } from './format';
import { num, zoneColor, strainColor, sleepColor, MONITOR_NAME, MONITOR_UNIT, MONITOR_DIGITS } from './perfView';

const STATUS = (c) => ({
  in: [tr('в норме'), c.good],
  out: [tr('вне нормы'), c.warn],
  nodata: [tr('нет данных'), c.sub],
});

function MonitorRow({ m, first }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const d = MONITOR_DIGITS[m.id] || 0;
  const unit = MONITOR_UNIT()[m.id];
  const [word, col] = STATUS(c)[m.status] || STATUS(c).nodata;
  const range = num(m.typicalLow) != null && num(m.typicalHigh) != null ? tr('обычно ') + fmt(m.typicalLow, d) + '–' + fmt(m.typicalHigh, d) + ' ' + unit : null;
  return (
    <View style={[s.row, !first && s.line]}>
      <View style={s.main}>
        <Text style={s.name} {...fit(1, 0.7)}>{MONITOR_NAME()[m.id]}</Text>
        <Text style={s.sub} {...fit(2, 0.8)}>{range || (num(m.v) != null ? tr('Нужно ещё несколько ночей для личного диапазона') : tr('нет данных'))}</Text>
      </View>
      <View style={s.right}>
        <Text style={s.val} {...fit(1, 0.6)}>{num(m.v) != null ? fmt(m.v, d) + ' ' + unit : '—'}</Text>
        <Text style={[s.chip, { color: col, borderColor: col }]} {...fit(1, 0.7)}>{word}</Text>
      </View>
    </View>
  );
}

const STRESS_WORD = { low: () => tr('низкий'), medium: () => tr('средний'), high: () => tr('высокий') };

export function HealthMonitorCard({ perf }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const list = perf && Array.isArray(perf.healthMonitor) ? perf.healthMonitor : [];
  const st = perf && perf.stress && num(perf.stress.score) != null ? perf.stress : null;
  const any = list.some((m) => m.status !== 'nodata' || num(m.v) != null);
  return (
    <Card>
      <CardHead title={tr('Монитор здоровья')} />
      {any ? list.map((m, i) => <MonitorRow key={m.id} m={m} first={i === 0} />) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Ночные показатели появятся, когда часы запишут сон, пульс и дыхание.')}</Text>}
      {st ? (
        <View style={[s.stress, s.line]}>
          <View style={s.row}>
            <Text style={[s.name, { flex: 1 }]} {...fit(1, 0.7)}>{tr('Стресс')}</Text>
            <Text style={s.val} {...fit(1, 0.6)}>{fmt(st.score, 1) + ' / 3 · ' + (STRESS_WORD[st.level] ? STRESS_WORD[st.level]() : '')}</Text>
          </View>
          <StackBar parts={[{ v: st.score, color: st.score < 1 ? c.good : st.score < 2 ? c.warn : c.bad }, { v: Math.max(0, 3 - st.score), color: c.cardAlt }]} height={8} />
        </View>
      ) : null}
      <Note>{tr('О расчётах: независимые оценки по данным Health Connect, не медицинский прибор.')}</Note>
    </Card>
  );
}

const TREND = { up: ['↗', 'лучше прошлой недели'], down: ['↘', 'хуже прошлой недели'], stable: ['→', 'как на прошлой неделе'] };

export function WeeklyCard({ perf }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const w = perf && perf.weekly;
  const has = w && (num(w.avgStrain) != null || num(w.avgRecovery) != null || num(w.avgSleepPerf) != null);
  const t = w && TREND[w.trend];
  const cell = (label, value, color) => (
    <View style={s.cell}>
      <Text style={[s.big, { color }]} {...fit(1, 0.6)}>{value}</Text>
      <Text style={s.sub} {...fit(2, 0.8)}>{label}</Text>
    </View>
  );
  return (
    <Card>
      <CardHead title={tr('Итоги недели по форме')} right={t ? t[0] + ' ' + tr(t[1]) : null} />
      {has ? (
        <View style={s.cells}>
          {cell(tr('Нагрузка'), num(w.avgStrain) != null ? fmt(w.avgStrain, 1) : '—', strainColor(c))}
          {cell(tr('Восстановление'), num(w.avgRecovery) != null ? fmt(w.avgRecovery, 0) + '%' : '—', zoneColor(c, num(w.avgRecovery) == null ? null : w.avgRecovery >= 67 ? 'green' : w.avgRecovery >= 34 ? 'yellow' : 'red'))}
          {cell(tr('Сон'), num(w.avgSleepPerf) != null ? fmt(w.avgSleepPerf, 0) + '%' : '—', sleepColor(c))}
        </View>
      ) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Средние за неделю появятся, когда накопятся данные хотя бы за несколько дней.')}</Text>}
      {w && w.bestDay && num(w.bestDay.recovery) != null ? <Text style={s.sub} {...fit(2, 0.85)}>{tr('Лучший день по восстановлению: ') + w.bestDay.key.slice(8, 10) + '.' + w.bestDay.key.slice(5, 7) + ' · ' + fmt(w.bestDay.recovery, 0) + '%'}</Text> : null}
    </Card>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  line: { borderTopWidth: 1, borderTopColor: c.line },
  main: { flex: 1, minWidth: 0, gap: 2 },
  right: { alignItems: 'flex-end', maxWidth: '45%', gap: 3 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  sub: { color: c.sub, fontSize: SIZES.small },
  val: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  chip: { fontSize: SIZES.tiny + 1, fontWeight: '700', borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1, overflow: 'hidden' },
  stress: { paddingTop: 10, gap: 6 },
  cells: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0, gap: 2 },
  big: { fontSize: 26, fontWeight: '700' },
});
