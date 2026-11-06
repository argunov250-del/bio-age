// Карточка достижений на «Обзоре»: сколько открыто и последние значки.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glass } from './glass';
import { Badge } from './Badge';
import { NEW_MS } from './achievements';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

export function AchievementsCard({ list, onPress }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const done = list.filter((a) => a.done).sort((x, y) => (y.at || 0) - (x.at || 0));
  const fresh = done.find((a) => a.at && Date.now() - a.at < NEW_MS);
  const next = list.filter((a) => !a.done).sort((x, y) => y.value / y.target - x.value / x.target)[0];
  return (
    <Glass onPress={onPress}>
      <View style={s.head}>
        <Text {...fit(1, 0.7)} style={s.title}>{tr('Достижения')}</Text>
        <Text {...fit(1, 0.7)} style={s.count}>{done.length + ' / ' + list.length + '  ›'}</Text>
      </View>
      <View style={s.badges}>
        {done.slice(0, 5).map((a, i) => <Badge key={a.id} icon={a.icon} done size={44} delay={i * 80} fresh={a === fresh} />)}
        {!done.length && next ? <Badge icon={next.icon} progress={next.value / next.target} size={44} /> : null}
      </View>
      <Text style={s.line}>
        {fresh ? tr('Новое: ') + '«' + fresh.title + '»' : next ? tr('Ближе всего: ') + '«' + next.title + '» — ' + next.desc.toLowerCase() : tr('Все достижения открыты!')}
      </Text>
    </Glass>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: c.text, fontSize: SIZES.small, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  count: { color: c.sub, fontSize: SIZES.small, fontWeight: '700' },
  badges: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  line: { color: c.text, fontSize: SIZES.small + 1 },
});
