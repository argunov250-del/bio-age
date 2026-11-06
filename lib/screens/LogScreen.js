// «Записать вручную»: сон, шаги, вес, давление, пульс покоя, тренировка, месячные. Записи
// хранятся на телефоне и сразу участвуют во всех расчётах наравне с Health Connect.
import { fit } from '../fit';
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, Section, Note, Msg, Button, Chips, Field, FieldRow, Label, SwitchRow, ListItem } from '../ui';
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

// Режим сна: «ложусь в» и «встаю в». Ночь записывается сама (lib/sleepPlan.js).
function PlanCard({ plan, onSave }) {
  const [on, setOn] = useState(plan ? !!plan.on : true);
  const [bed, setBed] = useState((plan && plan.bed) || '23:00');
  const [wake, setWake] = useState((plan && plan.wake) || '07:00');
  const [msg, setMsg] = useState('');
  const save = () => {
    const b = parseTime(bed), w = parseTime(wake);
    if (!b || !w) return setMsg(tr('Время — в формате ЧЧ:ММ, например 23:00 и 07:00'));
    const fmt2 = ([h, m]) => pad(h) + ':' + pad(m);
    onSave({ ...(plan || {}), on, mode: 'manual', bed: fmt2(b), wake: fmt2(w), since: plan && plan.on && plan.since ? plan.since : Date.now() });
    setMsg(on ? tr('Готово. Сон будет записываться сам каждую ночь.') : tr('Автоматическая запись сна выключена.'));
  };
  return (
    <>
    <Section>{tr('Режим сна')}</Section>
    <Card>
      <SwitchRow label={tr('Записывать сон автоматически')} value={on} onChange={setOn} />
      <FieldRow>
        <Field half label={tr('Ложусь в')} value={bed} onChange={setBed} placeholder="23:00" keyboard="numbers-and-punctuation" />
        <Field half label={tr('Встаю в')} value={wake} onChange={setWake} placeholder="07:00" keyboard="numbers-and-punctuation" />
      </FieldRow>
      <Note>{tr('Сон записывается сам: с отбоя до подъёма. Откроешь приложение ночью — запись остановится. Данные часов из Health Connect важнее.')}</Note>
      <Msg>{msg}</Msg>
      <Button title={tr('Сохранить режим сна')} onPress={save} />
    </Card>
    </>
  );
}

export function LogScreen({ entries, profile, initialType, onSave, onDelete, onBack, plan, onSavePlan }) {
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
      const st = b.trim() ? parseTime(b) : [18, 0];
      if (!st) return setErr(tr('Время — в формате ЧЧ:ММ, например 18:00'));
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
      <Note>{tr('Записи хранятся на телефоне и входят во все расчёты. Если за день есть данные из Health Connect, берутся они.')}</Note>
      {type === 'sleep' && onSavePlan ? <PlanCard plan={plan} onSave={onSavePlan} /> : null}
      <Card>
        <Chips options={profile && profile.sex === 'f' && profile.showCycle ? [...TYPES, PERIOD] : TYPES} value={type} onChange={switchType} />
        {type === 'sleep' ? <Note>{tr('Или запиши конкретную ночь')}</Note> : null}
        <Field label={type === 'sleep' ? tr('Дата пробуждения') : type === 'period' ? tr('Первый день') : tr('Дата')} value={day} onChange={setDay} placeholder={tr('ДД.ММ.ГГГГ')} keyboard="numbers-and-punctuation" />
        {type === 'sleep' ? (
          <FieldRow>
            <Field half label={tr('Лёг(ла) в')} value={a} onChange={setA} placeholder="23:30" keyboard="numbers-and-punctuation" />
            <Field half label={tr('Встал(а) в')} value={b} onChange={setB} placeholder="07:10" keyboard="numbers-and-punctuation" />
          </FieldRow>
        ) : type === 'steps' ? (
          <Field label={tr('Шагов за день')} value={a} onChange={setA} placeholder="8000" numeric />
        ) : type === 'weight' ? (
          <Field label={tr('Вес, ') + tr(mass.label)} value={a} onChange={setA} numeric />
        ) : type === 'bp' ? (
          <FieldRow>
            <Field half label={tr('Верхнее')} value={a} onChange={setA} placeholder="120" numeric />
            <Field half label={tr('Нижнее')} value={b} onChange={setB} placeholder="80" numeric />
          </FieldRow>
        ) : type === 'period' ? (
          <Field label={tr('Сколько дней длились')} value={a} onChange={setA} placeholder="5" numeric />
        ) : type === 'rhr' ? (
          <Field label={tr('Пульс в покое, уд/мин')} value={a} onChange={setA} placeholder="60" numeric />
        ) : (
          <>
            <Label>{tr('Вид')}</Label>
            <Chips options={WORKOUT_TYPES} value={workout} onChange={setWorkout} />
            <Label>{tr('Интенсивность')}</Label>
            <Chips options={INTENSITY} value={intensity} onChange={setIntensity} />
            <FieldRow>
              <Field half label={tr('Длительность, мин')} value={a} onChange={setA} placeholder="45" numeric />
              <Field half label={tr('Начало')} value={b} onChange={setB} placeholder="18:00" keyboard="numbers-and-punctuation" />
            </FieldRow>
          </>
        )}
        <Msg bad>{err}</Msg>
        <Msg>{saved}</Msg>
        <Button title={tr('Сохранить')} onPress={save} />
      </Card>

      {recent.length ? (
        <>
        <Section>{tr('Мои записи')}</Section>
        <Card>
          {recent.map((e, i) => (
            <ListItem key={e.id} first={i === 0}>
              <View style={s.grow}>
                <Text style={s.itemText}>{entryText(e, profile)}</Text>
                <Note>{showDay(e.date)}</Note>
              </View>
              <Pressable onPress={() => onDelete(e)} hitSlop={10}>
                <Text {...fit(1, 0.7)} style={s.del}>{tr('Удалить')}</Text>
              </Pressable>
            </ListItem>
          ))}
        </Card>
        </>
      ) : null}
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  grow: { flex: 1 },
  itemText: { color: c.text, fontSize: SIZES.text - 1 },
  del: { color: c.bad, fontSize: SIZES.body, fontWeight: '600' },
});
