// Вкладка «Тренды» (стекло): период 7/30/90, индекс самочувствия, восстановление, нагрузка и сон столбиками,
// итоги периода и недели, монитор здоровья, возраст тела по неделям. «Все показатели» — полный список (MetricsScreen).
// Нет данных — так и пишем; оценки независимые, не медицинские показатели.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Note } from '../ui';
import { GlassCard, GlassPill } from '../glassKit';
import { GHead, GSection, GlassSegmented, Rise } from '../GlassBits';
import { AreaChart } from '../AreaChart';
import { DayBars } from '../PerfCharts';
import { HealthMonitorCard, WeeklyCard } from '../PerfCards';
import { TrendCard } from '../TrendCard';
import { CountUp } from '../motion';
import { useColors } from '../colors';
import { SIZES, ACCENTS } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt, signed } from '../format';
import { WINDOWS } from '../windows';
import { num, zoneColor, strainColor, sleepColor } from '../perfView';

const avg = (list) => { const v = list.map((x) => num(x && x.v)).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const count = (list) => list.filter((x) => num(x && x.v) != null).length;
const zoneOf = (v) => (v >= 67 ? 'green' : v >= 34 ? 'yellow' : 'red');
const WELL_WORD = () => ({ excellent: tr('отлично'), good: tr('хорошо'), fair: tr('средне'), low: tr('низко') });

// Ряд за период и такой же предыдущий (для сравнения; на 90 дней сравнивать не с чем).
export function windowOf(series, n) {
  const a = Array.isArray(series) ? series : [];
  return { cur: a.slice(-n), prev: a.length >= n * 2 ? a.slice(-2 * n, -n) : [] };
}

function SeriesCard({ title, series, n, max, colorOf, unit, digits, testID }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const { cur } = windowOf(series, n);
  const a = avg(cur);
  const has = count(cur) >= 2;
  return (
    <GlassCard testID={testID}>
      <GHead title={title} right={a != null ? tr('в среднем ') + fmt(a, digits) + unit : null} />
      {has ? <DayBars data={cur} max={max} colorOf={colorOf} gap={n > 30 ? 1 : n > 14 ? 2 : 4} height={110} />
        : <Text style={s.sub} {...fit(3, 0.85)}>{tr('График появится, когда накопится хотя бы пара дней данных.')}</Text>}
    </GlassCard>
  );
}

export function TrendsScreen({ result, perf, loading, onRefresh, missingAccess, onAskAccess, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [n, setN] = useState(30);
  const tr90 = perf && perf.trends;
  const well = perf && perf.wellness;
  const wPts = useMemo(() => {
    const cur = windowOf(tr90 && tr90.wellness, n).cur;
    return cur.map((x, i) => ({ x: i, y: num(x.v) })).filter((p) => p.y != null);
  }, [tr90, n]);
  const rec = windowOf(tr90 && tr90.recovery, n), str = windowOf(tr90 && tr90.strain, n), slp = windowOf(tr90 && tr90.sleep, n);
  const rows = [
    { id: 'rec', label: tr('Восстановление'), a: avg(rec.cur), b: avg(rec.prev), unit: '%', d: 0, color: (v) => zoneColor(c, zoneOf(v)) },
    { id: 'str', label: tr('Нагрузка'), a: avg(str.cur), b: avg(str.prev), unit: '', d: 1, color: () => strainColor(c) },
    { id: 'slp', label: tr('Сон'), a: avg(slp.cur), b: avg(slp.prev), unit: '%', d: 0, color: () => sleepColor(c) },
  ];
  const anySummary = rows.some((r) => r.a != null);
  const open = (k) => (onOpen ? () => onOpen(k) : undefined);
  return (
    <Screen title={tr('Тренды')} tab onRefresh={loading ? undefined : onRefresh}>
      <Rise i={0}><GlassSegmented options={WINDOWS.map((x) => [x, x + ' ' + tr('дн.')])} value={n} onChange={setN} testID="trends-period" /></Rise>

      <Rise i={1}>
        <GlassCard testID="trends-wellness">
          <GHead title={tr('Индекс самочувствия')} right={well && well.label ? WELL_WORD()[well.label] : null} />
          <View style={s.bigRow}>
            {well && num(well.score) != null ? <CountUp id="trends-well" value={well.score} style={[s.big, { color: c.text }]} /> : <Text style={[s.big, { color: c.sub }]}>—</Text>}
            {well && num(well.deltaWeekPct) != null ? <Text style={[s.delta, { color: well.deltaWeekPct >= 0 ? c.good : c.warn }]} {...fit(1, 0.7)}>{signed(well.deltaWeekPct, 0) + '% ' + tr('к прошлой неделе')}</Text> : null}
          </View>
          {wPts.length >= 2 ? <AreaChart points={wPts} color={ACCENTS.energy} height={120} gid="trendsWell" />
            : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Индекс появится, когда накопятся данные восстановления и сна хотя бы за пару дней.')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={2}><SeriesCard testID="trends-recovery" title={tr('Восстановление')} series={tr90 && tr90.recovery} n={n} max={100} unit="%" digits={0} colorOf={(v) => zoneColor(c, zoneOf(v))} /></Rise>
      <Rise i={3}><SeriesCard testID="trends-strain" title={tr('Нагрузка')} series={tr90 && tr90.strain} n={n} max={21} unit="" digits={1} colorOf={() => strainColor(c)} /></Rise>
      <Rise i={4}><SeriesCard testID="trends-sleep" title={tr('Сон')} series={tr90 && tr90.sleep} n={n} max={100} unit="%" digits={0} colorOf={() => sleepColor(c)} /></Rise>

      <Rise i={5}>
        <GlassCard testID="trends-summary">
          <GHead title={n === 7 ? tr('Итоги недели') : n === 30 ? tr('Итоги месяца') : tr('Итоги за 90 дней')} />
          {anySummary ? (
            <View style={s.cells}>
              {rows.map((r) => (
                <View key={r.id} style={s.cell}>
                  <Text style={[s.cellBig, { color: r.a == null ? c.sub : r.color(r.a) }]} {...fit(1, 0.6)}>{r.a == null ? '—' : fmt(r.a, r.d) + r.unit}</Text>
                  <Text style={s.sub} {...fit(2, 0.8)}>{r.label}</Text>
                  {r.a != null && r.b != null ? <Text style={[s.sub, { color: c.sub }]} {...fit(2, 0.75)}>{signed(r.a - r.b, r.d) + ' ' + tr('к прошлому периоду')}</Text> : null}
                </View>
              ))}
            </View>
          ) : <Text style={s.sub} {...fit(3, 0.85)}>{tr('Средние появятся, когда накопятся данные хотя бы за несколько дней.')}</Text>}
        </GlassCard>
      </Rise>

      <Rise i={6}><HealthMonitorCard perf={perf} /></Rise>
      <Rise i={7}><WeeklyCard perf={perf} /></Rise>
      {result ? <Rise i={8}><TrendCard trend={result.trend} chrono={result.chrono} onPress={open('detail:lifestyleAge')} /></Rise> : null}

      {missingAccess ? (
        <GlassCard>
          <Text style={s.sub} {...fit(3, 0.85)}>{tr('Есть новые типы данных. Дай доступ, чтобы они появились здесь.')}</Text>
          {onAskAccess ? <View style={s.pillRow}><GlassPill label={tr('Дать доступ')} onPress={onAskAccess} /></View> : null}
        </GlassCard>
      ) : null}
      <GSection title={tr('Все данные')} />
      <View style={s.pillRow}>
        {onOpen ? <GlassPill label={tr('Все показатели') + ' ›'} onPress={() => onOpen('metrics')} testID="trends-all-metrics" /> : null}
        {onOpen ? <GlassPill label={'＋ ' + tr('Записать вручную')} onPress={() => onOpen('log')} /> : null}
      </View>
      <Note center>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  sub: { color: c.sub, fontSize: SIZES.small },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 6 },
  big: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  delta: { flex: 1, fontSize: SIZES.small, fontWeight: '700' },
  cells: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0, gap: 2 },
  cellBig: { fontSize: 24, fontWeight: '800' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
});
