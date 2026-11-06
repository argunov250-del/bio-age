// Карточка «Динамика за 6 месяцев»: возраст тела по неделям плавной линией со
// светящейся заливкой, пунктир — паспортный возраст. Нажатие открывает подробности.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AreaChart } from './AreaChart';
import { Glass } from './glass';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr, RU } from './i18n';

const H = 120;
const date = (t) => new Date(t).toLocaleDateString(RU ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });

export function TrendCard({ trend, chrono, onPress }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const ok = trend && trend.length >= 2 && chrono != null;
  return (
    <Glass onPress={ok ? onPress : undefined}>
      <View style={s.head}>
        <Text {...fit(2, 0.7)} style={s.title}>{tr('Динамика за 6 месяцев')}<Text style={s.sub}>{'  ·  ' + tr('по неделям')}</Text></Text>
        {ok ? <Text style={s.sub}>{date(trend[0].t) + ' — ' + date(trend[trend.length - 1].t)}</Text> : null}
      </View>
      {ok ? <AreaChart points={trend.map((p) => ({ x: p.t, y: p.v }))} refValue={chrono} refLabel={tr('паспортный') + ' ' + Math.round(chrono)} height={H} gid="trendFill" />
        : <Text style={s.sub}>{tr('График появится, когда накопятся данные хотя бы за 2 недели.')}</Text>}
      {ok ? (
        <View style={s.foot}>
          <Text style={s.sub}>{tr('6 мес. назад')}</Text>
          <Text {...fit(1, 0.7)} style={s.more}>{tr('Подробнее')} ›</Text>
          <Text style={s.sub}>{tr('сейчас')}</Text>
        </View>
      ) : null}
    </Glass>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '700', flexShrink: 1 },
  sub: { color: c.sub, fontSize: SIZES.small - 1, fontWeight: '400' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.line, paddingTop: 8 },
  more: { color: c.text, fontSize: SIZES.small - 1, fontWeight: '600' },
});
