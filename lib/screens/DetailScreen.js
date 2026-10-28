// Подробный экран карточки: главное значение, цифры, график 7/30/90 дней,
// объяснения простыми словами, что влияет и как улучшить. Кнопка «Назад» обязательна.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, T, Disclaimer } from '../ui';
import { BarChart, LineChart } from '../charts';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { shortDate } from '../time';

const WINDOWS = [7, 30, 90];
const DAY = 86400000;

function ChartCard({ chart }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const wins = chart.fixed ? null : chart.windows || WINDOWS;
  const [w, setW] = useState(wins ? wins[Math.min(1, wins.length - 1)] : null);
  const color = chart.color ? c[chart.color] : c.accent;
  let body = null;
  if (chart.daily) {
    const data = chart.daily.slice(-w);
    const has = data.filter((x) => x.v > 0);
    if (chart.kind === 'bar') {
      body = has.length ? <BarChart data={data} color={color} target={chart.target} labels={[shortDate(data[0].key), shortDate(data[data.length - 1].key)]} /> : null;
    } else {
      body = has.length > 1 ? <LineChart points={has.map((x) => ({ x: Date.parse(x.key + 'T12:00:00'), y: x.v }))} color={color} labels={[shortDate(has[0].key), shortDate(has[has.length - 1].key)]} /> : null;
    }
  } else if (chart.points) {
    const from = chart.fixed ? 0 : Date.now() - w * DAY;
    const pts = chart.points.filter((p) => p.t >= from).map((p) => ({ x: p.t, y: chart.map ? chart.map(p.v) : p.v }));
    body = pts.length > 1 ? <LineChart points={pts} color={color} labels={[shortDate(pts[0].x), shortDate(pts[pts.length - 1].x)]} /> : null;
  }
  return (
    <Card>
      <CardHead title={chart.fixed || chart.label || tr('График')} />
      {wins ? (
        <View style={s.switch}>
          {wins.map((x) => (
            <Pressable key={x} onPress={() => setW(x)} style={[s.switchItem, x === w && { backgroundColor: c.accent }]}>
              <Text style={[s.switchText, { color: x === w ? c.onAccent : c.sub }]}>{x} {tr('дн.')}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {body || <T sub small>{tr('За этот период данных нет.')}</T>}
    </Card>
  );
}

export function DetailScreen({ detail, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  if (!detail) {
    return (
      <Screen title={tr('Нет данных')} onBack={onBack}>
        <T sub>{tr('Данных пока нет. Потяни вниз на главном экране, чтобы обновить.')}</T>
      </Screen>
    );
  }
  const d = detail;
  return (
    <Screen title={d.title} onBack={onBack}>
      <View style={s.hero}>
        {d.hero.label ? <Text style={s.heroLabel}>{d.hero.label}</Text> : null}
        <Text style={s.heroValue}>{d.hero.value}{d.hero.unit && d.hero.value !== '—' ? <Text style={s.heroUnit}> {d.hero.unit}</Text> : null}</Text>
        {d.hero.sub ? <Text style={s.heroSub}>{d.hero.sub}</Text> : null}
      </View>

      {d.few ? (
        <Card style={{ borderColor: c.warn }}>
          <T small style={{ color: c.warn }}>{tr('Данных пока мало — носи часы чаще, чтобы приложение точнее оценило твою норму.')}</T>
        </Card>
      ) : null}

      {d.stats && d.stats.length ? (
        <Card>
          {d.stats.map((x, i) => <Row key={i} label={x.label} value={x.value} color={x.good == null ? null : x.good ? c.good : c.warn} />)}
        </Card>
      ) : null}

      {d.chart ? <ChartCard chart={d.chart} /> : null}

      {d.sections.map((sec, i) => (
        <Card key={i}>
          <CardHead title={sec.title} />
          {sec.rows ? sec.rows.map((x, j) => <Row key={j} label={x.label} value={x.value} />) : null}
          {sec.list ? sec.list.map((t, j) => <Text key={j} style={s.li}>• {t}</Text>) : null}
          {sec.text ? <Text style={s.p}>{sec.text}</Text> : null}
        </Card>
      ))}

      {d.explain ? (
        <Card>
          <CardHead title={tr('Простыми словами')} />
          {d.explain.map((t, i) => <Text key={i} style={s.p}>{t}</Text>)}
        </Card>
      ) : null}

      {d.improve ? (
        <Card>
          <CardHead title={tr('Как улучшить')} />
          {d.improve.map((t, i) => <Text key={i} style={s.li}>• {t}</Text>)}
        </Card>
      ) : null}

      <Disclaimer />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: SIZES.pad },
  heroLabel: { color: c.sub, fontSize: SIZES.small + 1, marginBottom: 4 },
  heroValue: { color: c.text, fontSize: 56, fontWeight: '700' },
  heroUnit: { color: c.sub, fontSize: SIZES.title, fontWeight: '500' },
  heroSub: { color: c.sub, fontSize: SIZES.small + 1, marginTop: 4, textAlign: 'center' },
  li: { color: c.text, fontSize: SIZES.small + 1, lineHeight: 21 },
  p: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 21 },
  switch: { flexDirection: 'row', backgroundColor: c.raised, borderRadius: 12, padding: 3 },
  switchItem: { flex: 1, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: SIZES.small, fontWeight: '600' },
});
