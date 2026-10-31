// Карточка «Сон по расписанию» на «Обзоре»: режим, прошлая ночь и откуда она взята.
// Если режима нет и сна в данных тоже нет — подсказка установить режим.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Glass } from './glass';
import { NEON, SIZES } from './theme';
import { tr } from './i18n';
import { clock, hoursMin } from './time';

export function SleepPlanCard({ plan, last, fromHC, noSleepData, onPress }) {
  if (!(plan && plan.on)) {
    if (!noSleepData) return null;
    return (
      <Glass onPress={onPress}>
        <Text style={s.title}>🌙  {tr('Установи режим сна')}</Text>
        <Text style={s.sub}>{tr('Укажи, во сколько ложишься и встаёшь, — сон будет записываться сам.')}</Text>
      </Glass>
    );
  }
  const why = last && { open: tr('остановлено открытием приложения'), wake: tr('до времени подъёма'), now: tr('идёт сейчас') }[last.why];
  return (
    <Glass onPress={onPress}>
      <View style={s.head}>
        <Text style={s.title}>🌙  {tr('Сон по расписанию')}</Text>
        <Text style={s.more}>{plan.bed + '–' + plan.wake + '  ›'}</Text>
      </View>
      {fromHC ? (
        <Text style={s.line}>{tr('Прошлая ночь — по данным часов из Health Connect')}</Text>
      ) : last ? (
        <>
          <Text style={s.line}>{tr('Прошлая ночь: ') + clock(last.start) + ' → ' + clock(last.end) + ' · ' + hoursMin((last.end - last.start) / 3600000)}</Text>
          {why ? <Text style={s.sub}>{why}</Text> : null}
        </>
      ) : (
        <Text style={s.sub}>{tr('Первая ночь запишется сама — с ') + plan.bed}</Text>
      )}
    </Glass>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: SIZES.text - 1, fontWeight: '700' },
  more: { color: NEON.emerald, fontSize: SIZES.small, fontWeight: '700' },
  line: { color: '#E6F5EE', fontSize: SIZES.small + 1 },
  sub: { color: '#8FB8A6', fontSize: SIZES.small },
});
