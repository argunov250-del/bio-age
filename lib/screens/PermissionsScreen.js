// Объяснение разрешений (Health Connect требует такой экран) и запрос доступа.
import React from 'react';
import { Screen, Card, T, Button, Disclaimer } from '../ui';
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
  return (
    <Screen title={tr('Доступ к данным')} onBack={onBack}>
      <T>{tr('Приложение только читает данные из Health Connect и ничего туда не записывает. Всё считается на телефоне: данные никуда не отправляются, нет серверов, аккаунтов, аналитики и рекламы.')}</T>
      <Card>
        {ITEMS.map(([name, why]) => (
          <T key={name}>• <T style={{ fontWeight: '600' }}>{tr(name)}</T> — <T sub>{tr(why)}</T></T>
        ))}
      </Card>
      <T sub small>{tr('Можно выдать не все разрешения: метрики без доступа просто не войдут в расчёт. Отозвать доступ можно в любой момент в настройках Health Connect.')}</T>
      {granted ? <T sub small>{tr('Сейчас выдано разрешений: ') + granted}</T> : null}
      {onRequest ? <Button title={tr('Разрешить доступ')} onPress={onRequest} disabled={busy} /> : null}
      <Button title={tr('Открыть Health Connect')} onPress={openSettings} secondary />
      {onSkip ? <Button title={tr('Продолжить без Health Connect')} onPress={onSkip} secondary /> : null}
      <Disclaimer />
    </Screen>
  );
}
