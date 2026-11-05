// Подробный экран карточки: главное значение, цифры, график 7/30/90 дней,
// объяснения простыми словами, что влияет и как улучшить. Кнопка «Назад» обязательна.
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, Section, Body, Bullet, Note, Segmented, Disclaimer, ListItem } from '../ui';
import { KineticText } from '../motion';
import { BarChart, LineChart } from '../charts';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { shortDate } from '../time';

const WINDOWS = [7, 30, 90];

function Line({ label, value, color, first }) {
  const c = useColors();
  return (
    <ListItem first={first}>
      <Text style={{ color: c.sub, fontSize: SIZES.text, flex: 1 }}>{label}</Text>
      <Text style={{ color: color || c.text, fontSize: SIZES.text, fontWeight: '700' }}>{value}</Text>
    </ListItem>
  );
}
const DAY = 86400000;

function ChartCard({ chart }) {
  const c = useColors();
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
    <>
      <Section>{chart.fixed || chart.label || tr('График')}</Section>
      {wins ? (
        <Segmented options={wins.map((x) => [x, x + ' ' + tr('дн.')])} value={w} onChange={setW} />
      ) : null}
      <Card>
        {body || <Note>{tr('За этот период данных нет.')}</Note>}
      </Card>
    </>
  );
}

export function DetailScreen({ detail, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  if (!detail) {
    return (
      <Screen title={tr('Нет данных')} onBack={onBack}>
        <Body sub>{tr('Данных пока нет. Потяни вниз на главном экране.')}</Body>
      </Screen>
    );
  }
  const d = detail;
  return (
    <Screen title={d.title} onBack={onBack}>
      <Card style={s.hero}>
        {d.hero.label ? <Text style={s.heroLabel}>{d.hero.label}</Text> : null}
        <View style={s.heroRow}>
          <KineticText style={s.heroValue} by="char" delay={180}>{d.hero.value}</KineticText>
          {d.hero.unit && d.hero.value !== '—' ? <Text style={s.heroUnit}> {d.hero.unit}</Text> : null}
        </View>
        {d.hero.sub ? <Text style={s.heroSub}>{d.hero.sub}</Text> : null}
      </Card>

      {d.few ? (
        <Card style={{ borderWidth: 1, borderColor: c.warn }}>
          <Note style={{ color: c.warn }}>{tr('Данных пока мало. Добавь записи или подключи источник в Health Connect — оценка станет точнее.')}</Note>
        </Card>
      ) : null}

      {d.stats && d.stats.length ? (
        <Card>
          {d.stats.map((x, i) => <Line key={i} first={i === 0} label={x.label} value={x.value} color={x.good == null ? null : x.good ? c.good : c.warn} />)}
        </Card>
      ) : null}

      {d.chart ? <ChartCard chart={d.chart} /> : null}

      {d.sections.map((sec, i) => (
        <React.Fragment key={i}>
          <Section>{sec.title}</Section>
          <Card>
            {sec.rows ? sec.rows.map((x, j) => <Line key={j} first={j === 0} label={x.label} value={x.value} />) : null}
            {sec.list ? sec.list.map((t, j) => <Bullet key={j}>{t}</Bullet>) : null}
            {sec.text ? <Body sub>{sec.text}</Body> : null}
          </Card>
        </React.Fragment>
      ))}

      {d.explain ? (
        <>
          <Section>{tr('Простыми словами')}</Section>
          <Card>
          {d.explain.map((t, i) => <Body key={i} sub>{t}</Body>)}
          </Card>
        </>
      ) : null}

      {d.improve ? (
        <>
          <Section>{tr('Как улучшить')}</Section>
          <Card>
            {d.improve.map((t, i) => <Bullet key={i}>{t}</Bullet>)}
          </Card>
        </>
      ) : null}

      <Disclaimer />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: SIZES.pad + 8 },
  heroLabel: { color: c.sub, fontSize: SIZES.body, marginBottom: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', flexWrap: 'wrap' },
  heroValue: { color: c.text, fontSize: SIZES.hero, fontWeight: '800' },
  heroUnit: { color: c.sub, fontSize: SIZES.title, fontWeight: '500' },
  heroSub: { color: c.sub, fontSize: SIZES.body, marginTop: 4, textAlign: 'center' },
});
