// Вкладка «Метрики»: все метрики за 7, 30 или 90 дней с источником и состоянием,
// ниже — графики активности. Нет данных — так и пишем, без нулей.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Section, PageTitle, T, Blink, Button } from '../ui';
import { ActivitySections } from './ActivityScreen';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { MASS, TEMP, unitsOf } from '../units';
import { shortDate } from '../time';
import { WINDOWS } from '../windows';

const SOURCE_LABEL = {
  health_connect: () => 'Health Connect',
  manual_input: () => tr('вручную'),
  lab_test: () => tr('анализ'),
  calculated: () => tr('расчёт'),
};

function statusText(m) {
  if (!m) return tr('нет данных');
  if (m.status === 'no_data') return m.note === 'noAccess' ? tr('нет доступа') : tr('нет данных');
  if (m.status === 'invalid') return tr('неверные значения');
  return null;
}

// Строка метрики: название, значение (или состояние), источник и сколько данных.
function MetricRow({ name, m, value, sub, warn }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const st = statusText(m);
  const few = m && m.status === 'insufficient';
  const meta = m && m.source && !st ? [SOURCE_LABEL[m.source](), m.n ? tr('данных: ') + m.n : null].filter(Boolean).join(' · ') : null;
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{name}</Text>
        {meta ? <Text style={s.meta}>{meta}</Text> : null}
        {sub && !st ? <Text style={s.meta}>{sub}</Text> : null}
        {few ? <Text style={[s.meta, { color: c.warn }]}>{tr('мало данных — значение неточное')}</Text> : null}
        {warn && !st ? <Text style={[s.meta, { color: c.warn }]}>{warn}</Text> : null}
      </View>
      <Text style={[s.value, st && { color: c.sub, fontWeight: '500', fontSize: SIZES.small + 1 }]}>{st || value}</Text>
    </View>
  );
}

