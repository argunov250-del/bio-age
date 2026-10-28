// Анализы: Clinical BioAge (PhenoAge), история расчётов, недостающие анализы и ввод
// результатов с выбором единиц и проверкой значений.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, PageTitle, Section, T, Button, Row } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt, signed } from '../format';
import { LABS, PHENO_REQUIRED, EXTENDED, unitsFor, toBase, fromBase, checkValue, temporaryFlags } from '../labs';
import { RETEST_DAYS } from '../phenoage';
import { calcEntry } from '../clinical';
import { shortDate } from '../time';

const DISCLAIMER = 'Приложение не является медицинским устройством и не заменяет консультацию врача.';
const fullDate = (iso) => (iso ? iso.split('-').reverse().join('.') : '—');
const addDaysIso = (iso, n) => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.getTime();
};

export function LabsScreen({ labs, tab, onAdd, onEdit, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const sorted = [...labs].sort((a, b) => (a.date < b.date ? 1 : -1));
  const last = sorted[0];
  const lastOk = sorted.find((e) => e.calc && e.calc.status === 'ok');
  const flags = last ? temporaryFlags(last.values) : [];
  const ext = last ? EXTENDED.filter((k) => last.values[k]) : [];

  return (
    <Screen tab={tab} onBack={tab ? undefined : onBack} title={tab ? undefined : tr('Анализы')}>
      {tab ? <PageTitle>{tr('Анализы')}</PageTitle> : null}

      <Card>
        <CardHead icon="⚗" title="Clinical BioAge" right={lastOk ? tr('анализы от ') + fullDate(lastOk.date) : null} />
        {lastOk ? (
          <>
            <Text style={s.big}>{fmt(lastOk.calc.phenoAge, 1)}</Text>
            <Text style={[s.delta, { color: lastOk.calc.delta > 0 ? c.bad : c.good }]}>
              {signed(lastOk.calc.delta, 1)} {tr('лет к паспортному возрасту')} ({fmt(lastOk.calc.ageAtTest, 1)})
            </Text>
            <T sub small>{tr('Алгоритм: ') + 'PhenoAge (Levine, 2018) · ' + lastOk.calc.algorithm + ' · ' + tr('рассчитано ') + shortDate(Date.parse(lastOk.calc.calculatedAt))}</T>
            <T sub small>{tr('Следующий расчёт — через 4–8 недель: ') + shortDate(addDaysIso(lastOk.date, RETEST_DAYS[0])) + ' – ' + shortDate(addDaysIso(lastOk.date, RETEST_DAYS[1]))}</T>
          </>
        ) : (
          <T sub small>{tr('Clinical BioAge считается только по полному набору из 9 анализов крови. Без подстановок и оценок.')}</T>
        )}
        {last && last.calc && last.calc.status === 'missing' ? (
          <View style={s.missing}>
            <Text style={[s.missTitle, { color: c.warn }]}>{tr('Анализы от ') + fullDate(last.date) + ': ' + tr('не хватает анализов: ') + last.calc.missing.length}</Text>
            {last.calc.missing.map((k) => <Text key={k} style={s.missItem}>• {LABS[k].name()}</Text>)}
          </View>
        ) : null}
        {last && last.calc && last.calc.status === 'invalid' ? (
          <Text style={[s.missTitle, { color: c.bad }]}>{tr('Анализы от ') + fullDate(last.date) + ': ' + tr('Есть неверные значения: ') + last.calc.invalid.map((k) => LABS[k].name()).join(', ') + '. ' + tr('Проверьте ввод и единицы.')}</Text>
        ) : null}
        {!last ? (
          <View style={s.missing}>
            <Text style={s.missTitle}>{tr('Нужны 9 анализов:')}</Text>
            {PHENO_REQUIRED.map((k) => <Text key={k} style={s.missItem}>• {LABS[k].name()}</Text>)}
          </View>
        ) : null}
        {flags.length ? (
          <Text style={[s.warn, { color: c.warn }]}>
            {tr('Анализы от ') + fullDate(last.date) + '. ' + tr('Повышены: ') + flags.map((k) => LABS[k].name()).join(', ') + '. ' + tr('Возможно влияние болезни, воспаления, стресса или нагрузки — результат может быть завышен. Имеет смысл повторить анализ после выздоровления.')}
          </Text>
        ) : null}
      </Card>

      <Button title={tr('Добавить результаты анализов')} onPress={() => onAdd(null)} />

      {ext.length ? (
        <Card>
          <CardHead title={tr('Расширенная панель')} right={fullDate(last.date)} />
          {ext.map((k) => (
            <Row key={k} label={LABS[k].name()} value={last.values[k].status === 'invalid' ? tr('неверное значение') : fmt(last.values[k].base, 2) + ' ' + LABS[k].base}
              color={last.values[k].status === 'invalid' ? c.bad : null} />
          ))}
          <T sub small>{tr('Показываем как есть, без оценки и без диагнозов. Обсудите результаты с врачом.')}</T>
        </Card>
      ) : null}

      {sorted.length ? <Section>{tr('История')}</Section> : null}
      {sorted.map((e) => (
        <Card key={e.id} onPress={() => onEdit(e)} style={s.hist}>
          <View style={{ flex: 1 }}>
            <Text style={s.histDate}>{fullDate(e.date)}{e.fasting ? ' · ' + tr('натощак') : ''}</Text>
            <Text style={s.histSub}>
              {e.calc && e.calc.status === 'ok' ? 'Clinical BioAge'
                : e.calc && e.calc.status === 'missing' ? tr('не хватает анализов: ') + e.calc.missing.length
                  : e.calc && e.calc.status === 'invalid' ? tr('есть неверные значения')
                    : e.calc && e.calc.status === 'too_young' ? tr('расчёт с 18 лет') : tr('без расчёта')}
            </Text>
          </View>
          <Text style={s.histValue}>{e.calc && e.calc.status === 'ok' ? fmt(e.calc.phenoAge, 1) : '—'}</Text>
        </Card>
      ))}
      <T sub small style={{ textAlign: 'center' }}>{tr(DISCLAIMER)}</T>
    </Screen>
  );
}

// Поле анализа: значение + выбор единицы + проверка.
function LabField({ test, state, onChange }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const units = unitsFor(test);
  const num = state.text.trim() ? Number(state.text.replace(',', '.')) : null;
  const base = num == null || isNaN(num) ? null : toBase(test, num, state.unit);
  const bad = state.text.trim() && (base == null || checkValue(test, base) !== 'ok');
  return (
    <View style={s.field}>
      <Text style={s.fieldName}>{LABS[test].name()}</Text>
      <View style={s.fieldRow}>
        <TextInput style={[s.input, bad && { borderColor: c.bad }]} value={state.text} onChangeText={(text) => onChange({ ...state, text })}
          keyboardType="decimal-pad" placeholder="—" placeholderTextColor={c.sub} />
        {units.map((u) => (
          <Pressable key={u} onPress={() => onChange({ ...state, unit: u })} style={[s.unit, u === state.unit && { backgroundColor: c.accent }]}>
            <Text style={[s.unitText, { color: u === state.unit ? c.onAccent : c.sub }]}>{u}</Text>
          </Pressable>
        ))}
      </View>
      {bad ? <Text style={[s.fieldErr, { color: c.bad }]}>{tr('Вне правдоподобного диапазона — проверьте значение и единицы')}</Text> : null}
    </View>
  );
}

const pad = (n) => (n < 10 ? '0' : '') + n;
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
function parseDate(text) {
  const m = /^\s*(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})\s*$/.exec(text);
  if (!m) return null;
  const d = new Date(+m[3], +m[2] - 1, +m[1]);
  if (d.getDate() !== +m[1] || d > new Date()) return null;
  return `${m[3]}-${pad(+m[2])}-${pad(+m[1])}`;
}

