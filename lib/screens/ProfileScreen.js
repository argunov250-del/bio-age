// Вкладка «Профиль» (та же гамма, что «Обзор»): данные о себе одной карточкой,
// единицы измерения и настройки.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, PageTitle, Disclaimer, Note, Body, Segmented, SwitchRow, LinkRow } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';
import { GOALS, EXPERIENCE, SMOKING, CYCLE } from './SetupScreen';
import { bedtimeLabel } from '../reminders';
import { findCity, weatherIcon, weatherLabel } from '../weather';

const label = (list, v) => {
  const x = list.find(([k]) => k === v);
  return x ? tr(x[1]) : '—';
};

// Погода: переключатель, город или геопозиция. Интернет — только для неё.
function WeatherCard({ c, s, w, current, onWeather }) {
  const [city, setCity] = useState('');
  const [msg, setMsg] = useState('');
  const set = (patch) => onWeather({ ...(w || {}), ...patch });
  const find = async () => {
    if (!city.trim()) return;
    setMsg(tr('Ищу…'));
    try {
      const found = await findCity(city);
      if (!found) return setMsg(tr('Город не найден'));
      setMsg('');
      setCity('');
      set({ on: true, city: found });
    } catch (e) {
      setMsg(tr('Нет связи с интернетом'));
    }
  };
  const on = !!(w && w.on);
  return (
    <Card>
      <CardHead title={tr('Погода')} />
      <SwitchRow label={tr('Дождь, снег и облака как за окном')} value={on} onChange={(v) => set({ on: v })} />
      {on ? (
        <>
          <Body>{current ? weatherIcon(current) + ' ' + (current.temp > 0 ? '+' : '') + current.temp + '° · ' + weatherLabel(current) + (current.place ? ', ' + current.place : '') : tr('Погоды пока нет — нужен интернет.')}</Body>
          <Note>{w.city ? tr('Место: ') + w.city.name : tr('Место: по геопозиции телефона')}</Note>
          <View style={s.cityRow}>
            <TextInput value={city} onChangeText={setCity} placeholder={tr('Город, например Казань')} placeholderTextColor={c.sub} onSubmitEditing={find}
              style={[s.input, { color: c.text, backgroundColor: c.raised, borderColor: c.edge }]} />
            <Pressable onPress={find} style={({ pressed }) => [s.findBtn, { backgroundColor: c.accent }, pressed && { opacity: 0.7 }]}>
              <Text style={[s.findText, { color: c.onAccent }]}>{tr('Найти')}</Text>
            </Pressable>
          </View>
          {w.city ? <Pressable onPress={() => set({ city: null })} hitSlop={8}><Text style={[s.action, { color: c.accent }]}>{tr('Определять по геопозиции')}</Text></Pressable> : null}
          {msg ? <Note style={{ color: c.warn }}>{msg}</Note> : null}
        </>
      ) : null}
      <Note>{tr('В Open-Meteo уходят только примерные координаты (~10 км). Данные здоровья остаются на телефоне.')}</Note>
    </Card>
  );
}

export function ProfileScreen({ profile, onOpen, onReload, loading, onSaveProfile, onCycleChange, onSettings, dataset, oldAndroid, weather, onWeather }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const p = profile || {};
  const l = p.lifestyle || {};
  const units = p.units || {};
  const setUnit = (k, v) => onSaveProfile({ ...p, units: { ...units, [k]: v } });
  const unitSwitch = (k, options) => <Segmented options={options} value={units[k] || options[0][0]} onChange={(v) => setUnit(k, v)} />;

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
          <SwitchRow label={tr('Показывать цикл на главном экране')} value={!!p.showCycle} onChange={(on) => onCycleChange({ showCycle: on })} />
          {p.showCycle ? (
            <Segmented options={CYCLE.map(([v, t]) => [v, tr(t)])} value={l.cycle || 'tracking'} onChange={(v) => onCycleChange({ lifestyle: { ...l, cycle: v } })} />
          ) : null}
          <Note>{p.showCycle ? tr('При гормональной контрацепции прогноз овуляции скрыт.') : tr('Фаза, прогноз и календарь на главном экране. Коуч будет учитывать цикл.')}</Note>
        </Card>
      ) : null}

      <Card>
        <CardHead title={tr('Оформление и напоминания')} />
        {[
          ['ambience', tr('Небо по времени суток'), p.ambience !== 'day', (on) => onSettings({ ambience: on ? 'auto' : 'day' })],
          ['seasonFx', tr('Сезонные эффекты: снег, дождь, лепестки, светлячки'), p.seasonFx !== false, (on) => onSettings({ seasonFx: on })],
          ['haptics', tr('Вибрация'), p.haptics !== false, (on) => onSettings({ haptics: on })],
          ['lite', tr('Облегчённые анимации (для старых телефонов)'), p.lite == null ? !!oldAndroid : p.lite, (on) => onSettings({ lite: on })],
          ['remindSleep', tr('Напоминание о сне в ') + bedtimeLabel(dataset), !!p.remindSleep, (on) => onSettings({ remindSleep: on })],
          ['remindMorning', tr('Утреннее напоминание в 08:30'), !!p.remindMorning, (on) => onSettings({ remindMorning: on })],
        ].map(([k, text, on, set]) => <SwitchRow key={k} label={text} value={on} onChange={set} />)}
      </Card>

      <WeatherCard c={c} s={s} w={p.weather} current={weather} onWeather={onWeather} />

      <Card>
        <CardHead title={tr('Единицы измерения')} />
        {unitSwitch('mass', [['kg', tr('кг')], ['lb', 'lb']])}
        {unitSwitch('temp', [['c', '°C'], ['f', '°F']])}
      </Card>

      <Card>
        <LinkRow title={tr('Достижения')} onPress={() => onOpen('achievements')} />
        <LinkRow title={tr('Итоги недели')} onPress={() => onOpen('recap')} />
        <LinkRow title={tr('Записать вручную')} onPress={() => onOpen('log')} />
        <LinkRow title={tr('Обновить данные')} onPress={onReload} disabled={loading} />
        <LinkRow title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} />
        <LinkRow title={tr('Импорт и резервная копия')} onPress={() => onOpen('import')} />
        <LinkRow title={tr('О данных и источниках')} onPress={() => onOpen('about')} />
        <LinkRow title={tr('Отладка')} onPress={() => onOpen('debug')} />
      </Card>
      <Disclaimer />
      <Note center>{tr('Версия')} {APP_VERSION} · {CHANGES}</Note>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  cityRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: SIZES.field - 2, borderRadius: SIZES.radiusSmall, borderWidth: 1, paddingHorizontal: SIZES.gap, fontSize: SIZES.text - 1 },
  findBtn: { height: SIZES.field - 2, borderRadius: SIZES.radiusSmall, paddingHorizontal: SIZES.pad, justifyContent: 'center' },
  findText: { fontWeight: '700' },
  action: { fontSize: SIZES.body, fontWeight: '600' },
});
