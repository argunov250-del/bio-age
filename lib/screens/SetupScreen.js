// Редактирование профиля: основное, образ жизни, цель и опыт, необязательное, ручной ввод
// (постоянные значения). Всё хранится только на телефоне. Обязательны только дата рождения и пол.
import React, { useState } from 'react';
import { Screen, Card, Section, Note, Msg, Button, Disclaimer, Chips, Field, FieldRow, Label } from '../ui';
import { tr } from '../i18n';

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
export const CYCLE = [['tracking', 'Отслеживаю'], ['contraception', 'Контрацепция'], ['pregnant', 'Беременность']];

export function SetupScreen({ profile, onSave, onBack }) {
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
  const cycle = l.cycle || null; // меняется в профиле (карточка «Менструальный цикл»)
  const [noWatch, setNoWatch] = useState(!!(man.restingHr || man.vo2max || man.leanMassKg));
  const [rhr, setRhr] = useState(str(man.restingHr));
  const [vo2, setVo2] = useState(str(man.vo2max));
  const [lbm, setLbm] = useState(str(man.leanMassKg));
  const [err, setErr] = useState('');

  const save = () => {
    const birth = parseDate(date);
    if (!birth) return setErr(tr('Введи дату рождения как ДД.ММ.ГГГГ (возраст 18–100 лет)'));
    if (!sex) return setErr(tr('Выбери пол'));
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
    <Screen title={tr('Обо мне')} onBack={onBack}>
      <Note>{tr('Хранится только на телефоне. Обязательны только дата рождения и пол.')}</Note>
      <Section>{tr('Основное')}</Section>
      <Card>
        <Field label={tr('Дата рождения')} value={date} onChange={setDate} placeholder={tr('ДД.ММ.ГГГГ')} keyboard="numbers-and-punctuation" />
        <Label>{tr('Пол')}</Label>
        <Chips clearable options={[['m', 'Мужской'], ['f', 'Женский']]} value={sex} onChange={setSex} />
        <FieldRow>
          <Field half label={tr('Рост, см')} value={height} onChange={setHeight} numeric />
          <Field half label={tr('Вес, кг')} value={weight} onChange={setWeight} numeric />
        </FieldRow>
        <Note>{tr('Вес из Health Connect важнее: этот нужен, если там его нет.')}</Note>
      </Card>

      <Section>{tr('Образ жизни')}</Section>
      <Card>
        <Field label={tr('Окружность талии, см')} value={waist} onChange={setWaist} numeric />
        <Label>{tr('Курение')}</Label>
        <Chips clearable options={SMOKING} value={smoking} onChange={setSmoking} />
        <Field label={tr('Алкоголь, порций в неделю')} value={alcohol} onChange={setAlcohol} numeric />
        <Note>{tr('1 порция ≈ 10 г спирта: бокал вина 100 мл, пиво 250 мл, крепкое 30 мл.')}</Note>
        <Label>{tr('Стресс, от 1 до 10')}</Label>
        <Chips clearable options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, String(n)])} value={stress} onChange={setStress} />
      </Card>

      <Section>{tr('Цель и опыт')}</Section>
      <Card>
        <Label>{tr('Основная цель')}</Label>
        <Chips clearable options={GOALS} value={goal} onChange={setGoal} />
        <Label>{tr('Опыт тренировок')}</Label>
        <Chips clearable options={EXPERIENCE} value={exp} onChange={setExp} />
      </Card>

      <Section right={more ? '▲' : '▼'} onRight={() => setMore(!more)}>{tr('Дополнительно (необязательно)')}</Section>
      {more ? (
        <Card>
          <Field label={tr('Хронические заболевания (через запятую)')} value={conditions} onChange={setConditions} multiline />
          <Field label={tr('Лекарства (через запятую)')} value={meds} onChange={setMeds} multiline />
        </Card>
      ) : null}

      <Section right={noWatch ? '▲' : '▼'} onRight={() => setNoWatch(!noWatch)}>{tr('Постоянные значения вручную')}</Section>
      {noWatch ? (
        <Card>
            <Note>{tr('Нужны, если этих данных нет ни в Health Connect, ни в записях. Ежедневные замеры — в «Записать вручную».')}</Note>
            <Field label={tr('Пульс в покое, уд/мин')} value={rhr} onChange={setRhr} numeric />
            <Field label={tr('VO2max, мл/кг/мин')} value={vo2} onChange={setVo2} numeric />
            <Field label={tr('Безжировая масса, кг')} value={lbm} onChange={setLbm} numeric />
        </Card>
      ) : null}

      <Msg bad>{err}</Msg>
      <Button title={tr('Сохранить')} onPress={save} />
      <Disclaimer />
    </Screen>
  );
}
