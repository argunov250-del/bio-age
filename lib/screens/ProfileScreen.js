// Вкладка «Профиль» (та же гамма, что «Обзор»): данные о себе одной карточкой,
// единицы измерения и настройки.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, TextInput, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, PageTitle, Disclaimer, T } from '../ui';
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
      <View style={s.switchRow}>
        <Text style={[s.linkText, { flex: 1 }]}>{tr('Дождь, снег и облака как за окном')}</Text>
        <Switch value={on} onValueChange={(v) => set({ on: v })} trackColor={{ true: c.accent, false: c.raised }} thumbColor={c.text} />
      </View>
      {on ? (
        <>
          <T small>{current ? weatherIcon(current) + ' ' + (current.temp > 0 ? '+' : '') + current.temp + '° · ' + weatherLabel(current) + (current.place ? ', ' + current.place : '') : tr('Погода пока не получена — нужна связь с интернетом.')}</T>
          <T sub small>{w.city ? tr('Место: ') + w.city.name : tr('Место: по приблизительной геопозиции телефона')}</T>
          <View style={s.cityRow}>
            <TextInput value={city} onChangeText={setCity} placeholder={tr('Город, например Казань')} placeholderTextColor={c.sub} onSubmitEditing={find}
              style={[s.input, { color: c.text, backgroundColor: c.raised, borderColor: c.edge }]} />
            <Pressable onPress={find} style={({ pressed }) => [s.findBtn, { backgroundColor: c.accent }, pressed && { opacity: 0.7 }]}>
              <Text style={{ color: c.onAccent, fontWeight: '700' }}>{tr('Найти')}</Text>
            </Pressable>
          </View>
          {w.city ? <Pressable onPress={() => set({ city: null })} hitSlop={8}><Text style={{ color: c.accent, fontWeight: '600' }}>{tr('Определять по геопозиции')}</Text></Pressable> : null}
          {msg ? <T small style={{ color: c.warn }}>{msg}</T> : null}
        </>
      ) : null}
      <T sub small>{tr('В сервис погоды Open-Meteo уходят только приблизительные координаты (~10 км). Данные здоровья не покидают телефон.')}</T>
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
        <CardHead title={tr('Оформление и напоминания')} />
        {[
          ['ambience', tr('Небо по времени суток'), p.ambience !== 'day', (on) => onSettings({ ambience: on ? 'auto' : 'day' })],
          ['seasonFx', tr('Сезонные эффекты: снег, дождь, лепестки, светлячки'), p.seasonFx !== false, (on) => onSettings({ seasonFx: on })],
          ['haptics', tr('Вибрация'), p.haptics !== false, (on) => onSettings({ haptics: on })],
          ['lite', tr('Облегчённые анимации (для старых телефонов)'), p.lite == null ? !!oldAndroid : p.lite, (on) => onSettings({ lite: on })],
          ['remindSleep', tr('Напоминание о сне в ') + bedtimeLabel(dataset), !!p.remindSleep, (on) => onSettings({ remindSleep: on })],
          ['remindMorning', tr('Утреннее напоминание в 08:30'), !!p.remindMorning, (on) => onSettings({ remindMorning: on })],
        ].map(([k, label, on, set]) => (
          <View key={k} style={s.switchRow}>
            <Text style={[s.linkText, { flex: 1 }]}>{label}</Text>
            <Switch value={on} onValueChange={set} trackColor={{ true: c.accent, false: c.raised }} thumbColor={c.text} />
          </View>
        ))}
      </Card>

      <WeatherCard c={c} s={s} w={p.weather} current={weather} onWeather={onWeather} />

      <Card>
        <CardHead title={tr('Единицы измерения')} />
        <Toggle k="mass" options={[['kg', tr('кг')], ['lb', 'lb']]} />
        <Toggle k="temp" options={[['c', '°C'], ['f', '°F']]} />
      </Card>

      <Card>
        <Link title={tr('Достижения')} onPress={() => onOpen('achievements')} />
        <Link title={tr('Итоги недели')} onPress={() => onOpen('recap')} />
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
  cityRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 44, borderRadius: SIZES.radiusSmall, borderWidth: 1, paddingHorizontal: 12, fontSize: SIZES.text - 1 },
  findBtn: { height: 44, borderRadius: SIZES.radiusSmall, paddingHorizontal: 16, justifyContent: 'center' },
});
