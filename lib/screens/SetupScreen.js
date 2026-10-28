// Редактирование профиля: основное, образ жизни, цель и опыт, необязательное, ручной ввод
// (постоянные значения). Всё хранится только на телефоне. Обязательны только дата рождения и пол.
import React, { useMemo, useState } from 'react';
import { TextInput, View, Text, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, T, Button, Disclaimer } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';

const pad = (n) => (n < 10 ? '0' : '') + n;
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const toInput = (iso) => (iso ? iso.split('-').reverse().join('.') : '');
const str = (v) => (v != null && v !== '' ? String(v) : '');
const num = (t) => (t.trim() ? Number(t.replace(',', '.')) : null);

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

export const GOALS = [
  ['energy', 'Больше энергии'], ['sleep', 'Лучше спать'], ['endurance', 'Выносливость'],
  ['strength', 'Сила'], ['weight', 'Снизить вес'], ['health', 'Здоровье в целом'],
];
export const EXPERIENCE = [['new', 'Только начинаю'], ['mid', '1–3 года'], ['pro', 'Больше 3 лет']];
export const SMOKING = [['never', 'Никогда'], ['former', 'Бросил(а)'], ['current', 'Курю']];
const CYCLE = [['tracking', 'Отслеживаю цикл'], ['contraception', 'Гормональная контрацепция'], ['pregnant', 'Беременность']];

