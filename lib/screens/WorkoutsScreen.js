// Тренировки: нагрузка за неделю, активные минуты, VO2max, прогресс за 30 и 90 дней
// и список тренировок. Каждая карточка открывает подробный экран.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, PageTitle, Section, T, Blink, Button } from '../ui';
import { BarChart } from '../charts';
import { SIZES } from '../theme';
import { tr, RU } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { ago, shortDate } from '../time';
import { workoutName, workoutIcon } from '../workouts';

const DAY = 86400000;
const LOAD_WORD = { high: 'выше обычной', normal: 'обычная', low: 'ниже обычной' };

export function WorkoutsScreen({ result, loading, onRefresh, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sr = result && result.series;
  const sc = result && result.scores;
  const list = (sr && sr.workouts) || [];
  const now = Date.now();
  const period = (from, to) => {
    const w = list.filter((x) => x.start >= now - from * DAY && x.start < now - to * DAY);
    return { n: w.length, min: w.reduce((a, x) => a + (x.end - x.start) / 60000, 0) };
  };
  const p30 = period(30, 0), prev30 = period(60, 30), p90 = period(90, 0);
  const am = result && result.metrics && result.metrics.activeMinutes[7];
  const vo2 = result && result.metrics && result.metrics.vo2max;
  const load14 = sr ? sr.load.slice(-14) : [];

  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <PageTitle>{tr('Тренировки')}</PageTitle>
      <Blink active={loading} style={{ gap: SIZES.gap }}>
        <Card>
          <CardHead title={tr('Нагрузка за неделю')} right={sc && sc.load.level ? tr(LOAD_WORD[sc.load.level]) : null}
            rightColor={sc && sc.load.level === 'high' ? c.warn : c.sub} />
          <Text style={s.big}>{sc && sc.load.week ? fmt(sc.load.week) : '—'}
            {sc && sc.load.weekUsual ? <Text style={s.unit}>  {tr('обычно ') + fmt(sc.load.weekUsual)}</Text> : null}</Text>
          {load14.some((x) => x.v > 0) ? <BarChart data={load14} height={90} labels={[shortDate(load14[0].key), tr('сегодня')]} /> : <T sub small>{tr('Нагрузка считается по пульсу и тренировкам. Добавь тренировку вручную — и она появится здесь.')}</T>}
        </Card>

        <View style={s.row2}>
          <Card style={s.half}>
            <CardHead title={tr('Активные минуты')} />
            <Text style={s.mid}>{am && am.value != null ? fmt(am.value) : '—'}</Text>
            <Text style={s.small}>{tr('за неделю · цель 150')}</Text>
          </Card>
          <Card style={s.half} onPress={() => onOpen('detail:vo2max')}>
            <CardHead title="VO2max" right="›" />
            <Text style={s.mid}>{vo2 && vo2.value != null ? fmt(vo2.value, 1) : '—'}</Text>
            <Text style={s.small}>{result && result.metrics.vo2maxTrend30.status === 'ok' ? tr('за 30 дней: ') + signed(result.metrics.vo2maxTrend30.value, 1) : tr('мл/кг/мин')}</Text>
          </Card>
        </View>

        <Card>
          <CardHead title={tr('Прогресс формы')} />
          <View style={s.prog}>
            <View style={s.progCol}>
              <Text style={s.mid}>{p30.n}</Text>
              <Text style={s.small}>{tr('тренировок за 30 дней')}</Text>
              <Text style={[s.small, { color: p30.n >= prev30.n ? c.good : c.warn }]}>{(RU ? 'было ' : 'before ') + prev30.n}</Text>
            </View>
            <View style={s.progCol}>
              <Text style={s.mid}>{fmt(p30.min / 60, 1)}</Text>
              <Text style={s.small}>{tr('часов за 30 дней')}</Text>
              <Text style={[s.small, { color: p30.min >= prev30.min ? c.good : c.warn }]}>{(RU ? 'было ' : 'before ') + fmt(prev30.min / 60, 1)}</Text>
            </View>
            <View style={s.progCol}>
              <Text style={s.mid}>{p90.n}</Text>
              <Text style={s.small}>{tr('тренировок за 90 дней')}</Text>
            </View>
          </View>
        </Card>
      </Blink>

      <Section>{tr('Последние тренировки')}</Section>
      <Button title={'＋  ' + tr('Добавить тренировку')} onPress={() => onOpen('log:workout')} secondary />
      {list.length ? list.slice(0, 20).map((w, i) => (
        <Pressable key={i} onPress={() => onOpen('workout:' + i)} style={({ pressed }) => [s.item, pressed && { opacity: 0.8 }]}>
          <Text style={s.icon}>{workoutIcon(w.type)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{workoutName(w.type, w.title)}</Text>
            <Text style={s.small}>{ago(w.start)}{w.hrAvg ? ' · ' + tr('пульс ') + fmt(w.hrAvg) : ''}{w.manual ? ' · ' + tr('вручную') : ''}</Text>
          </View>
          <Text style={s.dur}>{fmt((w.end - w.start) / 60000)} {tr('мин')}</Text>
        </Pressable>
      )) : (
        <Card><T sub small>{tr('Тренировок пока нет. Добавь вручную или подключи приложение для тренировок через Health Connect.')}</T></Card>
      )}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  big: { color: c.text, fontSize: 32, fontWeight: '700' },
  unit: { color: c.sub, fontSize: SIZES.small + 1, fontWeight: '500' },
  mid: { color: c.text, fontSize: 26, fontWeight: '700' },
  small: { color: c.sub, fontSize: SIZES.small },
  row2: { flexDirection: 'row', gap: SIZES.gap },
  half: { flex: 1 },
  prog: { flexDirection: 'row', gap: SIZES.gap },
  progCol: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap, backgroundColor: c.card, borderRadius: SIZES.radius, borderWidth: 1, borderColor: c.edge, padding: 12 },
  icon: { fontSize: 22, width: 40, height: 40, textAlign: 'center', textAlignVertical: 'center', backgroundColor: c.raised, borderRadius: 20, overflow: 'hidden' },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
  dur: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
});
