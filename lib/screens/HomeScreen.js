// Главный экран: биологический возраст, паспортный возраст, темп старения.
import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Screen, Card, T, Button, Row, Disclaimer } from '../ui';
import { COLORS, SIZES } from '../theme';
import { tr } from '../i18n';
import { fmt, signed, METRIC_INFO, NOTE_TEXT } from '../format';
import { METRICS } from '../formula';
import { APP_VERSION } from '../version';

export function HomeScreen({ result, loading, progress, error, onReload, onOpen }) {
  const missing = result ? METRICS.filter((m) => !result.v180[m.key].ok) : [];
  const diff = result ? result.bio - result.chrono : 0;
  return (
    <Screen>
      <T sub>{tr('Биологический возраст')}</T>
      {result ? (
        <Card>
          <T style={{ fontSize: SIZES.hero, fontWeight: '700' }}>{fmt(result.bio, 1)}</T>
          <T sub style={{ marginBottom: 6 }}>{tr('по данным за последние 6 месяцев')}</T>
          <Row label={tr('Паспортный возраст')} value={fmt(result.chrono, 1)} />
          <Row label={tr('Разница')} value={signed(diff) + ' ' + tr('лет')} color={diff > 0 ? COLORS.bad : COLORS.good} />
          <Row
            label={tr('Темп старения (30 дней)')}
            value={result.pace == null ? tr('мало данных') : fmt(result.pace, 2) + '×'}
            color={result.pace == null ? null : result.pace > 1 ? COLORS.bad : COLORS.good}
          />
          <T sub small>{tr('Темп 1,0× — стареете со скоростью календаря; меньше — медленнее, больше — быстрее.')}</T>
        </Card>
      ) : null}
      {loading ? (
        <Card>
          <ActivityIndicator color={COLORS.accent} />
          <T sub small style={{ textAlign: 'center' }}>{tr('Читаю данные из Health Connect…') + (progress ? ' ' + progress : '')}</T>
        </Card>
      ) : null}
      {error ? <T style={{ color: COLORS.bad }}>{error}</T> : null}
      {missing.length ? (
        <Card>
          <T>{tr('Не хватает метрик, расчёт без них:')}</T>
          {missing.map((m) => (
            <T key={m.key} sub small>• {METRIC_INFO[m.key].name()} — {NOTE_TEXT[result.v180[m.key].note]()}</T>
          ))}
        </Card>
      ) : null}
      <Button title={tr('Расшифровка')} onPress={() => onOpen('breakdown')} disabled={!result} />
      <Button title={tr('Обновить')} onPress={onReload} disabled={loading} secondary />
      <Button title={tr('Профиль')} onPress={() => onOpen('setup')} secondary />
      <Button title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} secondary />
      <Button title={tr('Отладка')} onPress={() => onOpen('debug')} secondary />
      <Disclaimer />
      <T sub small style={{ textAlign: 'center' }}>{tr('Версия')} {APP_VERSION}</T>
    </Screen>
  );
}