function Chips({ options, value, onChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={s.chips}>
      {options.map(([v, l]) => (
        <Pressable key={String(v)} onPress={() => onChange(v === value ? null : v)} style={[s.chip, v === value && { backgroundColor: c.accent }]}>
          <Text style={[s.chipText, { color: v === value ? c.onAccent : c.sub }]}>{tr(l)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, numeric, multiline }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  return (
    <>
      <Text style={s.label}>{label}</Text>
      <TextInput style={[s.input, multiline && s.multi]} value={value} onChangeText={onChange} placeholder={placeholder || '—'}
        placeholderTextColor={c.sub} keyboardType={numeric ? 'decimal-pad' : 'default'} multiline={multiline} />
    </>
  );
}

export function SetupScreen({ profile, onSave, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const p = profile || {};
  const l = p.lifestyle || {};
  const man = p.manual || {};
  const [date, setDate] = useState(toInput(p.birth));
  const [sex, setSex] = useState(p.sex || null);
  const [height, setHeight] = useState(str(p.heightCm));
  const [weight, setWeight] = useState(str(p.weightKg));
  const [waist, setWaist] = useState(str(l.waistCm));
  const [smoking, setSmoking] = useState(l.smoking || null);
  const [alcohol, setAlcohol] = useState(str(l.alcoholUnits));
  const [stress, setStress] = useState(l.stress || null);
  const [goal, setGoal] = useState(p.goal || null);
  const [exp, setExp] = useState(p.experience || null);
  const [more, setMore] = useState(!!((l.conditions || []).length || (l.medications || []).length));
  const [conditions, setConditions] = useState((l.conditions || []).join(', '));
  const [meds, setMeds] = useState((l.medications || []).join(', '));
  const [cycle, setCycle] = useState(l.cycle || null);
  const [noWatch, setNoWatch] = useState(!!(man.restingHr || man.vo2max || man.leanMassKg));
  const [rhr, setRhr] = useState(str(man.restingHr));
  const [vo2, setVo2] = useState(str(man.vo2max));
  const [lbm, setLbm] = useState(str(man.leanMassKg));
  const [err, setErr] = useState('');

  const save = () => {
    const birth = parseDate(date);
    if (!birth) return setErr(tr('Введите дату рождения в формате ДД.ММ.ГГГГ (возраст 18–100 лет)'));
    if (!sex) return setErr(tr('Выберите пол'));
    const checks = [
      [height, 120, 230, tr('Рост — число от 120 до 230 см')],
      [weight, 30, 300, tr('Вес — число от 30 до 300 кг')],
      [waist, 40, 200, tr('Окружность талии — число от 40 до 200 см')],
      [alcohol, 0, 150, tr('Алкоголь — число порций в неделю от 0 до 150')],
      [rhr, 30, 120, tr('Пульс в покое — число от 30 до 120')],
      [vo2, 10, 90, tr('VO2max — число от 10 до 90')],
      [lbm, 20, 150, tr('Безжировая масса — число от 20 до 150 кг')],
    ];
    for (const [t, lo, hi, msg] of checks) {
      const n = num(t);
      if (n != null && !(n >= lo && n <= hi)) return setErr(msg);
    }
    const manual = {};
    for (const [k, t] of [['restingHr', rhr], ['vo2max', vo2], ['leanMassKg', lbm]]) if (num(t) != null) manual[k] = num(t);
    const changed = ['restingHr', 'vo2max', 'leanMassKg'].some((k) => manual[k] !== man[k]);
    if (Object.keys(manual).length) manual.date = changed || !man.date ? today() : man.date;
    const list = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);
    onSave({
      ...p,
      birth, sex, heightCm: num(height), weightKg: num(weight), goal, experience: exp, manual,
      lifestyle: {
        waistCm: num(waist), smoking, alcoholUnits: num(alcohol), stress,
        conditions: list(conditions), medications: list(meds), cycle: sex === 'f' ? cycle || 'tracking' : null,
      },
    });
  };

  return (
    <Screen title={tr('Профиль')} onBack={onBack}>
      <T sub small>{tr('Хранится только на телефоне. Обязательны только дата рождения и пол.')}</T>
      <Card>
        <CardHead title={tr('Основное')} />
        <Field label={tr('Дата рождения')} value={date} onChange={setDate} placeholder={tr('ДД.ММ.ГГГГ')} />
        <Text style={s.label}>{tr('Пол')}</Text>
        <Chips options={[['m', 'Мужской'], ['f', 'Женский']]} value={sex} onChange={setSex} />
        {sex === 'f' ? (
          <>
            <Text style={s.label}>{tr('Менструальный цикл')}</Text>
            <Chips options={CYCLE} value={cycle || 'tracking'} onChange={setCycle} />
          </>
        ) : null}
        <View style={s.two}>
          <View style={{ flex: 1 }}><Field label={tr('Рост, см')} value={height} onChange={setHeight} numeric /></View>
          <View style={{ flex: 1 }}><Field label={tr('Вес, кг')} value={weight} onChange={setWeight} numeric /></View>
        </View>
        <T sub small>{tr('Вес из Health Connect важнее: этот используется, только если его там нет.')}</T>
      </Card>

      <Card>
        <CardHead title={tr('Образ жизни')} />
        <Field label={tr('Окружность талии, см')} value={waist} onChange={setWaist} numeric />
        <Text style={s.label}>{tr('Курение')}</Text>
        <Chips options={SMOKING} value={smoking} onChange={setSmoking} />
        <Field label={tr('Алкоголь, порций в неделю')} value={alcohol} onChange={setAlcohol} numeric />
        <T sub small>{tr('1 порция ≈ 10 г спирта: бокал вина 100 мл, пиво 250 мл, крепкое 30 мл.')}</T>
        <Text style={s.label}>{tr('Стресс, от 1 до 10')}</Text>
        <Chips options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, String(n)])} value={stress} onChange={setStress} />
      </Card>

      <Card>
        <CardHead title={tr('Цель и опыт')} />
        <Text style={s.label}>{tr('Основная цель')}</Text>
        <Chips options={GOALS} value={goal} onChange={setGoal} />
        <Text style={s.label}>{tr('Опыт тренировок')}</Text>
        <Chips options={EXPERIENCE} value={exp} onChange={setExp} />
      </Card>

      <Card>
        <Pressable onPress={() => setMore(!more)}>
          <CardHead title={tr('Дополнительно (необязательно)')} right={more ? '▲' : '▼'} />
        </Pressable>
        {more ? (
          <>
            <Field label={tr('Хронические заболевания (через запятую)')} value={conditions} onChange={setConditions} multiline />
            <Field label={tr('Лекарства (через запятую)')} value={meds} onChange={setMeds} multiline />
          </>
        ) : null}
      </Card>

      <Card>
        <Pressable onPress={() => setNoWatch(!noWatch)}>
          <CardHead title={tr('Постоянные значения вручную')} right={noWatch ? '▲' : '▼'} />
        </Pressable>
        {noWatch ? (
          <>
            <T sub small>{tr('Если этих данных нет ни в Health Connect, ни в записях — используются эти значения. Ежедневные записи — в «Записать вручную».')}</T>
            <Field label={tr('Пульс в покое, уд/мин')} value={rhr} onChange={setRhr} numeric />
            <Field label={tr('VO2max, мл/кг/мин')} value={vo2} onChange={setVo2} numeric />
            <Field label={tr('Безжировая масса, кг')} value={lbm} onChange={setLbm} numeric />
          </>
        ) : null}
      </Card>

      {err ? <T style={{ color: c.bad }}>{err}</T> : null}
      <Button title={tr('Сохранить')} onPress={save} />
      <Disclaimer />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  label: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '500', marginTop: 4 },
  input: { height: 46, borderRadius: SIZES.radiusSmall, borderWidth: 1, borderColor: c.line, color: c.text, fontSize: SIZES.text, paddingHorizontal: 12 },
  multi: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  two: { flexDirection: 'row', gap: SIZES.gap },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 36, height: 36, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: SIZES.small + 1, fontWeight: '600' },
});