export function LabEntryScreen({ entry, profile, onSave, onDelete, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const init = (k) => {
    const v = entry && entry.values[k];
    const unit = (v && v.unit) || LABS[k].base;
    return { unit, text: v && v.base != null ? String(+fromBase(k, v.base, unit).toFixed(3)) : '' };
  };
  const [date, setDate] = useState(fullDate((entry && entry.date) || todayIso()));
  const [fasting, setFasting] = useState(entry ? !!entry.fasting : true);
  const [fields, setFields] = useState(() => Object.fromEntries([...PHENO_REQUIRED, ...EXTENDED].map((k) => [k, init(k)])));
  const [err, setErr] = useState('');
  const set = (k) => (v) => setFields((f) => ({ ...f, [k]: v }));

  const save = () => {
    const iso = parseDate(date);
    if (!iso) return setErr(tr('Дата анализов — в формате ДД.ММ.ГГГГ и не в будущем'));
    const values = {};
    for (const [k, f] of Object.entries(fields)) {
      if (!f.text.trim()) continue;
      const num = Number(f.text.replace(',', '.'));
      const base = isNaN(num) ? null : toBase(k, num, f.unit);
      values[k] = { base, entered: isNaN(num) ? f.text : num, unit: f.unit, status: base == null ? 'invalid' : checkValue(k, base), source: 'lab_test' };
    }
    if (!Object.keys(values).length) return setErr(tr('Введите хотя бы один показатель'));
    const e = { id: (entry && entry.id) || String(Date.now()), date: iso, fasting, values };
    e.calc = calcEntry(e, profile);
    onSave(e);
  };

  return (
    <Screen title={entry ? tr('Анализы от ') + fullDate(entry.date) : tr('Новые анализы')} onBack={onBack}>
      <Card>
        <Text style={s.fieldName}>{tr('Дата сдачи')}</Text>
        <TextInput style={[s.input, s.dateInput]} value={date} onChangeText={setDate} placeholder={tr('ДД.ММ.ГГГГ')} placeholderTextColor={c.sub} keyboardType="numbers-and-punctuation" />
        <View style={s.fieldRow}>
          {[[true, tr('натощак')], [false, tr('не натощак')]].map(([v, l]) => (
            <Pressable key={l} onPress={() => setFasting(v)} style={[s.unit, fasting === v && { backgroundColor: c.accent }]}>
              <Text style={[s.unitText, { color: fasting === v ? c.onAccent : c.sub }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      <Section>{tr('Для Clinical BioAge (все 9)')}</Section>
      <Card>{PHENO_REQUIRED.map((k) => <LabField key={k} test={k} state={fields[k]} onChange={set(k)} />)}</Card>
      <Section>{tr('Расширенная панель (по желанию)')}</Section>
      <Card>{EXTENDED.map((k) => <LabField key={k} test={k} state={fields[k]} onChange={set(k)} />)}</Card>
      {err ? <T style={{ color: c.bad }}>{err}</T> : null}
      <Button title={tr('Сохранить и рассчитать')} onPress={save} />
      {entry ? <Button title={tr('Удалить запись')} onPress={() => onDelete(entry)} secondary /> : null}
      <T sub small style={{ textAlign: 'center' }}>{tr(DISCLAIMER)}</T>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  big: { color: c.text, fontSize: 44, fontWeight: '700' },
  delta: { fontSize: SIZES.text, fontWeight: '600' },
  missing: { gap: 2, marginTop: 4 },
  missTitle: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '600' },
  missItem: { color: c.sub, fontSize: SIZES.small },
  warn: { fontSize: SIZES.small, lineHeight: 18, marginTop: 4 },
  hist: { flexDirection: 'row', alignItems: 'center', gap: SIZES.gap },
  histDate: { color: c.text, fontSize: SIZES.text, fontWeight: '600' },
  histSub: { color: c.sub, fontSize: SIZES.small },
  histValue: { color: c.text, fontSize: 22, fontWeight: '700' },
  field: { gap: 4, paddingVertical: 6, borderTopWidth: 1, borderTopColor: c.edge },
  fieldName: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '500' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 90, height: 42, borderRadius: SIZES.radiusSmall, borderWidth: 1, borderColor: c.line, color: c.text, fontSize: SIZES.text, paddingHorizontal: 12 },
  unit: { height: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontSize: SIZES.small, fontWeight: '600' },
  fieldErr: { fontSize: SIZES.tiny + 1 },
  dateInput: { flex: 0, alignSelf: 'stretch', marginBottom: 6 },
});
