// Тренировки: нагрузка за неделю, активные минуты, VO2max, прогресс за 30 и 90 дней
// и список тренировок. Каждая карточка открывает подробный экран.
import { fit } from '../fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, PageTitle, Section, Blink, Button, Stat, Note, ListItem } from '../ui';
import { BarChart } from '../charts';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { ago, shortDate } from '../time';
import { workoutName, workoutIcon } from '../workouts';

const DAY = 86400000;
const LOAD_WORD = { high: 'выше обычной', normal: 'обычная', low: 'ниже обычной' };

// Добавление тренировки и список последних (используется и на главной).
export function RecentWorkouts({ result, onOpen, limit = 20 }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const list = (result && result.series && result.series.workouts) || [];
  return (
    <>
      <Button title={'＋  ' + tr('Добавить тренировку')} onPress={() => onOpen('log:workout')} variant="secondary" />
      {list.length ? (
        <Card>
          {list.slice(0, limit).map((w, i) => (
            <ListItem key={i} first={i === 0} onPress={() => onOpen('workout:' + i)}>
              <Text style={s.icon}>{workoutIcon(w.type)}</Text>
              <View style={s.grow}>
                <Text {...fit(2, 0.75)} style={s.name}>{workoutName(w.type, w.title)}</Text>
                <Note>{ago(w.start)}{w.hrAvg ? ' · ' + tr('пульс ') + fmt(w.hrAvg) : ''}{w.manual ? ' · ' + tr('вручную') : ''}</Note>
              </View>
              <Text {...fit(2, 0.75)} style={s.name}>{fmt((w.end - w.start) / 60000)} {tr('мин')}</Text>
            </ListItem>
          ))}
        </Card>
      ) : (
        <Card><Note>{tr('Тренировок пока нет. Добавь вручную или подключи трекер через Health Connect.')}</Note></Card>
      )}
    </>
  );
}

export function WorkoutsScreen({ result, loading, onRefresh, onOpen, onBack }) {
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
    <Screen onBack={onBack} onRefresh={loading ? undefined : onRefresh}>
      <PageTitle>{tr('Тренировки')}</PageTitle>
      <Blink active={loading} style={s.stack}>
        <Section right={sc && sc.load.level ? tr(LOAD_WORD[sc.load.level]) : null}>{tr('Нагрузка за неделю')}</Section>
        <Card>
          <Text style={s.big}>{sc && sc.load.week ? fmt(sc.load.week) : '—'}
            {sc && sc.load.weekUsual ? <Text style={s.unit}>  {tr('обычно ') + fmt(sc.load.weekUsual)}</Text> : null}</Text>
          {load14.some((x) => x.v > 0) ? <BarChart data={load14} height={90} labels={[shortDate(load14[0].key), tr('сегодня')]} /> : <Note>{tr('Нагрузка считается по пульсу и тренировкам. Добавь тренировку — и график появится.')}</Note>}
        </Card>

        <View style={s.row2}>
          <Card style={s.half}>
            <CardHead title={tr('Активные минуты')} />
            <Stat value={am && am.value != null ? fmt(am.value) : '—'} label={tr('за неделю · цель 150')} />
          </Card>
          <Card style={s.half} onPress={() => onOpen('detail:vo2max')}>
            <CardHead title="VO2max" right="›" />
            <Stat value={vo2 && vo2.value != null ? fmt(vo2.value, 1) : '—'}
              label={result && result.metrics.vo2maxTrend30.status === 'ok' ? tr('за 30 дней: ') + signed(result.metrics.vo2maxTrend30.value, 1) : tr('мл/кг/мин')} />
          </Card>
        </View>

        <Section>{tr('Прогресс формы')}</Section>
        <Card>
          <View style={s.prog}>
            <Stat style={s.half} value={p30.n} label={tr('тренировок за 30 дней')} hint={tr('было ') + prev30.n} hintColor={p30.n >= prev30.n ? c.good : c.warn} />
            <Stat style={s.half} value={fmt(p30.min / 60, 1)} label={tr('часов за 30 дней')} hint={tr('было ') + fmt(prev30.min / 60, 1)} hintColor={p30.min >= prev30.min ? c.good : c.warn} />
            <Stat style={s.half} value={p90.n} label={tr('тренировок за 90 дней')} />
          </View>
        </Card>
      </Blink>

      <Section>{tr('Последние тренировки')}</Section>
      <RecentWorkouts result={result} onOpen={onOpen} />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  stack: { gap: SIZES.gap },
  big: { color: c.text, fontSize: SIZES.display, fontWeight: '800' },
  unit: { color: c.sub, fontSize: SIZES.body, fontWeight: '500' },
  row2: { flexDirection: 'row', gap: SIZES.gap },
  half: { flex: 1 },
  grow: { flex: 1 },
  prog: { flexDirection: 'row', gap: SIZES.gap },
  item: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap, paddingVertical: SIZES.gap },
  icon: { fontSize: 22, width: 40, height: 40, textAlign: 'center', textAlignVertical: 'center', backgroundColor: c.cardAlt, borderRadius: 20, overflow: 'hidden' },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
});
