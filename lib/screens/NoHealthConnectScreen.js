// Health Connect не установлен или требует обновления.
import React from 'react';
import { Screen, T, Button } from '../ui';
import { tr } from '../i18n';
import { openInstall } from '../health';

export function NoHealthConnectScreen({ status, onRetry }) {
  return (
    <Screen title="Health Connect">
      <T>{status === 'update'
        ? tr('Health Connect нужно обновить. Откройте Google Play, обновите приложение и вернитесь сюда.')
        : tr('На телефоне нет Health Connect. Без него приложение не может прочитать данные о здоровье. Установите Health Connect из Google Play, подключите к нему приложения часов или фитнес-браслета и вернитесь сюда.')}</T>
      <Button title={status === 'update' ? tr('Обновить Health Connect') : tr('Установить Health Connect')} onPress={openInstall} />
      <Button title={tr('Проверить снова')} onPress={onRetry} secondary />
    </Screen>
  );
}
