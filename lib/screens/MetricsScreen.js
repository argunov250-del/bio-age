// Вкладка «Метрики»: все метрики Health Connect одной строкой — значение за выбранное окно,
// источник и простой тренд. Нажатие открывает подробный экран. Нет данных — так и пишем.
import { fit } from '../fit';
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, Section, PageTitle, T, Blink, Button, Segmented, ListItem } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { MASS, unitsOf } from '../units';
import { WINDOWS } from '../windows';

const SOURCE_LABEL = {
  health_connect: () => 'Health Connect',
  manual_input: () => tr('вручную'),
  calculated: () => tr('расчёт'),
};

const MANUAL = () => tr('вручную');

const live = (m) => m && (m.status === 'ok' || m.status === 'insufficient') && m.value != null;

// Тренд: окно 7 дней против 30 дней. better: 'up' | 'down'.
function trendOfWindows(a, b, better) {
  if (!live(a) || !live(b) || !b.value) return null;
  const rel = (a.value - b.value) / b.value;
  if (Math.abs(rel) < 0.03) return 'stable';
  return (rel > 0) === (better === 'up') ? 'better' : 'attention';
}

function Item({ name, m, value, trend, onPress, first }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const has = live(m);
  const status = !m || m.status === 'no_data'
    ? (m && m.note === 'noAccess' ? tr('нет доступа') : tr('нет данных'))
    : m.status === 'invalid' ? tr('неверные значения') : null;
  const TREND = {
    better: ['↗', tr('улучшается'), c.good],
    stable: ['→', tr('стабильно'), c.sub],
    attention: ['↘', tr('требует внимания'), c.warn],
  };
  const t = trend ? TREND[trend] : null;
  return (
    <ListItem onPress={onPress} first={first}>
      <View style={s.grow}>
        <Text {...fit(2, 0.75)} style={s.name}>{name}</Text>
        <Text style={s.meta}>
          {has && m.source ? SOURCE_LABEL[m.source]() + (m.withManual ? ' + ' + MANUAL() : '') : ''}
          {m && m.status === 'insufficient' ? ' · ' + tr('мало данных') : ''}
          {t ? '  ' : ''}{t ? <Text style={{ color: t[2] }}>{t[0]} {t[1]}</Text> : null}
        </Text>
      </View>
      <Text {...fit(1, 0.6)} style={[s.value, !has && s.muted]}>{has ? value : status}</Text>
      <Text style={s.chev}>›</Text>
    </ListItem>
  );
}

