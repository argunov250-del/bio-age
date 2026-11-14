// Контекстная карточка «Хирон» на стекле: сфера, одна подсказка по данным дня и «Спросить».
// Нажатие запоминает тему (раздел вопросов) и открывает чат с Хироном поверх вкладок.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard, GlassPill } from './glassKit';
import { Orb } from './CoachCard';
import { setChironTopic } from './chiron';
import { useColors } from './colors';
import { SIZES } from './theme';
import { tr } from './i18n';
import { fit } from './fit';

export function ChironGlass({ tip, topic, onOpen, testID = 'chiron-card' }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const go = onOpen ? () => { setChironTopic(topic); onOpen('coach'); } : undefined;
  return (
    <GlassCard onPress={go} testID={testID} accessibilityLabel={tr('Хирон')}>
      <View style={s.head}>
        <Orb />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.name} {...fit(1, 0.7)}>{tr('Хирон')}</Text>
          <Text style={s.meta} {...fit(1, 0.7)}>{tr('наставник Epimely')}</Text>
        </View>
        {go ? <GlassPill label={tr('Спросить')} onPress={go} testID={testID + '-ask'} /> : null}
      </View>
      {tip ? <Text style={s.tip} {...fit(5, 0.85)}>{tip}</Text> : null}
    </GlassCard>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1 },
  tip: { color: c.text, fontSize: SIZES.body, lineHeight: 21, marginTop: 10 },
});
