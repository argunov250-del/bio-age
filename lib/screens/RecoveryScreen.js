// Восстановление: большое кольцо, что на него повлияло (показатель, норма, стрелка), 14 дней по зонам и пояснение.
// Независимая оценка по данным Health Connect, не медицинский показатель.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Note } from '../ui';
import { Dial } from '../PerfDials';
import { DayBars } from '../PerfCharts';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { fmt, signed } from '../format';
import { num, zoneColor, zoneWord, ZONE_TEXT, reasonText, DRIVER_NAME, DRIVER_UNIT, driverImpact, impactColor, ARROW } from '../perfView';

const ORDER = ['hrv', 'rhr', 'resp', 'sleepPerf', 'spo2', 'skinTemp'];

function DriverRow({ id, d, first }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const name = DRIVER_NAME()[id], unit = DRIVER_UNIT()[id];
  const isSleep = id === 'sleepPerf';
  const v = isSleep ? num(d) : num(d && d.v);
  const base = isSleep ? null : num(d && d.baseline);
  const dev = isSleep ? null : num(d && d.dev);
  const imp = isSleep ? (v == null ? null : v >= 85 ? 'good' : v < 70 ? 'bad' : 'neutral') : driverImpact(id, d);
  const col = impactColor(c, imp);
  const devText = dev == null ? '' : (id === 'rhr' || id === 'skinTemp' ? signed(dev, 1) + ' ' + unit : signed(dev, 0) + '%');
  return (
    <View style={[s.row, !first && s.rowLine]}>
      <View style={s.main}>
        <Text style={s.name} {...fit(1, 0.7)}>{name}</Text>
        <Text style={s.sub} {...fit(2, 0.8)}>
          {isSleep ? tr('Производительность сна') : base != null ? tr('обычно ') + fmt(base, id === 'hrv' || id === 'rhr' ? 0 : 1) + ' ' + unit : tr('Нужно ещё несколько ночей для базовой линии')}
        </Text>
      </View>
      <View style={s.right}>
        <Text style={s.val} {...fit(1, 0.6)}>{v == null ? '—' : fmt(v, isSleep || id === 'hrv' || id === 'rhr' ? 0 : 1) + (isSleep ? '%' : ' ' + unit)}</Text>
        {dev != null ? <Text style={[s.dev, { color: col }]} {...fit(1, 0.7)}>{ARROW(dev) + ' ' + devText}</Text> : null}
      </View>
    </View>
  );
}

export function RecoveryScreen({ perf, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const rec = perf && perf.recovery;
  const col = zoneColor(c, rec && rec.zone);
  const drivers = rec && rec.drivers ? ORDER.filter((k) => rec.drivers[k] != null && (k !== 'sleepPerf' || num(rec.drivers[k]) != null)) : [];
  const series = rec ? rec.series14 : null;
  return (
    <Screen title={tr('Восстановление')} onBack={onBack}>
      <Card style={s.hero}>
        <Dial id="rec-big" label="" value={rec ? rec.pct : null} suffix="%" color={col} size={190} big
          status={rec ? zoneWord(rec.zone) : tr('Нет данных')} statusColor={col} />
        <Text style={s.lead} {...fit(4, 0.85)}>{rec ? ZONE_TEXT[rec.zone]() : reasonText(perf)}</Text>
      </Card>

      {rec ? (
        <Card>
          <CardHead title={tr('Что повлияло')} />
          {drivers.length ? drivers.map((k, i) => <DriverRow key={k} id={k} d={rec.drivers[k]} first={i === 0} />) : <Text style={s.sub}>{tr('Пока недостаточно данных для оценки.')}</Text>}
        </Card>
      ) : null}

      <Card>
        <CardHead title={tr('14 дней')} />
        {series && series.some((x) => num(x.v) != null)
          ? <DayBars data={series} max={100} colorOf={(v) => zoneColor(c, v >= 67 ? 'green' : v >= 34 ? 'yellow' : 'red')} />
          : <Text style={s.sub}>{tr('График появится, когда накопятся данные хотя бы за несколько ночей.')}</Text>}
      </Card>

      <Card>
        <CardHead title={tr('Как считается')} />
        <Text style={s.body} {...fit(10, 0.85)}>{tr('Ночные HRV, пульс покоя и дыхание сравниваются с твоей нормой за последние 30 дней, к ним добавляется качество сна. Чем лучше показатели нормы, тем выше процент. Зоны: красная 0–33, жёлтая 34–66, зелёная 67–100.')}</Text>
      </Card>
      <Note center>{tr('О расчётах: это независимые оценки по данным Health Connect, а не медицинский прибор.')}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', gap: 12, paddingVertical: 18 },
  lead: { color: c.sub, fontSize: SIZES.body, textAlign: 'center' },
  body: { color: c.sub, fontSize: SIZES.body },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: c.line },
  main: { flex: 1, minWidth: 0, gap: 2 },
  right: { alignItems: 'flex-end', maxWidth: '45%' },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  sub: { color: c.sub, fontSize: SIZES.small },
  val: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  dev: { fontSize: SIZES.small, fontWeight: '600' },
});
