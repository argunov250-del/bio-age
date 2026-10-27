// Вкладка «Профиль»: данные профиля и настройки.
import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, Button, Disclaimer, T } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';

export function ProfileScreen({ profile, onOpen, onReload, loading }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const man = (profile && profile.manual) || {};
  const birth = profile && profile.birth ? profile.birth.split('-').reverse().join('.') : '—';
  return (
    <Screen tab>
      <Text style={s.title}>{tr('Профиль')}</Text>
      <Card onPress={() => onOpen('setup')}>
        <CardHead title={tr('Обо мне')} right={tr('Изменить') + ' ›'} rightColor={c.accent} />
        <Row label={tr('Дата рождения')} value={birth} />
        <Row label={tr('Пол')} value={profile ? (profile.sex === 'f' ? tr('Женский') : tr('Мужской')) : '—'} />
        <Row label={tr('Рост, см')} value={profile && profile.heightCm ? fmt(profile.heightCm) : '—'} />
      </Card>
      <Card onPress={() => onOpen('setup')}>
        <CardHead title={tr('Ручной ввод')} right={man.date ? man.date.split('-').reverse().join('.') : null} />
        <Row label={tr('Пульс в покое, уд/мин')} value={man.restingHr ? fmt(man.restingHr) : '—'} />
        <Row label={tr('VO2max, мл/кг/мин')} value={man.vo2max ? fmt(man.vo2max, 1) : '—'} />
        <Row label={tr('Безжировая масса, кг')} value={man.leanMassKg ? fmt(man.leanMassKg, 1) : '—'} />
      </Card>
      <Button title={tr('Обновить данные')} onPress={onReload} disabled={loading} />
      <Button title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} secondary />
      <Button title={tr('Отладка')} onPress={() => onOpen('debug')} secondary />
      <Disclaimer />
      <T sub small style={{ textAlign: 'center' }}>{tr('Версия')} {APP_VERSION} · {CHANGES}</T>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  title: { color: c.text, fontSize: 30, fontWeight: '700', marginTop: SIZES.gap },
});
