// Вкладка «Главная»: возраст с анимацией, пульс сейчас, последняя ночь, рекомендации,
// график биовозраста по неделям. Данные видны сразу (последний расчёт), при обновлении мигают.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Big, T, Blink } from '../ui';
import { AgeOrbit } from '../AgeOrbit';
import { LineChart } from '../charts';
import { SIZES, ORBIT } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed, METRIC_INFO } from '../format';
import { ago, clock, hoursMin, shortDate } from '../time';

function Stat({ label, value, color }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.stat}>
      <Text style={[s.statValue, color && { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// Clinical BioAge отдельно от Lifestyle Age: только по анализам, со своей датой и источником.
function ClinicalCard({ labs, onOpen }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sorted = [...(labs || [])].sort((a, b) => (a.date < b.date ? 1 : -1));
  const ok = sorted.find((e) => e.calc && e.calc.status === 'ok');
  const last = sorted[0];
  return (
    <Card onPress={() => onOpen('labs')}>
      <CardHead icon="⚗" title="Clinical BioAge" right={ok ? tr('анализ') + ' · ' + ok.date.split('-').reverse().join('.') : null} />
      {ok ? (
        <View style={s.clin}>
          <Text style={s.clinValue}>{fmt(ok.calc.phenoAge, 1)}</Text>
          <Text style={[s.clinDelta, { color: ok.calc.delta > 0 ? c.bad : c.good }]}>{signed(ok.calc.delta, 1)} {tr('лет')}</Text>
        </View>
      ) : (
        <Text style={s.clinNone}>
          {last && last.calc && last.calc.status === 'missing'
            ? tr('Не хватает анализов: ') + last.calc.missing.length + ' ' + tr('из') + ' 9'
            : tr('Нет данных. Добавьте 9 анализов крови, чтобы рассчитать Clinical BioAge.')}
        </Text>
      )}
    </Card>
  );
}

export function HomeScreen({ result, loading, error, onOpen, onRefresh, labs }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sr = result && result.series;
  const diff = result ? result.bio - result.chrono : null;
  const lastHr = sr && sr.lastHr;
  const night = sr && sr.lastNight;
  const trend = (result && result.trend) || [];
  const tips = (result && result.advice) || [];
  const missing = result ? Object.keys(METRIC_INFO).filter((k) => !result.v180[k].ok).length : 0;

  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <AgeOrbit>
        <Blink active={loading}>
          <Text style={s.age}>{result ? fmt(result.bio, 1) : '—'}</Text>
        </Blink>
      </AgeOrbit>
      <Text style={s.caption}>Lifestyle Age</Text>
      <Text style={s.hint}>{loading ? tr('Обновляю данные…') : tr('биологический возраст по образу жизни, 6 месяцев')}</Text>
      {result && result.computedAt ? (
        <Text style={s.hint}>
          {tr('рассчитано ') + ago(Date.parse(result.computedAt))}
          {result.metrics ? ' · ' + tr('полнота данных: ') + result.metrics.completeness.have + ' ' + tr('из') + ' ' + result.metrics.completeness.total : ''}
          {' · Health Connect'}
        </Text>
      ) : null}

      <Blink active={loading}>
        <Card onPress={result ? () => onOpen('breakdown') : undefined}>
          <View style={s.stats}>
            <Stat label={tr('паспортный')} value={result ? fmt(result.chrono, 1) : '—'} />
            <Stat label={tr('разница')} value={diff == null ? '—' : signed(diff)} color={diff == null ? null : diff > 0 ? c.bad : c.good} />
            <Stat
              label={tr('темп, 30 дн.')}
              value={!result || result.pace == null ? '—' : fmt(result.pace, 2) + '×'}
              color={!result || result.pace == null ? null : result.pace > 1 ? c.bad : c.good}
            />
          </View>
          <Text style={s.more}>{tr('Расшифровка по 9 метрикам')}{missing ? ' · ' + tr('нет данных: ') + missing : ''}  ›</Text>
        </Card>
      </Blink>

      {error ? <T style={{ color: c.bad }}>{error}</T> : null}

      <ClinicalCard labs={labs} onOpen={onOpen} />

      <View style={s.row}>
        <Card style={s.half}>
          <CardHead icon="♥" title={tr('Пульс')} />
          <Blink active={loading}>
            <Big size={28} value={lastHr ? fmt(lastHr.bpm) : '—'} unit={tr('уд/мин')} color={lastHr ? c.heart : null} sub={lastHr ? ago(lastHr.t) : tr('нет данных')} />
          </Blink>
        </Card>
        <Card style={s.half} onPress={() => onOpen('metrics')}>
          <CardHead icon="☾" title={tr('Сон')} />
          <Blink active={loading}>
            <Big size={28} value={night ? hoursMin(night.hours) : '—'} color={night ? c.sleep : null}
              sub={night ? clock(night.start) + ' – ' + clock(night.end) : tr('нет данных')} />
          </Blink>
        </Card>
      </View>

      {tips.length ? (
        <Card>
          <CardHead icon="✦" title={tr('Рекомендации')} />
          {tips.map((t, i) => (
            <View key={t.key} style={[s.tip, i > 0 && s.tipLine]}>
              <View style={s.tipHead}>
                <Text style={s.tipName}>{METRIC_INFO[t.key].name()}</Text>
                <Text style={s.tipGain}>{tr('до −') + fmt(t.gain, 1) + ' ' + tr('лет')}</Text>
              </View>
              <Text style={s.tipText}>{t.text}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <CardHead icon="◷" title={tr('Биовозраст по неделям')}
          right={trend.length > 1 ? signed(trend[trend.length - 1].v - trend[0].v) + ' ' + tr('лет') : null}
          rightColor={trend.length > 1 ? (trend[trend.length - 1].v > trend[0].v ? c.bad : c.good) : null} />
        {trend.length > 1 ? (
          <LineChart points={trend.map((p) => ({ x: p.t, y: p.v }))} labels={[shortDate(trend[0].t), shortDate(trend[trend.length - 1].t)]} />
        ) : (
          <T sub small>{tr('График появится, когда накопится хотя бы две недели данных.')}</T>
        )}
      </Card>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  age: { color: c.text, fontSize: ORBIT.ageSize, fontWeight: '700', textAlign: 'center' },
  caption: { color: c.text, textAlign: 'center', fontSize: SIZES.title, fontWeight: '600', marginTop: -SIZES.gap },
  clin: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  clinValue: { color: c.text, fontSize: 32, fontWeight: '700' },
  clinDelta: { fontSize: SIZES.text, fontWeight: '600' },
  clinNone: { color: c.sub, fontSize: SIZES.small + 1 },
  hint: { color: c.sub, textAlign: 'center', fontSize: SIZES.small, marginBottom: 4 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: c.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: c.sub, fontSize: SIZES.tiny + 1, marginTop: 2 },
  more: { color: c.sub, fontSize: SIZES.small, textAlign: 'center', marginTop: 4 },
  row: { flexDirection: 'row', gap: SIZES.gap },
  half: { flex: 1 },
  tip: { gap: 4, paddingTop: 4 },
  tipLine: { borderTopWidth: 1, borderTopColor: c.edge, paddingTop: 10, marginTop: 4 },
  tipHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tipName: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '600' },
  tipGain: { color: c.good, fontSize: SIZES.small, fontWeight: '600' },
  tipText: { color: c.sub, fontSize: SIZES.small + 1, lineHeight: 20 },
});