export function MetricsScreen({ result, profile, loading, onRefresh, onAskAccess, missingAccess, onOpen }) {
  const [w, setW] = useState(30);
  const m = result && result.metrics;
  const mass = MASS[unitsOf(profile).mass];
  const g = (key) => (m && m[key] ? m[key][w] : null);
  const tw = (key, better) => (m && m[key] ? trendOfWindows(m[key][7], m[key][30], better) : null);
  const open = (k) => () => onOpen('detail:' + k);
  const v = (x, f) => (live(x) ? f(x.value, x) : '');
  const sriW = w === 7 ? 14 : w;

  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <PageTitle>{tr('Метрики')}</PageTitle>
      <Segmented options={WINDOWS.map((x) => [x, x + ' ' + tr('дн.')])} value={w} onChange={setW} />
      <Button title={'＋  ' + tr('Записать вручную')} onPress={() => onOpen('log')} variant="secondary" />
      {missingAccess ? (
        <Card>
          <T small sub>{tr('Есть новые типы данных. Дай доступ, чтобы они появились здесь.')}</T>
          <Button title={tr('Дать доступ')} onPress={onAskAccess} secondary />
        </Card>
      ) : null}
      {!m ? <Card><T sub small>{loading ? tr('Обновляю данные…') : tr('Нет данных. Потяни вниз, чтобы обновить.')}</T></Card> : (
        <Blink active={loading} style={st.stack}>
          <Section>{tr('Сердце')}</Section>
          <Card>
            <Item first name={tr('Пульс покоя')} m={g('restingHr')} value={v(g('restingHr'), (x) => fmt(x) + ' ' + tr('уд/мин'))} trend={tw('restingHr', 'down')} onPress={open('heartRate')} />
            <Item name={tr('Пульс во сне')} m={g('nightHr')} value={v(g('nightHr'), (x) => fmt(x) + ' ' + tr('уд/мин'))} trend={tw('nightHr', 'down')} onPress={open('heartRate')} />
            <Item name="HRV" m={g('hrv')} value={v(g('hrv'), (x) => fmt(x) + ' ' + tr('мс'))} trend={tw('hrv', 'up')} onPress={open('hrv')} />
            <Item name={tr('Давление')} m={g('bloodPressure')} value={v(g('bloodPressure'), (x, y) => fmt(x) + '/' + fmt(y.dia))} onPress={open('bloodPressure')} />
            <Item name="VO2max" m={m.vo2max} value={v(m.vo2max, (x) => fmt(x, 1))} onPress={open('vo2max')} />
          </Card>
          <Section>{tr('Сон')}</Section>
          <Card>
            <Item first name={tr('Длительность сна')} m={g('sleepDuration')} value={v(g('sleepDuration'), (x) => fmt(x, 1) + ' ' + tr('ч'))} trend={tw('sleepDuration', 'up')} onPress={open('sleep')} />
            <Item name={tr('Регулярность сна')} m={m.sleepRegularity[sriW]} value={v(m.sleepRegularity[sriW], (x) => fmt(x) + ' / 100')} onPress={open('sleep')} />
            <Item name={tr('Дыхание во сне')} m={g('respiratoryRate')} value={v(g('respiratoryRate'), (x) => fmt(x, 1) + ' ' + tr('/мин'))} onPress={open('respiratory')} />
            <Item name="SpO2" m={g('spo2')} value={v(g('spo2'), (x) => fmt(x, 1) + '%')} onPress={open('spo2')} />
          </Card>
          <Section>{tr('Активность')}</Section>
          <Card>
            <Item first name={tr('Шаги в день')} m={g('steps')} value={v(g('steps'), (x) => fmt(x))} trend={tw('steps', 'up')} onPress={open('activity')} />
            <Item name={w === 7 ? tr('Активные минуты за неделю') : tr('Активные минуты в неделю')} m={g('activeMinutes')} value={v(g('activeMinutes'), (x) => fmt(x) + ' ' + tr('мин'))} onPress={open('activity')} />
            <Item name={tr('Тренировки')} m={g('exercise')} value={v(g('exercise'), (x) => fmt(x))} onPress={open('activity')} />
          </Card>
          <Section>{tr('Тело')}</Section>
          <Card>
            <Item first name={tr('Вес')} m={g('weight')} value={v(g('weight'), (x) => fmt(mass.from(x), 1) + ' ' + tr(mass.label))} trend={tw('weight', 'down')} onPress={open('body')} />
            <Item name={tr('Рост')} m={m.height} value={v(m.height, (x) => fmt(x) + ' ' + tr('см'))} onPress={open('body')} />
            <Item name={tr('Температура')} m={m.bodyTempDeviation} value={v(m.bodyTempDeviation, (x) => (x >= 0 ? '+' : '') + fmt(x, 1) + '°')} onPress={open('temperature')} />
          </Card>
        </Blink>
      )}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  grow: { flex: 1 },
  name: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '500' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1, marginTop: 2 },
  value: { color: c.text, fontSize: SIZES.text, fontWeight: '700', textAlign: 'right', maxWidth: '45%' },
  muted: { color: c.sub, fontWeight: '500', fontSize: SIZES.small },
  chev: { color: c.sub, fontSize: 20, marginLeft: 2 },
});

const st = StyleSheet.create({
  stack: { gap: SIZES.gap },
});
