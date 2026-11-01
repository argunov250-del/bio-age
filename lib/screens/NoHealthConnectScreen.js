// Health Connect не установлен или требует обновления.
import React from 'react';
import { Screen, Body, Note, Button } from '../ui';
import { tr } from '../i18n';
import { openInstall } from '../health';

export function NoHealthConnectScreen({ status, onRetry, onSkip }) {
  return (
    <Screen title="Health Connect">
      <Body>{status === 'update'
        ? tr('Health Connect нужно обновить. Открой Google Play, обнови приложение и вернись сюда.')
        : tr('Health Connect собирает данные из других приложений и устройств, но на телефоне его нет. Установи его из Google Play или продолжай с ручными записями.')}</Body>
      <Button title={status === 'update' ? tr('Обновить Health Connect') : tr('Установить Health Connect')} onPress={openInstall} />
      <Button title={tr('Проверить снова')} onPress={onRetry} secondary />
      {onSkip ? <Button title={tr('Продолжить без Health Connect')} onPress={onSkip} secondary /> : null}
      {onSkip ? <Note>{tr('Без Health Connect можно вносить сон, шаги, вес, давление, пульс и тренировки вручную.')}</Note> : null}
    </Screen>
  );
}
