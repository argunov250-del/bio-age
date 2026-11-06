// Вкладка «Профиль» (та же гамма, что «Обзор»): данные о себе одной карточкой,
// единицы измерения и настройки.
import React, { useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, Image, StyleSheet, ToastAndroid, Alert, Platform } from 'react-native';
import { Screen, Card, Section, PageTitle, Disclaimer, Note, Body, Segmented, SwitchRow, ListItem } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { fit } from '../fit';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';
import { GOALS, EXPERIENCE, SMOKING, CYCLE } from './SetupScreen';
import { bedtimeLabel } from '../reminders';
import { findCity, weatherIcon, weatherLabel } from '../weather';
import { clearCoachMemory } from '../coach/store';
import { ICONS, normalizeIcon, iconSupported } from '../appIcon';

// Файлы значков копирует CI (assets/icons рядом с lib/), Metro собирает их статически.
const ICON_PREVIEW = {
  A: require('../../assets/icons/A-light-icon.png'),
  B: require('../../assets/icons/B-light-icon.png'),
  C: require('../../assets/icons/C-light-icon.png'),
  D: require('../../assets/icons/D-light-icon.png'),
};

function Link({ title, onPress, disabled, first }) {
  const c = useColors();
  return (
    <ListItem first={first} onPress={disabled ? undefined : onPress}>
      <Text {...fit(2, 0.8)} style={{ color: c.text, fontSize: SIZES.text, flex: 1, opacity: disabled ? 0.5 : 1 }}>{title}</Text>
      <Text style={{ color: c.sub, fontSize: 20 }}>›</Text>
    </ListItem>
  );
}

function Line({ label, value, first }) {
  const c = useColors();
  return (
    <ListItem first={first}>
      <Text {...fit(2, 0.8)} style={{ color: c.sub, fontSize: SIZES.text, flex: 1 }}>{label}</Text>
      <Text {...fit(1, 0.7)} style={{ color: c.text, fontSize: SIZES.text, fontWeight: '600', flexShrink: 1, maxWidth: '55%' }}>{value}</Text>
    </ListItem>
  );
}

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
    <>
    <Section>{tr('Погода')}</Section>
    <Card>
      <SwitchRow label={tr('Дождь, снег и облака как за окном')} value={on} onChange={(v) => set({ on: v })} />
      {on ? (
        <>
          <Body>{current ? weatherIcon(current) + ' ' + (current.temp > 0 ? '+' : '') + current.temp + '° · ' + weatherLabel(current) + (current.place ? ', ' + current.place : '') : tr('Погоды пока нет — нужен интернет.')}</Body>
          <Note>{w.city ? tr('Место: ') + w.city.name : tr('Место: по геопозиции телефона')}</Note>
          <View style={s.cityRow}>
            <TextInput value={city} onChangeText={setCity} placeholder={tr('Город, например Казань')} placeholderTextColor={c.sub} onSubmitEditing={find}
              style={[s.input, { color: c.text, backgroundColor: c.cardAlt }]} />
            <Pressable onPress={find} style={({ pressed }) => [s.findBtn, { backgroundColor: c.primary }, pressed && { opacity: 0.7 }]}>
              <Text style={[s.findText, { color: c.onPrimary }]}>{tr('Найти')}</Text>
            </Pressable>
          </View>
          {w.city ? <Pressable onPress={() => set({ city: null })} hitSlop={8}><Text style={[s.action, { color: c.text }]}>{tr('Определять по геопозиции')}</Text></Pressable> : null}
          {msg ? <Note style={{ color: c.warn }}>{msg}</Note> : null}
        </>
      ) : null}
      <Note>{tr('В Open-Meteo уходят только примерные координаты (~10 км). Данные здоровья остаются на телефоне.')}</Note>
    </Card>
    </>
  );
}

// Вода: синхронизация с Health Connect (Hydration) — по желанию, разрешения только по включению.
function WaterSyncCard({ on, water, onSettings }) {
  const [msg, setMsg] = useState('');
  const toggle = async (v) => {
    setMsg('');
    if (!v) { onSettings({ waterSync: false }); return; }
    let perms = { read: false, write: false };
    try { perms = water && water.askSync ? await water.askSync() : perms; } catch (e) { /* без доступа */ }
    if (perms.read || perms.write) onSettings({ waterSync: true });
    else { onSettings({ waterSync: false }); setMsg(tr('Доступ к воде в Health Connect не выдан. Вода продолжит считаться на телефоне.')); }
  };
  return (
    <>
      <Section>{tr('Вода')}</Section>
      <Card>
        <SwitchRow label={tr('Синхронизировать воду с Health Connect')} value={!!on} onChange={toggle} />
        {msg ? <Note>{msg}</Note> : <Note>{tr('По желанию. Без синхронизации вода считается только на телефоне.')}</Note>}
      </Card>
    </>
  );
}

