// Совет «от Хирона»: его аватар-сфера, имя и текст совета от первого лица. Нажатие открывает
// вкладку Хирона. Один компонент для всех экранов, где показываются советы.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from './ui';
import { Orb } from './CoachCard';
import { openChiron, canOpenChiron } from './chiron';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';

// title — тема совета (подпись под именем); lead — вступление от первого лица;
// children — сам совет (текст, список); main — выделенная рамка; onPress — свой переход.
export function ChironTip({ title, lead, children, main, onPress, style }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const go = onPress || (canOpenChiron() ? openChiron : null);
  return (
    <Card onPress={go || undefined} style={[main && { borderWidth: 1.5, borderColor: c.accent }, style]}>
      <View style={s.head}>
        <Orb />
        <View style={{ flex: 1 }}>
          <Text {...fit(1, 0.7)} style={s.name}>{tr('Хирон')}</Text>
          <Text style={s.meta} numberOfLines={2}>{title || tr('советует')}</Text>
        </View>
        {go ? <Text style={s.chev}>›</Text> : null}
      </View>
      {lead ? <Text style={s.lead}>{lead}</Text> : null}
      {children}
    </Card>
  );
}

const makeStyles = (c) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  name: { color: c.text, fontSize: SIZES.text, fontWeight: '700' },
  meta: { color: c.sub, fontSize: SIZES.tiny + 1 },
  chev: { color: c.sub, fontSize: SIZES.title },
  lead: { color: c.text, fontSize: SIZES.text - 1, lineHeight: 22, fontWeight: '600', marginBottom: 4 },
});
