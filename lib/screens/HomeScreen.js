// Главный экран: возраст по центру вверху с анимацией, ниже паспортный возраст и темп.
// Данные показываются сразу (последний расчёт), пока идёт обновление — значения мигают.
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, T, Button, Row, Blink, Disclaimer } from '../ui';
import { AgeOrbit } from '../AgeOrbit';
import { COLORS, SIZES, ORBIT } from '../theme';
import { tr } from '../i18n';
import { fmt, signed, METRIC_INFO, NOTE_TEXT } from '../format';
import { METRICS } from '../formula';
import { APP_VERSION, CHANGES } from '../version';

export function HomeScreen({ result, loading, error, onReload, onOpen }) {
  const missing = result ? METRICS.filter((m) => !result.v180[m.key].ok) : [];
  const diff = result ? result.bio - result.chrono : null;
  return (
    <Screen>
      <AgeOrbit>
        <Blink active={loading}>
          <Text style={s.age}>{result ? fmt(result.bio, 1) : '—'}</Text>
        </Blink>
      </AgeOrbit>
      <T style={s.caption}>{tr('Биологический возраст')}</T>
      <T sub small style={s.center}>{loading ? tr('Обновляю данные…') : tr('по данным за последние 6 месяцев')}</T>

      <Blink active={loading}>
        <Card>
          <Row label={tr('Паспортный возраст')} value={result ? fmt(result.chrono, 1) : '—'} />
          <Row
            label={tr('Разница')}
            value={diff == null ? '—' : signed(diff) + ' ' + tr('лет')}
            color={diff == null ? null : diff > 0 ? COLORS.bad : COLORS.good}
          />
          <Row
            label={tr('Темп старения (30 дней)')}
            value={!result ? '—' : result.pace == null ? tr('мало данных') : fmt(result.pace, 2) + '×'}
            color={!result || result.pace == null ? null : result.pace > 1 ? COLORS.bad : COLORS.good}
          />
          <T sub small>{tr('Темп 1,0× — стареете со скоростью календаря; меньше — медленнее, больше — быстрее.')}</T>
        </Card>
      </Blink>

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
      <T sub small style={s.center}>{tr('Версия')} {APP_VERSION} · {CHANGES}</T>
    </Screen>
  );
}

const s = StyleSheet.create({
  age: { color: COLORS.text, fontSize: ORBIT.ageSize, fontWeight: '700', textAlign: 'center' },
  caption: { textAlign: 'center', fontSize: SIZES.title, fontWeight: '600', marginTop: -SIZES.gap },
  center: { textAlign: 'center' },
});
