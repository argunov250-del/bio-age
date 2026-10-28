// «Записать вручную»: сон, шаги, вес, давление, пульс покоя, тренировка, месячные. Записи
// хранятся на телефоне и сразу участвуют во всех расчётах наравне с Health Connect.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, T, Button } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { MASS, unitsOf } from '../units';
import { WORKOUT_TYPES, INTENSITY } from '../manual';
import { workoutName } from '../workouts';

const pad = (n) => (n < 10 ? '0' : '') + n;
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const showDay = (iso) => iso.split('-').reverse().join('.');
const num = (x) => (String(x).trim() ? Number(String(x).replace(',', '.')) : null);

function parseDay(text) {
  const m = /^\s*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\s*$/.exec(text);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1], 12);
  if (d.getDate() !== +m[1] || d.getTime() > Date.now() + 12 * 3600000) return null;
  return isoDay(d);
}
function parseTime(text) {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*$/.exec(text);
  if (!m || +m[1] > 23 || +m[2] > 59) return null;
  return [+m[1], +m[2]];
}
const at = (iso, [h, mi]) => {
  const [y, mo, d] = iso.split('-').map(Number);
  return new Date(y, mo - 1, d, h, mi).getTime();
};

const TYPES = [
  ['sleep', 'Сон'], ['steps', 'Шаги'], ['weight', 'Вес'], ['bp', 'Давление'], ['rhr', 'Пульс покоя'], ['workout', 'Тренировка'],
];
const PERIOD = ['period', 'Месячные']; // только если в профиле включён цикл

function Chips({ options, value, onChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.chips}>
      {options.map(([v, l]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} style={[s.chip, v === value && { backgroundColor: c.accent }]}>
          <Text style={[s.chipText, { color: v === value ? c.onAccent : c.sub }]}>{tr(l)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, numeric }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} value={value} onChangeText={onChange} placeholder={placeholder || '—'} placeholderTextColor={c.sub}
        keyboardType={numeric ? 'decimal-pad' : 'numbers-and-punctuation'} />
    </View>
  );
}

// Короткое описание записи для списка.
export function entryText(e, profile) {
  const mass = MASS[unitsOf(profile).mass];
  const time = (t) => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
  switch (e.type) {
    case 'sleep': return tr('Сон') + ' ' + time(e.start) + '–' + time(e.end);
    case 'steps': return fmt(e.steps) + ' ' + tr('шагов');
    case 'weight': return fmt(mass.from(e.kg), 1) + ' ' + tr(mass.label);
    case 'bp': return tr('Давление') + ' ' + e.sys + '/' + e.dia;
    case 'rhr': return tr('Пульс покоя') + ' ' + e.bpm;
    case 'workout': return workoutName(e.workout) + ', ' + fmt((e.end - e.start) / 60000) + ' ' + tr('мин');
    case 'period': return tr('Месячные') + ', ' + e.days + ' ' + tr('дн.');
    default: return '';
  }
}

