// Вкладка «Профиль» (та же гамма, что «Обзор»): данные о себе одной карточкой,
// единицы измерения и настройки.
import React, { useMemo } from 'react';
import { View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, PageTitle, Disclaimer, T } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';
import { GOALS, EXPERIENCE, SMOKING, CYCLE } from './SetupScreen';

const label = (list, v) => {
  const x = list.find(([k]) => k === v);
  return x ? tr(x[1]) : '—';
};

export function ProfileScreen({ profile, onOpen, onReload, loading, onSaveProfile, onCycleChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const p = profile || {};
  const l = p.lifestyle || {};
  const units = p.units || {};
  const setUnit = (k, v) => onSaveProfile({ ...p, units: { ...units, [k]: v } });
  const Toggle = ({ k, options }) => (
    <View style={s.toggle}>
      {options.map(([v, t]) => {
        const on = (units[k] || options[0][0]) === v;
        return (
          <Pressable key={v} onPress={() => setUnit(k, v)} style={[s.tItem, on && { backgroundColor: c.accent }]}>
            <Text style={[s.tText, { color: on ? c.onAccent : c.sub }]}>{t}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  const Link = ({ title, onPress, disabled }) => (
    <Pressable onPress={disabled ? undefined : onPress} style={({ pressed }) => [s.link, (pressed || disabled) && { opacity: 0.6 }]}>
      <Text style={s.linkText}>{title}</Text>
      <Text style={s.chev}>›</Text>
    </Pressable>
  );

  return (
    <Screen tab>
      <PageTitle>{tr('Профиль')}</PageTitle>
      <Card onPress={() => onOpen('setup')}>
        <CardHead title={tr('Обо мне')} right={tr('Изменить') + ' ›'} rightColor={c.accent} />
        <Row label={tr('Дата рождения')} value={p.birth ? p.birth.split('-').reverse().join('.') : '—'} />
        <Row label={tr('Пол')} value={p.sex === 'f' ? tr('Женский') : p.sex === 'm' ? tr('Мужской') : '—'} />
        <Row label={tr('Рост')} value={p.heightCm ? fmt(p.heightCm) + ' ' + tr('см') : '—'} />
        <Row label={tr('Вес')} value={p.weightKg ? fmt(p.weightKg, 1) + ' ' + tr('кг') : '—'} />
        <Row label={tr('Талия')} value={l.waistCm ? fmt(l.waistCm) + ' ' + tr('см') : '—'} />
        <Row label={tr('Курение')} value={label(SMOKING, l.smoking)} />
        <Row label={tr('Алкоголь')} value={l.alcoholUnits != null ? fmt(l.alcoholUnits) + ' ' + tr('порций/нед') : '—'} />
        <Row label={tr('Стресс')} value={l.stress ? l.stress + ' / 10' : '—'} />
        <Row label={tr('Цель')} value={label(GOALS, p.goal)} />
        <Row label={tr('Опыт тренировок')} value={label(EXPERIENCE, p.experience)} />
      </Card>

      {p.sex === 'f' ? (
        <Card>
          <CardHead title={tr('Менструальный цикл')} />
          <View style={s.switchRow}>
            <Text style={[s.linkText, { flex: 1 }]}>{tr('Показывать цикл на главном экране')}</Text>
            <Switch value={!!p.showCycle} onValueChange={(on) => onCycleChange({ showCycle: on })}
              trackColor={{ true: c.accent, false: c.raised }} thumbColor={c.text} />
          </View>
          {p.showCycle ? (
            <View style={s.toggle}>
              {CYCLE.map(([v, t]) => {
                const on = (l.cycle || 'tracking') === v;
                return (
                  <Pressable key={v} onPress={() => onCycleChange({ lifestyle: { ...l, cycle: v } })} style={[s.tItem, on && { backgroundColor: c.accent }]}>
                    <Text style={[s.tText, { color: on ? c.onAccent : c.sub }]} numberOfLines={1} adjustsFontSizeToFit>{tr(t)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {p.showCycle ? <T sub small>{tr('«Контрацепция» — гормональная: тогда прогноз овуляции не показывается.')}</T> : <T sub small>{tr('Включи, чтобы видеть фазу цикла, прогноз и календарь на главном экране. Советы коуча тоже будут учитывать цикл.')}</T>}
        </Card>
      ) : null}

      <Card>
        <CardHead title={tr('Единицы измерения')} />
        <Toggle k="mass" options={[['kg', tr('кг')], ['lb', 'lb']]} />
        <Toggle k="temp" options={[['c', '°C'], ['f', '°F']]} />
      </Card>

      <Card>
        <Link title={tr('Достижения')} onPress={() => onOpen('achievements')} />
        <Link title={tr('Записать вручную')} onPress={() => onOpen('log')} />
        <Link title={tr('Обновить данные')} onPress={onReload} disabled={loading} />
        <Link title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} />
        <Link title={tr('Импорт и резервная копия')} onPress={() => onOpen('import')} />
        <Link title={tr('О данных и источниках')} onPress={() => onOpen('about')} />
        <Link title={tr('Отладка')} onPress={() => onOpen('debug')} />
      </Card>
      <Disclaimer />
      <T sub small style={{ textAlign: 'center' }}>{tr('Версия')} {APP_VERSION} · {CHANGES}</T>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  toggle: { flexDirection: 'row', backgroundColor: c.raised, borderRadius: 12, padding: 3 },
  tItem: { flex: 1, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tText: { fontSize: SIZES.small + 1, fontWeight: '600' },
  link: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  linkText: { flex: 1, color: c.text, fontSize: SIZES.text },
  chev: { color: c.sub, fontSize: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
});
