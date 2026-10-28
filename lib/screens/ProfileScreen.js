// Вкладка «Профиль»: данные профиля и настройки.
import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, Button, Disclaimer, T } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';

export function ProfileScreen({ profile, onOpen, onReload, loading, onSaveProfile, labsInside }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const man = (profile && profile.manual) || {};
  const life = (profile && profile.lifestyle) || {};
  const units = (profile && profile.units) || {};
  const setUnit = (k, v) => onSaveProfile({ ...profile, units: { ...units, [k]: v } });
  const SMOKING = { never: tr('никогда'), former: tr('бросил(а)'), current: tr('курю') };
  const Toggle = ({ k, options }) => (
    <View style={s.toggle}>
      {options.map(([v, l]) => {
        const on = (units[k] || options[0][0]) === v;
        return (
          <Pressable key={v} onPress={() => setUnit(k, v)} style={[s.tItem, on && { backgroundColor: c.accent }]}>
            <Text style={[s.tText, { color: on ? c.onAccent : c.sub }]}>{l}</Text>
          </Pressable>
        );
      })}
    </View>
  );
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
      <Card onPress={() => onOpen('lifestyle')}>
        <CardHead title={tr('Образ жизни')} right={tr('Изменить') + ' ›'} rightColor={c.accent} />
        <Row label={tr('Окружность талии, см')} value={life.waistCm ? fmt(life.waistCm) : '—'} />
        <Row label={tr('Курение')} value={life.smoking ? SMOKING[life.smoking] : '—'} />
        <Row label={tr('Алкоголь, порций в неделю')} value={life.alcoholUnits != null ? fmt(life.alcoholUnits) : '—'} />
        <Row label={tr('Стресс, от 1 до 10')} value={life.stress ? String(life.stress) : '—'} />
      </Card>
      {labsInside ? <Button title={tr('Анализы и Clinical BioAge')} onPress={() => onOpen('labs')} /> : null}
      <Card>
        <CardHead title={tr('Единицы')} />
        <Row label={tr('Вес')} value="" />
        <Toggle k="mass" options={[['kg', tr('кг')], ['lb', 'lb']]} />
        <Row label={tr('Температура')} value="" />
        <Toggle k="temp" options={[['c', '°C'], ['f', '°F']]} />
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
  toggle: { flexDirection: 'row', backgroundColor: c.raised, borderRadius: 12, padding: 3 },
  tItem: { flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tText: { fontSize: SIZES.small + 1, fontWeight: '600' },
});
