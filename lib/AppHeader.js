// Шапка «Обзора»: слева логотип, Epimely и «забота о себе», справа таблетка-чип
// (готовность или погода) и круглая кнопка «＋» для записи. Под названием — ранг и уровень («Травник · 34 ур.»,
// нажатие ведёт на «Рост»); пока роста нет — прежний девиз.
import { fit } from './fit';
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SIZES } from './theme';
import { useColors } from './colors';
import { tr } from './i18n';
import { IconBolt, IconPlus } from './homeIcons';

function Logo({ s }) {
  return (
    <View style={s.logo}>
      <Text style={s.logoText}>E</Text>
    </View>
  );
}

// chip = { icon?: компонент иконки, text, onPress? } — белая таблетка справа, как «81%» в образце.
export function AppHeader({ onLog, chip, subtitle, onSubtitle }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const Ic = chip && chip.icon ? chip.icon : IconBolt;
  return (
    <View style={s.row}>
      <Logo s={s} />
      <View style={s.brand}>
        <Text style={s.name} {...fit(1, 0.7)}>Epimely</Text>
        {subtitle ? (
          <Pressable onPress={onSubtitle} disabled={!onSubtitle} hitSlop={8} accessibilityLabel="rank-subtitle">
            <Text style={s.motto} {...fit(1, 0.7)}>{subtitle}</Text>
          </Pressable>
        ) : <Text style={s.motto} {...fit(1, 0.7)}>{tr('забота о себе')}</Text>}
      </View>
      <View style={{ flex: 1 }} />
      {chip && chip.text ? (
        <Pressable onPress={chip.onPress} disabled={!chip.onPress} style={s.pill}>
          <View style={s.pillIcon}><Ic color={c.text} size={16} sw={1.8} /></View>
          <Text style={s.pillText} {...fit(1, 0.7)}>{chip.text}</Text>
        </Pressable>
      ) : null}
      <Pressable onPress={onLog} accessibilityLabel={tr('Записать')} style={({ pressed }) => [s.log, pressed && { opacity: 0.8 }]} hitSlop={6}>
        <IconPlus color={c.onPrimary} size={20} sw={2} />
      </Pressable>
    </View>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: SIZES.gap / 2 },
  logo: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: c.onPrimary, fontSize: 20, fontWeight: '800' },
  brand: { flexShrink: 1 },
  name: { color: c.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  motto: { color: c.sub, fontSize: SIZES.tiny + 1, letterSpacing: 0.4, marginTop: -1 },
  pill: { height: 42, borderRadius: 21, paddingLeft: 5, paddingRight: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: c.card, borderWidth: c.border, borderColor: c.line, ...c.shadow },
  pillIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.cardAlt, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: c.text, fontSize: SIZES.body, fontWeight: '600' },
  log: { width: 42, height: 42, borderRadius: 21, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
});
