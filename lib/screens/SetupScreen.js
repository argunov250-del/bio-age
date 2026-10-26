// Ввод даты рождения, пола и роста.
import React, { useState } from 'react';
import { TextInput, View, StyleSheet } from 'react-native';
import { Screen, Card, T, Button, Disclaimer } from '../ui';
import { COLORS, SIZES } from '../theme';
import { tr } from '../i18n';

const pad = (n) => (n < 10 ? '0' : '') + n;
const toInput = (iso) => (iso ? iso.split('-').reverse().join('.') : '');

function parseDate(s) {
  const m = /^\s*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\s*$/.exec(s);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const age = (Date.now() - dt) / (365.2425 * 86400000);
  if (age < 18 || age > 100) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
}

export function SetupScreen({ profile, onSave, onBack }) {
  const [date, setDate] = useState(toInput(profile && profile.birth));
  const [sex, setSex] = useState((profile && profile.sex) || null);
  const [height, setHeight] = useState(profile && profile.heightCm ? String(profile.heightCm) : '');
  const [err, setErr] = useState('');

  const save = () => {
    const birth = parseDate(date);
    if (!birth) return setErr(tr('Введите дату рождения в формате ДД.ММ.ГГГГ (возраст 18–100 лет)'));
    if (!sex) return setErr(tr('Выберите пол'));
    const h = height.trim() ? Number(height.replace(',', '.')) : null;
    if (h != null && !(h >= 120 && h <= 230)) return setErr(tr('Рост — число от 120 до 230 см'));
    onSave({ birth, sex, heightCm: h });
  };

  return (
    <Screen title={tr('Профиль')} onBack={onBack}>
      <T sub>{tr('Нужны для расчёта. Хранятся только на телефоне.')}</T>
      <Card>
        <T>{tr('Дата рождения')}</T>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholder={tr('ДД.ММ.ГГГГ')} placeholderTextColor={COLORS.sub} keyboardType="numbers-and-punctuation" />
        <T>{tr('Пол')}</T>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Button title={tr('Мужской')} secondary={sex !== 'm'} onPress={() => setSex('m')} /></View>
          <View style={{ flex: 1 }}><Button title={tr('Женский')} secondary={sex !== 'f'} onPress={() => setSex('f')} /></View>
        </View>
        <T>{tr('Рост, см')}</T>
        <TextInput style={s.input} value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor={COLORS.sub} keyboardType="numeric" />
        <T sub small>{tr('Рост нужен для индекса безжировой массы. Можно оставить пустым.')}</T>
      </Card>
      {err ? <T style={{ color: COLORS.bad }}>{err}</T> : null}
      <Button title={tr('Сохранить')} onPress={save} />
      <Disclaimer />
    </Screen>
  );
}

const s = StyleSheet.create({
  input: { height: SIZES.button, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.line, color: COLORS.text, fontSize: SIZES.text, paddingHorizontal: SIZES.gap, marginBottom: 6 },
  row: { flexDirection: 'row', gap: SIZES.gap, marginBottom: 6 },
});
