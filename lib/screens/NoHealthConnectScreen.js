// Health Connect не установлен или требует обновления.
import React from 'react';
import { Screen, T, Button } from '../ui';
import { tr } from '../i18n';
import { openInstall } from '../health';

export function NoHealthConnectScreen({ status, onRetry, onSkip }) {
  return (
    <Screen title="Health Connect">
      <T>{status === 'update'
        ? tr('Health Connect нужно обновить. Откройте Google Play, обновите приложение и вернитесь сюда.')
        : tr('На телефоне нет Health Connect — через него приложение получает данные из других приложений и устройств. Установите его из Google Play или продолжайте с ручными записями.')}</T>
      <Button title={status === 'update' ? tr('Обновить Health Connect') : tr('Установить Health Connect')} onPress={openInstall} />
      <Button title={tr('Проверить снова')} onPress={onRetry} secondary />
      {onSkip ? <Button title={tr('Продолжить без Health Connect')} onPress={onSkip} secondary /> : null}
      {onSkip ? <T sub small>{tr('Без Health Connect можно записывать сон, шаги, вес, давление, пульс и тренировки вручную.')}</T> : null}
    </Screen>
  );
}
