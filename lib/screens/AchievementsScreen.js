// Экран достижений: сколько открыто, по разделам — значок, название, условие,
// прогресс или дата открытия. Новые (последние 3 дня) подсвечиваются.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '../ui';
import { Glass } from '../glass';
import { Badge } from '../Badge';
import { KineticText, useCountUp } from '../motion';
import { CATEGORIES, NEW_MS } from '../achievements';
import { NEON, SIZES } from '../theme';
import { tr } from '../i18n';
import { fmt } from '../format';
import { shortDate } from '../time';

function Summary({ done, total }) {
  const shown = useCountUp('ach-done', done);
  const size = 92, c = size / 2, r = c - 7, len = 2 * Math.PI * r;
  return (
    <Glass glow>
      <View style={s.sumRow}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={c} cy={c} r={r} stroke={NEON.text} strokeOpacity={0.08} strokeWidth={8} fill="none" />
            <Circle cx={c} cy={c} r={r} stroke={NEON.emerald} strokeWidth={8} fill="none" strokeLinecap="round"
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
    </Glass>
  );
}

function Row({ a, index }) {
  const now = Date.now();
  const fresh = a.done && a.at && now - a.at < NEW_MS;
  const progress = a.target ? a.value / a.target : 0;
  const big = a.target >= 1000;
  return (
    <View style={s.row}>
      <Badge icon={a.icon} done={a.done} progress={progress} delay={index * 60} fresh={fresh} />
      <View style={s.rowText}>
        <View style={s.titleRow}>
          <Text style={[s.title, !a.done && { color: NEON.soft }]}>{a.title}</Text>
          {fresh ? <Text style={s.new}>{tr('новое')}</Text> : null}
        </View>
        <Text style={s.desc}>{a.desc}</Text>
        {a.done ? (
          <Text style={s.when}>{a.at ? tr('Открыто ') + shortDate(a.at) : tr('Открыто')}</Text>
        ) : (
          <View style={s.progRow}>
            <View style={s.bar}><View style={[s.fill, { width: `${Math.min(100, progress * 100)}%` }]} /></View>
            <Text style={s.progText}>{(big ? fmt(Math.min(a.value, a.target)) : Math.min(a.value, a.target)) + ' / ' + fmt(a.target)}</Text>
          </View>
        )}
      </View>
    </View>
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
        items.sort((x, y) => (y.done - x.done) || (frac(y) - frac(x)));
        return (
          <Glass key={cat}>
            <Text style={s.cat}>{name()}</Text>
            {items.map((a) => <Row key={a.id} a={a} index={i++} />)}
          </Glass>
        );
      })}
    </Screen>
  );
}

const s = StyleSheet.create({
  sumRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.pad },
  sumText2: { flex: 1, gap: 4 },
  rowText: { flex: 1, gap: 3 },
  center: { alignItems: 'center', justifyContent: 'center' },
  sumNum: { color: NEON.text, fontSize: SIZES.stat, fontWeight: '800' },
  sumOf: { color: NEON.sub, fontSize: SIZES.tiny + 1, marginTop: -2 },
  sumTitle: { color: NEON.text, fontSize: SIZES.title - 2, fontWeight: '700' },
  sumText: { color: NEON.soft, fontSize: SIZES.small, lineHeight: 18 },
  cat: { color: NEON.soft, fontSize: SIZES.small, fontWeight: '700', letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap + 2, paddingVertical: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: NEON.text, fontSize: SIZES.text - 1, fontWeight: '700' },
  new: { color: NEON.ink, backgroundColor: NEON.emerald, fontSize: SIZES.tiny, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, overflow: 'hidden' },
  desc: { color: NEON.sub, fontSize: SIZES.small },
  when: { color: NEON.emerald, fontSize: SIZES.tiny + 1, fontWeight: '600' },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: NEON.track, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3, backgroundColor: NEON.emerald },
  progText: { color: NEON.sub, fontSize: SIZES.tiny + 1, minWidth: 64, textAlign: 'right' },
});
