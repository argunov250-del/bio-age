// Образ жизни: окружность талии, курение, алкоголь, стресс, хронические заболевания,
// лекарства, беременность или цикл (только для женщин). Всё необязательно и хранится на телефоне.
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Screen, Card, T, Button } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';

const SMOKING = [['never', 'никогда'], ['former', 'бросил(а)'], ['current', 'курю']];
const CYCLE = [['', 'не указано'], ['pregnant', 'беременность'], ['tracking', 'отслеживаю цикл']];

function Choice({ options, value, onChange }) {
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

const num = (t) => (t.trim() ? Number(t.replace(',', '.')) : null);

export function LifestyleScreen({ profile, onSave, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const l = (profile && profile.lifestyle) || {};
  const [waist, setWaist] = useState(l.waistCm ? String(l.waistCm) : '');
  const [smoking, setSmoking] = useState(l.smoking || null);
  const [alcohol, setAlcohol] = useState(l.alcoholUnits != null ? String(l.alcoholUnits) : '');
  const [stress, setStress] = useState(l.stress || null);
  const [conditions, setConditions] = useState((l.conditions || []).join(', '));
  const [meds, setMeds] = useState((l.medications || []).join(', '));
  const [cycle, setCycle] = useState(l.cycle || '');
  const [err, setErr] = useState('');

  const save = () => {
    const w = num(waist), a = num(alcohol);
    if (w != null && !(w >= 40 && w <= 200)) return setErr(tr('Окружность талии — число от 40 до 200 см'));
    if (a != null && !(a >= 0 && a <= 150)) return setErr(tr('Алкоголь — число порций в неделю от 0 до 150'));
    const list = (t) => t.split(',').map((x) => x.trim()).filter(Boolean);
    onSave({
      ...profile,
      lifestyle: {
        waistCm: w, smoking, alcoholUnits: a, stress, conditions: list(conditions), medications: list(meds),
        cycle: profile.sex === 'f' ? cycle || null : null, updatedAt: new Date().toISOString(),
      },
    });
  };

  return (
    <Screen title={tr('Образ жизни')} onBack={onBack}>
      <T sub small>{tr('Всё необязательно и хранится только на телефоне. Нужно для рекомендаций и метаболического контекста.')}</T>
      <Card>
        <Text style={s.label}>{tr('Окружность талии, см')}</Text>
        <TextInput style={s.input} value={waist} onChangeText={setWaist} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={c.sub} />
        <Text style={s.label}>{tr('Курение')}</Text>
        <Choice options={SMOKING} value={smoking} onChange={setSmoking} />
        <Text style={s.label}>{tr('Алкоголь, порций в неделю')}</Text>
        <TextInput style={s.input} value={alcohol} onChangeText={setAlcohol} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={c.sub} />
        <T sub small>{tr('1 порция ≈ 10 г спирта: бокал вина 100 мл, пиво 250 мл, крепкое 30 мл.')}</T>
        <Text style={s.label}>{tr('Стресс, от 1 до 10')}</Text>
        <Choice options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, String(n)])} value={stress} onChange={setStress} />
      </Card>
      <Card>
        <Text style={s.label}>{tr('Хронические заболевания (через запятую)')}</Text>
        <TextInput style={[s.input, s.multi]} value={conditions} onChangeText={setConditions} multiline placeholder="—" placeholderTextColor={c.sub} />
        <Text style={s.label}>{tr('Лекарства (через запятую)')}</Text>
        <TextInput style={[s.input, s.multi]} value={meds} onChangeText={setMeds} multiline placeholder="—" placeholderTextColor={c.sub} />
        {profile.sex === 'f' ? (
          <>
            <Text style={s.label}>{tr('Беременность или цикл')}</Text>
            <Choice options={CYCLE} value={cycle} onChange={(v) => setCycle(v || '')} />
          </>
        ) : null}
      </Card>
      {err ? <T style={{ color: c.bad }}>{err}</T> : null}
      <Button title={tr('Сохранить')} onPress={save} />
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  label: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '500', marginTop: 4 },
  input: { height: 44, borderRadius: SIZES.radiusSmall, borderWidth: 1, borderColor: c.line, color: c.text, fontSize: SIZES.text, paddingHorizontal: 12 },
  multi: { height: 72, textAlignVertical: 'top', paddingTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { minWidth: 36, height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: c.raised, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: SIZES.small, fontWeight: '600' },
});