export function LogScreen({ entries, profile, initialType, onSave, onDelete, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const mass = MASS[unitsOf(profile).mass];
  const [type, setType] = useState(initialType || 'sleep');
  const [day, setDay] = useState(showDay(isoDay(new Date())));
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [workout, setWorkout] = useState(79);
  const [intensity, setIntensity] = useState('medium');
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');

  const switchType = (t) => { setType(t); setA(''); setB(''); setErr(''); setSaved(''); };

  const save = () => {
    setSaved('');
    const date = parseDay(day);
    if (!date) return setErr(tr('Дата — в формате ДД.ММ.ГГГГ и не в будущем'));
    const noon = at(date, [12, 0]);
    const now = new Date();
    const e = { id: String(Date.now()), type, date, t: noon };
    if (type === 'sleep') {
      const bed = parseTime(a), wake = parseTime(b);
      if (!bed || !wake) return setErr(tr('Время — в формате ЧЧ:ММ, например 23:30 и 07:10'));
      let start = at(date, bed);
      const end = at(date, wake);
      if (start >= end) start -= 86400000; // лёг накануне вечером
      const h = (end - start) / 3600000;
      if (h < 1 || h > 16) return setErr(tr('Сон — от 1 до 16 часов'));
      Object.assign(e, { start, end, t: end });
    } else if (type === 'steps') {
      const n = num(a);
      if (!(n >= 0 && n <= 100000)) return setErr(tr('Шаги — число от 0 до 100 000'));
      e.steps = Math.round(n);
    } else if (type === 'weight') {
      const n = num(a);
      const kg = n == null ? null : mass.to(n);
      if (!(kg >= 25 && kg <= 350)) return setErr(tr('Вес — число от 25 до 350 кг'));
      Object.assign(e, { kg, t: date === isoDay(now) ? now.getTime() : noon });
    } else if (type === 'bp') {
      const sys = num(a), dia = num(b);
      if (!(sys >= 60 && sys <= 260) || !(dia >= 30 && dia <= 160) || dia >= sys) return setErr(tr('Давление — верхнее 60–260, нижнее 30–160'));
      Object.assign(e, { sys, dia, t: date === isoDay(now) ? now.getTime() : noon });
    } else if (type === 'rhr') {
      const n = num(a);
      if (!(n >= 25 && n <= 130)) return setErr(tr('Пульс покоя — число от 25 до 130'));
      e.bpm = n;
    } else if (type === 'period') {
      const n = num(a) == null ? 5 : num(a);
      if (!(n >= 1 && n <= 14)) return setErr(tr('Длительность месячных — от 1 до 14 дней'));
      e.days = Math.round(n);
    } else if (type === 'workout') {
      const dur = num(a);
      if (!(dur >= 5 && dur <= 600)) return setErr(tr('Длительность — от 5 до 600 минут'));
      const st = parseTime(b) || [18, 0];
      const start = at(date, st);
      Object.assign(e, { workout, intensity, start, end: start + dur * 60000, t: start });
    }
    setErr('');
    setA('');
    setB('');
    setSaved(tr('Сохранено. Расчёты обновятся через пару секунд.'));
    onSave(e);
  };

  const recent = [...entries].sort((x, y) => y.t - x.t).slice(0, 15);
  return (
    <Screen title={tr('Записать вручную')} onBack={onBack}>
      <T sub small>{tr('Если данных из устройств нет — запиши сам. Записи хранятся на телефоне и учитываются во всех расчётах. Если за тот же день есть данные из Health Connect, они важнее.')}</T>
      <Card>
        <Chips options={profile && profile.sex === 'f' && profile.showCycle ? [...TYPES, PERIOD] : TYPES} value={type} onChange={switchType} />
        <View style={s.row}>
          <Field label={type === 'sleep' ? tr('Дата пробуждения') : type === 'period' ? tr('Первый день') : tr('Дата')} value={day} onChange={setDay} placeholder={tr('ДД.ММ.ГГГГ')} />
        </View>
        {type === 'sleep' ? (
          <View style={s.row}>
            <Field label={tr('Лёг(ла) в')} value={a} onChange={setA} placeholder="23:30" />
            <Field label={tr('Встал(а) в')} value={b} onChange={setB} placeholder="07:10" />
          </View>
        ) : type === 'steps' ? (
          <View style={s.row}><Field label={tr('Шагов за день')} value={a} onChange={setA} placeholder="8000" numeric /></View>
        ) : type === 'weight' ? (
          <View style={s.row}><Field label={tr('Вес, ') + tr(mass.label)} value={a} onChange={setA} numeric /></View>
        ) : type === 'bp' ? (
          <View style={s.row}>
            <Field label={tr('Верхнее')} value={a} onChange={setA} placeholder="120" numeric />
            <Field label={tr('Нижнее')} value={b} onChange={setB} placeholder="80" numeric />
          </View>
        ) : type === 'period' ? (
          <View style={s.row}><Field label={tr('Сколько дней длились')} value={a} onChange={setA} placeholder="5" numeric /></View>
        ) : type === 'rhr' ? (
          <View style={s.row}><Field label={tr('Пульс в покое, уд/мин')} value={a} onChange={setA} placeholder="60" numeric /></View>
        ) : (
          <>
            <Text style={s.label}>{tr('Вид')}</Text>
            <Chips options={WORKOUT_TYPES} value={workout} onChange={setWorkout} />
            <Text style={s.label}>{tr('Интенсивность')}</Text>
            <Chips options={INTENSITY.map(([k, l]) => [k, l])} value={intensity} onChange={setIntensity} />
            <View style={s.row}>
              <Field label={tr('Длительность, мин')} value={a} onChange={setA} placeholder="45" numeric />
              <Field label={tr('Начало')} value={b} onChange={setB} placeholder="18:00" />
            </View>
          </>
        )}
        {err ? <T small style={{ color: c.bad }}>{err}</T> : null}
        {saved ? <T small style={{ color: c.good }}>{saved}</T> : null}
        <Button title={tr('Сохранить')} onPress={save} />
      </Card>

      {recent.length ? (
        <Card>
          <CardHead title={tr('Мои записи')} />
          {recent.map((e) => (
            <View key={e.id} style={s.item}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemText}>{entryText(e, profile)}</Text>
                <Text style={s.itemSub}>{showDay(e.date)}</Text>
              </View>
              <Pressable onPress={() => onDelete(e)} hitSlop={10}>
                <Text style={[s.del, { color: c.bad }]}>{tr('Удалить')}</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  row: { flexDirection: 'row', gap: SIZES.gap },
  label: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '500' },
  input: { height: 46, borderRadius: SIZES.radiusSmall, borderWidth: 1, borderColor: c.line, color: c.text, fontSize: SIZES.text, paddingHorizontal: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: SIZES.small + 1, fontWeight: '600' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.edge },
  itemText: { color: c.text, fontSize: SIZES.text - 1 },
  itemSub: { color: c.sub, fontSize: SIZES.small },
  del: { fontSize: SIZES.small + 1, fontWeight: '600' },
});