function WindowSwitch({ value, onChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.switch}>
      {WINDOWS.map((w) => (
        <Pressable key={w} onPress={() => onChange(w)} style={[s.switchItem, w === value && { backgroundColor: c.accent }]}>
          <Text style={[s.switchText, { color: w === value ? c.onAccent : c.sub }]}>{w} {tr('дн.')}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const TEMPORARY = 'возможно влияние болезни, стресса или нагрузки';

export function MetricsScreen({ result, profile, loading, onRefresh, onAskAccess, missingAccess }) {
  const [w, setW] = useState(30);
  const m = result && result.metrics;
  const u = unitsOf(profile);
  const mass = MASS[u.mass], temp = TEMP[u.temp];
  const val = (x, f) => (x && (x.status === 'ok' || x.status === 'insufficient') && x.value != null ? f(x.value, x) : '—');
  const g = (key) => (m && m[key] ? m[key][w] : null);
  const sriW = w === 7 ? 14 : w;

  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <PageTitle>{tr('Метрики')}</PageTitle>
      <WindowSwitch value={w} onChange={setW} />
      {missingAccess ? (
        <Card>
          <T small sub>{tr('Есть новые типы данных (HRV, давление, вес и другие). Дайте доступ, чтобы они появились здесь.')}</T>
          <Button title={tr('Дать доступ')} onPress={onAskAccess} secondary />
        </Card>
      ) : null}
      {!m ? <Card><T sub small>{loading ? tr('Обновляю данные…') : tr('Нет данных. Потяните вниз, чтобы обновить.')}</T></Card> : (
        <Blink active={loading} style={{ gap: SIZES.gap }}>
          <Card>
            <CardHead icon="♥" title={tr('Сердце')} />
            <MetricRow name={tr('Пульс в покое')} m={g('restingHr')} value={val(g('restingHr'), (v) => fmt(v) + ' ' + tr('уд/мин'))}
              sub={g('restingHr') && g('restingHr').source === 'calculated' ? tr('оценка по пульсу') : null} />
            <MetricRow name={tr('Пульс во сне')} m={g('nightHr')} value={val(g('nightHr'), (v) => fmt(v) + ' ' + tr('уд/мин'))}
              sub={m.nightHrLast.status === 'ok' ? tr('последняя ночь: ') + fmt(m.nightHrLast.value) : null} />
            <MetricRow name={tr('HRV (вариабельность)')} m={g('hrv')} value={val(g('hrv'), (v) => fmt(v) + ' ' + tr('мс'))}
              sub={m.hrvBaseline.status === 'ok'
                ? tr('своя норма ') + fmt(m.hrvBaseline.value) + ' ' + tr('мс') + (m.hrvBaseline.deviationPct != null ? ' · ' + signed(m.hrvBaseline.deviationPct, 0) + '%' : '')
                : m.hrvBaseline.status === 'insufficient' ? tr('своя норма копится: ') + m.hrvBaseline.n + ' / 14' : null}
              warn={m.hrvBaseline.unusual ? tr('HRV заметно отличается от вашей нормы — ') + tr(TEMPORARY) : null} />
            <MetricRow name={tr('Давление')} m={g('bloodPressure')} value={val(g('bloodPressure'), (v, x) => fmt(v) + '/' + fmt(x.dia))}
              sub={m.bloodPressureLast.status === 'ok' ? tr('последнее: ') + fmt(m.bloodPressureLast.value) + '/' + fmt(m.bloodPressureLast.dia) + ', ' + shortDate(m.bloodPressureLast.t) : null} />
            <MetricRow name="VO2max" m={m.vo2max} value={val(m.vo2max, (v) => fmt(v, 1))}
              sub={m.vo2maxTrend30.status === 'ok' ? tr('за 30 дней: ') + signed(m.vo2maxTrend30.value, 1) : tr('последний достоверный замер')} />
          </Card>

          <Card>
            <CardHead icon="☾" title={tr('Сон')} />
            <MetricRow name={tr('Длительность')} m={g('sleepDuration')} value={val(g('sleepDuration'), (v) => fmt(v, 1) + ' ' + tr('ч'))} />
            <MetricRow name={tr('Стадии')} m={g('sleepStages')}
              value={val(g('sleepStages'), (v, x) => `${fmt(x.pct.deep)}% / ${fmt(x.pct.rem)}%`)}
              sub={g('sleepStages') && g('sleepStages').pct ? tr('глубокий / REM; лёгкий ') + fmt(g('sleepStages').pct.light) + '%, ' + tr('пробуждения ') + fmt(g('sleepStages').pct.awake) + '%' : null} />
            <MetricRow name={tr('Регулярность (SRI, ') + sriW + ' ' + tr('дн.') + ')'} m={m.sleepRegularity[sriW]} value={val(m.sleepRegularity[sriW], (v) => fmt(v))} />
            <MetricRow name={tr('SpO2 ночью')} m={g('spo2')} value={val(g('spo2'), (v) => fmt(v, 1) + '%')}
              sub={g('spo2') && g('spo2').nightOnly === false ? tr('ночных замеров нет — по всем') : tr('вспомогательная метрика')} />
            <MetricRow name={tr('Дыхание ночью')} m={g('respiratoryRate')} value={val(g('respiratoryRate'), (v) => fmt(v, 1) + ' ' + tr('/мин'))} />
          </Card>

          <Card>
            <CardHead icon="👣" title={tr('Активность')} />
            <MetricRow name={tr('Шаги в день')} m={g('steps')} value={val(g('steps'), (v) => fmt(v))} />
            <MetricRow name={w === 7 ? tr('Активные минуты за неделю') : tr('Активные минуты в неделю')} m={g('activeMinutes')}
              value={val(g('activeMinutes'), (v) => fmt(v) + ' ' + tr('мин'))}
              sub={g('activeMinutes') && g('activeMinutes').vigorous != null ? tr('из них интенсивных ') + fmt(g('activeMinutes').vigorous) + ' · ' + tr('пульс от ') + fmt(g('activeMinutes').hrMax * 0.5) : null} />
            <MetricRow name={tr('Тренировки')} m={g('exercise')} value={val(g('exercise'), (v) => fmt(v))}
              sub={g('exercise') && g('exercise').minutes != null ? fmt(g('exercise').minutes) + ' ' + tr('мин всего') : null} />
          </Card>

          <Card>
            <CardHead icon="⚖" title={tr('Тело')} />
            <MetricRow name={tr('Вес')} m={g('weight')} value={val(g('weight'), (v) => fmt(mass.from(v), 1) + ' ' + tr(mass.label))}
              sub={m.weightTrend90.status === 'ok' ? tr('тренд за 90 дней: ') + signed(mass.from(m.weightTrend90.value), 1) + ' ' + tr(mass.label) : null} />
            <MetricRow name={tr('Рост')} m={m.height} value={val(m.height, (v) => fmt(v) + ' ' + tr('см'))} />
            <MetricRow name={tr('Температура')} m={m.bodyTempDeviation}
              value={val(m.bodyTempDeviation, (v) => signed(temp.delta(v), 1) + ' ' + temp.label)}
              sub={tr('отклонение от вашей нормы')}
              warn={m.bodyTempDeviation.unusual ? tr(TEMPORARY) : null} />
          </Card>
        </Blink>
      )}

      <Section>{tr('Графики')}</Section>
      <ActivitySections result={result} loading={loading} />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.edge },
  name: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '500' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1, marginTop: 2 },
  value: { color: c.text, fontSize: SIZES.text + 1, fontWeight: '700', textAlign: 'right', maxWidth: '45%' },
  switch: { flexDirection: 'row', backgroundColor: c.card, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: c.edge },
  switchItem: { flex: 1, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  switchText: { fontSize: SIZES.small + 1, fontWeight: '600' },
});