export function ProfileScreen({ water, profile, onOpen, onReload, loading, onSaveProfile, onCycleChange, onSettings, dataset, oldAndroid, weather, onWeather, devMode, onDevUnlock }) {
  const c = useColors();
  const taps = useRef([]);
  const onVersionTap = () => {
    if (devMode) return;
    const now = Date.now();
    taps.current = taps.current.filter((t) => now - t < 3000).concat(now);
    if (taps.current.length >= 7) {
      taps.current = [];
      onDevUnlock();
      if (Platform.OS === 'android') ToastAndroid.show(tr('Режим разработчика включён'), ToastAndroid.SHORT);
      else Alert.alert(tr('Режим разработчика включён'));
    }
  };
  const s = useMemo(() => makeStyles(c), [c]);
  const p = profile || {};
  const l = p.lifestyle || {};
  const units = p.units || {};
  const setUnit = (k, v) => onSaveProfile({ ...p, units: { ...units, [k]: v } });
  const unitSwitch = (k, options) => <Segmented options={options} value={units[k] || options[0][0]} onChange={(v) => setUnit(k, v)} />;

  return (
    <Screen tab>
      <PageTitle>{tr('Профиль')}</PageTitle>
      <Section right={tr('Изменить') + ' ›'} onRight={() => onOpen('setup')}>{tr('Обо мне')}</Section>
      <Card onPress={() => onOpen('setup')}>
        <Line first label={tr('Дата рождения')} value={p.birth ? p.birth.split('-').reverse().join('.') : '—'} />
        <Line label={tr('Пол')} value={p.sex === 'f' ? tr('Женский') : p.sex === 'm' ? tr('Мужской') : '—'} />
        <Line label={tr('Рост')} value={p.heightCm ? fmt(p.heightCm) + ' ' + tr('см') : '—'} />
        <Line label={tr('Вес')} value={p.weightKg ? fmt(p.weightKg, 1) + ' ' + tr('кг') : '—'} />
        <Line label={tr('Талия')} value={l.waistCm ? fmt(l.waistCm) + ' ' + tr('см') : '—'} />
        <Line label={tr('Курение')} value={label(SMOKING, l.smoking)} />
        <Line label={tr('Алкоголь')} value={l.alcoholUnits != null ? fmt(l.alcoholUnits) + ' ' + tr('порций/нед') : '—'} />
        <Line label={tr('Стресс')} value={l.stress ? l.stress + ' / 10' : '—'} />
        <Line label={tr('Цель')} value={label(GOALS, p.goal)} />
        <Line label={tr('Опыт тренировок')} value={label(EXPERIENCE, p.experience)} />
      </Card>

      {p.sex === 'f' ? (
        <>
        <Section>{tr('Менструальный цикл')}</Section>
        <Card>
          <SwitchRow label={tr('Показывать цикл на главном экране')} value={!!p.showCycle} onChange={(on) => onCycleChange({ showCycle: on })} />
          {p.showCycle ? (
            <Segmented options={CYCLE.map(([v, t]) => [v, tr(t)])} value={l.cycle || 'tracking'} onChange={(v) => onCycleChange({ lifestyle: { ...l, cycle: v } })} />
          ) : null}
          <Note>{p.showCycle ? tr('При гормональной контрацепции прогноз овуляции скрыт.') : tr('Фаза, прогноз и календарь на главном экране. Коуч будет учитывать цикл.')}</Note>
        </Card>
        </>
      ) : null}

      <Section>{tr('Тема')}</Section>
      <Segmented options={[['auto', tr('Авто')], ['light', tr('Светлая')], ['dark', tr('Тёмная')]]} value={p.theme === 'dark' || p.theme === 'light' ? p.theme : 'auto'} onChange={(v) => onSettings({ theme: v })} />


      <Section>{tr('Язык')}</Section>
      <Segmented options={[['auto', tr('Авто')], ['ru', 'Русский'], ['en', 'English']]} value={p.lang || 'auto'} onChange={(v) => onSettings({ lang: v })} />


      <Section>{tr('Оформление и напоминания')}</Section>
      <Card>
        {[
          ['ambience', tr('Небо по времени суток'), p.ambience !== 'day', (on) => onSettings({ ambience: on ? 'auto' : 'day' })],
          ['seasonFx', tr('Сезонные эффекты: снег, дождь, лепестки, светлячки'), p.seasonFx !== false, (on) => onSettings({ seasonFx: on })],
          ['haptics', tr('Вибрация'), p.haptics !== false, (on) => onSettings({ haptics: on })],
          ['lite', tr('Облегчённые анимации (для старых телефонов)'), p.lite == null ? !!oldAndroid : p.lite, (on) => onSettings({ lite: on })],
          ['remindSleep', tr('Напоминание о сне в ') + bedtimeLabel(dataset, p), !!p.remindSleep, (on) => onSettings({ remindSleep: on })],
          ['notifyGoals', tr('Уведомления о целях'), p.notifyGoals !== false, (on) => onSettings({ notifyGoals: on })],
          ['remindMorning', tr('Утреннее напоминание в 08:30'), !!p.remindMorning, (on) => onSettings({ remindMorning: on })],
        ].map(([k, text, on, set]) => <SwitchRow key={k} label={text} value={on} onChange={set} />)}
        <Segmented options={[['off', tr('Без шуток')], ['balanced', tr('В меру')], ['playful', tr('Побольше')]]} value={p.coachTone || 'balanced'} onChange={(v) => onSettings({ coachTone: v })} />
        <Note>{tr('Юмор Хирона: сколько шуток в ответах.')}</Note>
        <Link title={tr('Очистить память Хирона')} onPress={() => { clearCoachMemory(); if (Platform.OS === 'android') ToastAndroid.show(tr('Память Хирона очищена'), ToastAndroid.SHORT); }} />
      </Card>

      {iconSupported() ? (
        <>
        <Section>{tr('Значок приложения')}</Section>
        <Card>
          <View style={s.iconRow}>
            {ICONS.map((id) => {
              const on = normalizeIcon(p.appIcon) === id;
              return (
                <Pressable key={id} onPress={() => onSettings({ appIcon: id })} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={tr('Значок приложения') + ' ' + id} style={[s.iconBtn, { borderColor: on ? c.accent : 'transparent' }]}>
                  <Image source={ICON_PREVIEW[id]} style={s.iconImg} />
                </Pressable>
              );
            })}
          </View>
          <Note>{tr('Значок меняется вместе с системной темой; смена может занять несколько секунд, на некоторых телефонах приложение перезапустится.')}</Note>
        </Card>
        </>
      ) : null}

      <WeatherCard c={c} s={s} w={p.weather} current={weather} onWeather={onWeather} />

      <WaterSyncCard on={p.waterSync} water={water} onSettings={onSettings} />

      <Section>{tr('Единицы измерения')}</Section>
      {unitSwitch('mass', [['kg', tr('кг')], ['lb', 'lb']])}
      {unitSwitch('temp', [['c', '°C'], ['f', '°F']])}

      <Section>{tr('Разделы')}</Section>
      <Card>
        <Link first title={tr('Достижения')} onPress={() => onOpen('achievements')} />
        <Link title={tr('Итоги недели')} onPress={() => onOpen('recap')} />
        <Link title={tr('Режим сна')} onPress={() => onOpen('sleep')} />
        <Link title={tr('Записать вручную')} onPress={() => onOpen('log')} />
        <Link title={tr('Обновить данные')} onPress={onReload} disabled={loading} />
        <Link title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} />
        <Link title={tr('Импорт и резервная копия')} onPress={() => onOpen('import')} />
        <Link title={tr('О данных и источниках')} onPress={() => onOpen('about')} />
        {devMode ? <Link title={tr('Отладка')} onPress={() => onOpen('debug')} /> : null}
      </Card>
      <Disclaimer />
      <Pressable onPress={onVersionTap}>
        <Note center>{tr('Версия')} {APP_VERSION} · {CHANGES}</Note>
      </Pressable>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  cityRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: SIZES.field - 2, borderRadius: 999, borderWidth: 0, paddingHorizontal: SIZES.gap, fontSize: SIZES.text - 1 },
  findBtn: { height: SIZES.field - 2, borderRadius: 999, paddingHorizontal: SIZES.pad, justifyContent: 'center' },
  findText: { fontWeight: '700' },
  iconRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  iconBtn: { flex: 1, aspectRatio: 1, maxWidth: 76, borderRadius: 20, borderWidth: 2, padding: 2 },
  iconImg: { width: '100%', height: '100%', borderRadius: 16 },
  action: { fontSize: SIZES.body, fontWeight: '600' },
});
