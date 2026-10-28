// Вкладка «Обзор»: только главное. Возраст образа жизни, четыре оценки и совет на сегодня.
// Каждая карточка открывает подробный экран. Данные видны сразу (последний расчёт),
// пока идёт обновление — мигают.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Card, CardHead, T, Blink } from '../ui';
import { AgeOrbit } from '../AgeOrbit';
import { SIZES, ORBIT } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { level } from '../scores';
import { recommend } from '../recommend';

// Кольцо прогресса 0–100.
function Ring({ score, color, track, size = 64 }) {
  const r = (size - 8) / 2, len = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={6} fill="none" />
      {score != null ? (
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none" strokeLinecap="round"
          strokeDasharray={`${(len * score) / 100} ${len}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      ) : null}
    </Svg>
  );
}

const WORD = { high: 'хорошо', medium: 'средне', low: 'низко' };

function ScoreTile({ title, s, onPress }) {
  const c = useColors();
  const st = useMemo(() => makeStyles(c), [c]);
  const ok = s && s.status === 'ok';
  const lv = ok ? level(s.score) : null;
  const color = lv === 'high' ? c.good : lv === 'medium' ? c.warn : c.bad;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.tile, pressed && { opacity: 0.8 }]}>
      <Text style={st.tileTitle}>{title}</Text>
      <View style={st.ringWrap}>
        <Ring score={ok ? s.score : null} color={color} track={c.raised} />
        <Text style={st.ringValue}>{ok ? s.score : '—'}</Text>
      </View>
      <Text style={[st.tileSub, ok && { color }]}>{ok ? tr(WORD[lv]) : s && s.status === 'insufficient' ? tr('мало данных') : tr('нет данных')}</Text>
    </Pressable>
  );
}

export function HomeScreen({ result, profile, loading, error, onOpen, onRefresh }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sc = result && result.scores;
  const rec = useMemo(() => recommend(result, profile), [result, profile]);
  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <Pressable onPress={result ? () => onOpen('detail:lifestyleAge') : undefined}>
        <AgeOrbit>
          <Blink active={loading}>
            <Text style={s.age}>{result ? fmt(result.bio, 1) : '—'}</Text>
          </Blink>
        </AgeOrbit>
        <Text style={s.caption}>{tr('Возраст образа жизни')}</Text>
        <Text style={s.hint}>{loading ? tr('Обновляю данные…') : tr('по образу жизни, 6 месяцев') + '  ›'}</Text>
      </Pressable>

      {error ? <T style={{ color: c.bad }}>{error}</T> : null}

      <Blink active={loading}>
        <View style={s.grid}>
          <ScoreTile title={tr('Готовность')} s={sc && sc.readiness} onPress={() => onOpen('detail:readiness')} />
          <ScoreTile title={tr('Сон')} s={sc && sc.sleep} onPress={() => onOpen('detail:sleep')} />
          <ScoreTile title={tr('Активность')} s={sc && sc.activity} onPress={() => onOpen('detail:activity')} />
          <ScoreTile title={tr('Восстановление')} s={sc && sc.recovery} onPress={() => onOpen('detail:recovery')} />
        </View>
      </Blink>

      <Card onPress={() => onOpen('tips')}>
        <CardHead icon="✦" title={tr('Совет на сегодня')} right={tr('Почему') + ' ›'} rightColor={c.accent} />
        <Text style={s.tip}>{rec.main.title}</Text>
        {rec.others.length ? <Text style={s.more}>{tr('Ещё советов: ') + rec.others.length}</Text> : null}
      </Card>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  age: { color: c.text, fontSize: ORBIT.ageSize, fontWeight: '700', textAlign: 'center' },
  caption: { color: c.text, textAlign: 'center', fontSize: SIZES.title, fontWeight: '600', marginTop: -SIZES.gap },
  hint: { color: c.sub, textAlign: 'center', fontSize: SIZES.small, marginTop: 2, marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.gap },
  tile: { width: '47.5%', flexGrow: 1, backgroundColor: c.card, borderRadius: SIZES.radius, borderWidth: 1, borderColor: c.edge, padding: SIZES.pad, alignItems: 'center', gap: 8 },
  tileTitle: { color: c.sub, fontSize: SIZES.small + 1, fontWeight: '600' },
  ringWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ringValue: { position: 'absolute', color: c.text, fontSize: 20, fontWeight: '700' },
  tileSub: { color: c.sub, fontSize: SIZES.small },
  tip: { color: c.text, fontSize: SIZES.text, lineHeight: 23 },
  more: { color: c.sub, fontSize: SIZES.small },
});
