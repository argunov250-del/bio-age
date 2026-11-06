// Экран достижений: сколько открыто, по разделам — значок, название, условие,
// прогресс или дата открытия. Новые (последние 3 дня) подсвечиваются.
import { fit } from '../fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Card, Section, ListItem, ProgressBar } from '../ui';
import { useColors } from '../colors';
import { Badge } from '../Badge';
import { KineticText, useCountUp } from '../motion';
import { CATEGORIES, NEW_MS } from '../achievements';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fmt } from '../format';
import { shortDate } from '../time';

function Summary({ done, total }) {
  const col = useColors();
  const s = useMemo(() => makeStyles(col), [col]);
  const shown = useCountUp('ach-done', done);
  const size = 92, c = size / 2, r = c - 7, len = 2 * Math.PI * r;
  return (
    <Card>
      <View style={s.sumRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={r} stroke={col.text} strokeOpacity={0.08} strokeWidth={8} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke={col.accent} strokeWidth={8} fill="none" strokeLinecap="round"
              strokeDasharray={`${(len * (shown || 0)) / Math.max(1, total)} ${len}`} transform={`rotate(-90 ${c} ${c})`} />
          </Svg>
          <View style={[StyleSheet.absoluteFill, s.center]}>
            <Text style={s.sumNum}>{Math.round(shown || 0)}</Text>
            <Text style={s.sumOf}>{tr('из') + ' ' + total}</Text>
          </View>
        </View>
        <View style={s.sumText2}>
          <KineticText style={s.sumTitle} by="word">{tr('Твои достижения')}</KineticText>
          <Text style={s.sumText}>{tr('Открываются сами по твоим данным: шаги, сон, тренировки, восстановление и записи.')}</Text>
        </View>
      </View>
    </Card>
  );
}

function Row({ a, index, first }) {
  const col = useColors();
  const s = useMemo(() => makeStyles(col), [col]);
  const now = Date.now();
  const fresh = a.done && a.at && now - a.at < NEW_MS;
  const progress = a.target ? a.value / a.target : 0;
  const big = a.target >= 1000;
  const secret = a.hidden && !a.done; // секрет: «???», без условия и прогресса
  return (
    <ListItem first={first}>
      <Badge icon={secret ? '❓' : a.icon} done={a.done} progress={secret ? 0 : progress} delay={index * 60} fresh={fresh} />
      <View style={s.rowText}>
        <View style={s.titleRow}>
          <Text {...fit(2, 0.75)} style={[s.title, !a.done && { color: col.sub }]}>{secret ? '???' : a.title}</Text>
          {fresh ? <Text {...fit(1, 0.7)} style={s.new}>{tr('новое')}</Text> : null}
        </View>
        <Text style={s.desc}>{secret ? tr('Секретное достижение. Откроется само.') : a.desc}</Text>
        {secret ? null : a.done ? (
          <Text {...fit(1, 0.7)} style={s.when}>{a.at ? tr('Открыто ') + shortDate(a.at) : tr('Открыто')}</Text>
        ) : (
          <View style={s.progRow}>
            <View style={s.bar}><ProgressBar value={progress} /></View>
            <Text {...fit(1, 0.7)} style={s.progText}>{(big ? fmt(Math.min(a.value, a.target)) : Math.min(a.value, a.target)) + ' / ' + fmt(a.target)}</Text>
          </View>
        )}
      </View>
    </ListItem>
  );
}

export function AchievementsScreen({ list, onBack }) {
  const done = list.filter((a) => a.done).length;
  let i = 0;
  return (
    <Screen title={tr('Достижения')} onBack={onBack}>
      <Summary done={done} total={list.length} />
      {CATEGORIES.map(([cat, name]) => {
        const items = list.filter((a) => a.cat === cat);
        if (!items.length) return null;
        // Сначала открытые, затем ближайшие к открытию.
        const frac = (a) => (a.target ? a.value / a.target : 0);
        items.sort((x, y) => (y.done - x.done) || ((x.hidden && !x.done) - (y.hidden && !y.done)) || (frac(y) - frac(x)));
        return (
          <React.Fragment key={cat}>
            <Section right={items.filter((a) => a.done).length + ' / ' + items.length}>{name()}</Section>
            <Card>
              {items.map((a, k) => <Row key={a.id} a={a} index={i++} first={k === 0} />)}
            </Card>
          </React.Fragment>
        );
      })}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.pad },
  sumText2: { flex: 1, gap: 4 },
  rowText: { flex: 1, gap: 3 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sumNum: { color: c.text, fontSize: SIZES.stat, fontWeight: '800' },
  sumOf: { color: c.sub, fontSize: SIZES.tiny + 1, marginTop: -2 },
  sumTitle: { color: c.text, fontSize: SIZES.title - 2, fontWeight: '800' },
  sumText: { color: c.sub, fontSize: SIZES.small, lineHeight: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: c.text, fontSize: SIZES.text - 1, fontWeight: '700' },
  new: { color: c.onAccent, backgroundColor: c.accent, fontSize: SIZES.tiny, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  desc: { color: c.sub, fontSize: SIZES.small },
  when: { color: c.good, fontSize: SIZES.tiny + 1, fontWeight: '600' },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1 },
  progText: { color: c.sub, fontSize: SIZES.tiny + 1, minWidth: 64, textAlign: 'right' },
});
