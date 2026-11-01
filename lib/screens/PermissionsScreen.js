// Объяснение разрешений (Health Connect требует такой экран) и запрос доступа.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, Body, Note, Button, Disclaimer, ListItem } from '../ui';
import { useColors } from '../colors';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { openSettings } from '../health';

const ITEMS = [
  ['Шаги', 'среднее число шагов в день'],
  ['Сон', 'длительность и регулярность сна'],
  ['Пульс', 'минуты в пульсовых зонах, оценка пульса в покое'],
  ['Пульс в покое', 'средний пульс покоя'],
  ['Тренировки', 'минуты силовых тренировок в неделю'],
  ['VO2max', 'аэробная выносливость'],
  ['Безжировая масса', 'индекс безжировой массы'],
  ['HRV, давление, вес, SpO2, дыхание, температура', 'восстановление, тело и сон'],
  ['Расстояние и калории', 'активность и тренировки'],
  ['История данных', 'чтобы читать данные старше 30 дней (берём последние 6 месяцев)'],
];

export function PermissionsScreen({ onRequest, onBack, busy, granted, onSkip }) {
  const c = useColors();
  return (
    <Screen title={tr('Доступ к данным')} onBack={onBack}>
      <Body>{tr('Epimely только читает данные из Health Connect. Всё считается на телефоне: нет серверов, аккаунтов, аналитики и рекламы.')}</Body>
      <Card>
        {ITEMS.map(([name, why], i) => (
          <ListItem key={name} first={i === 0}>
            <Text style={[s.item, { color: c.sub }]}><Text style={[s.name, { color: c.text }]}>{tr(name)}</Text>{' — ' + tr(why)}</Text>
          </ListItem>
        ))}
      </Card>
      <Note>{tr('Выдать можно не всё: метрики без доступа просто не попадут в расчёт. Отозвать доступ можно в любой момент в Health Connect.')}</Note>
      {granted ? <Note>{tr('Сейчас выдано разрешений: ') + granted}</Note> : null}
      {onRequest ? <Button title={tr('Разрешить доступ')} onPress={onRequest} disabled={busy} /> : null}
      <Button title={tr('Открыть Health Connect')} onPress={openSettings} secondary />
      {onSkip ? <Button title={tr('Продолжить без Health Connect')} onPress={onSkip} secondary /> : null}
      <Disclaimer />
    </Screen>
  );
}

const s = StyleSheet.create({
  item: { flex: 1, fontSize: SIZES.body, lineHeight: SIZES.lineHeight },
  name: { fontWeight: '600' },
});
