// Вкладка «Обзор»: только главное. Возраст образа жизни, четыре оценки и совет на сегодня.
// Каждая карточка открывает подробный экран. Данные видны сразу (последний расчёт),
// пока идёт обновление — мигают. Возраст и оценки докручиваются счётчиком, кольца
// заполняются по очереди, подписи собираются из букв и слов.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { KineticText, Tilt, useCountUp } from '../motion';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Card, CardHead, T, Blink, Button } from '../ui';
import { AgeOrbit } from '../AgeOrbit';
import { SIZES, ORBIT, MOTION } from '../theme';
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

function ScoreTile({ id, index, title, s, onPress }) {
  const c = useColors();
  const st = useMemo(() => makeStyles(c), [c]);
  const ok = s && s.status === 'ok';
  const shown = useCountUp('score:' + id, ok ? s.score : null, index * MOTION.ringStagger);
  const lv = ok ? level(s.score) : null;
  const color = lv === 'high' ? c.good : lv === 'medium' ? c.warn : c.bad;
  return (
    <Tilt onPress={onPress} style={st.tile}>
      <Text style={st.tileTitle}>{title}</Text>
      <View style={st.ringWrap}>
        <Ring score={ok && shown != null ? shown : null} color={color} track={c.raised} />
        <Text style={st.ringValue}>{ok && shown != null ? Math.round(shown) : '—'}</Text>
      </View>
      <Text style={[st.tileSub, ok && { color }]}>{ok ? tr(WORD[lv]) : s && s.status === 'insufficient' ? tr('мало данных') : tr('нет данных')}</Text>
    </Tilt>
  );
}

export function HomeScreen({ result, profile, loading, error, onOpen, onRefresh }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sc = result && result.scores;
  const rec = useMemo(() => recommend(result, profile), [result, profile]);
  const age = useCountUp('age', result ? result.bio : null);
  return (
    <Screen tab onRefresh={loading ? undefined : onRefresh}>
      <Pressable onPress={result ? () => onOpen('detail:lifestyleAge') : undefined}>
        <AgeOrbit busy={loading}>
          <Blink active={loading}>
            <Text style={s.age}>{age != null ? fmt(age, 1) : '—'}</Text>
          </Blink>
        </AgeOrbit>
        <View style={s.captionWrap}>
          <KineticText style={s.caption} center by="word" delay={200}>{tr('Возраст образа жизни')}</KineticText>
        </View>
        <Text style={s.hint}>{loading ? tr('Обновляю данные…') : tr('по образу жизни, 6 месяцев') + '  ›'}</Text>
      </Pressable>

      {error ? <T style={{ color: c.bad }}>{error}</T> : null}

      <Blink active={loading}>
        <View style={s.grid}>
          <ScoreTile title={tr('Готовность')} id="readiness" index={0} s={sc && sc.readiness} onPress={() => onOpen('detail:readiness')} />
          <ScoreTile title={tr('Сон')} id="sleep" index={1} s={sc && sc.sleep} onPress={() => onOpen('detail:sleep')} />
          <ScoreTile title={tr('Активность')} id="activity" index={2} s={sc && sc.activity} onPress={() => onOpen('detail:activity')} />
          <ScoreTile title={tr('Восстановление')} id="recovery" index={3} s={sc && sc.recovery} onPress={() => onOpen('detail:recovery')} />
        </View>
      </Blink>

      <Card onPress={() => onOpen('tips')}>
        <CardHead icon="✦" title={tr('Совет на сегодня')} right={tr('Почему') + ' ›'} rightColor={c.accent} />
        <KineticText style={s.tip} by="word" delay={350}>{rec.main.title}</KineticText>
        {rec.others.length ? <Text style={s.more}>{tr('Ещё советов: ') + rec.others.length}</Text> : null}
      </Card>

      <Button title={'＋  ' + tr('Записать вручную')} onPress={() => onOpen('log')} secondary />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  age: { color: c.text, fontSize: ORBIT.ageSize, fontWeight: '700', textAlign: 'center' },
  captionWrap: { marginTop: -SIZES.gap },
  caption: { color: c.text, textAlign: 'center', fontSize: SIZES.title, fontWeight: '600' },
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
