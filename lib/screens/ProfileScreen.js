// Вкладка «Профиль» (та же гамма, что «Обзор»): данные о себе одной карточкой,
// единицы измерения, ИИ-коуч и настройки.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, TextInput, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, Row, PageTitle, Disclaimer, T, Button } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { APP_VERSION, CHANGES } from '../version';
import { GOALS, EXPERIENCE, SMOKING } from './SetupScreen';

const label = (list, v) => {
  const x = list.find(([k]) => k === v);
  return x ? tr(x[1]) : '—';
};

const STATUS = {
  thinking: 'Спрашиваю Claude…',
  ok: 'Работает: совет на «Обзоре» пишет Claude.',
  offline: 'Нет интернета — пока коуч работает на телефоне.',
  'error:key': 'Ключ не подошёл. Проверь, что он скопирован целиком.',
  'error:limit': 'Слишком много запросов или закончился баланс ключа. Попробуй позже.',
  'error:api': 'Claude сейчас не ответил. Попробуй позже.',
  'error:other': 'Не получилось получить ответ. Попробуй позже.',
};

// ИИ-коуч: переключатель онлайн-советов, ключ Claude и что именно уходит в интернет.
function AiCard({ c, s, on, hasKey, onSaveKey, onToggle, onTest, state, hasResult }) {
  const [key, setKey] = useState('');
  const status = on && !hasKey ? tr('Добавь ключ, чтобы включить онлайн-советы.') : state && STATUS[state] ? tr(STATUS[state]) : null;
  return (
    <Card>
      <CardHead title={tr('ИИ-коуч')} />
      <View style={s.switchRow}>
        <Text style={s.linkText}>{tr('Онлайн-советы от Claude')}</Text>
        <Switch value={!!on} onValueChange={onToggle} trackColor={{ true: c.accent, false: c.raised }} thumbColor={c.text} />
      </View>
      <T sub small>{tr('Когда включено и есть интернет, Claude получает короткую сводку: возраст, пол, цель, оценки и средние за 7 и 30 дней. Без имени, дат, записей по часам и отдельных тренировок. Без интернета коуч работает на телефоне: показывает последний ответ Claude или советы по правилам.')}</T>
      {hasKey ? (
        <View style={s.keyRow}>
          <Text style={[s.keySaved, { flex: 1 }]}>{tr('Ключ сохранён')} ✓</Text>
          {on && hasResult ? <Pressable onPress={onTest} hitSlop={8}><Text style={[s.keyAction, { color: c.accent }]}>{tr('Проверить')}</Text></Pressable> : null}
          <Pressable onPress={() => onSaveKey('')} hitSlop={8}><Text style={[s.keyAction, { color: c.bad }]}>{tr('Удалить')}</Text></Pressable>
        </View>
      ) : (
        <>
          <TextInput value={key} onChangeText={setKey} placeholder="sk-ant-…" placeholderTextColor={c.sub} secureTextEntry autoCapitalize="none" autoCorrect={false}
            style={[s.input, { color: c.text, backgroundColor: c.raised, borderColor: c.edge }]} />
          <Button title={tr('Сохранить ключ')} secondary disabled={key.trim().length < 20} onPress={() => { onSaveKey(key.trim()); setKey(''); }} />
          <T sub small>{tr('Ключ создаётся на console.anthropic.com и хранится в защищённом хранилище телефона. Запросы оплачиваются по этому ключу.')}</T>
        </>
      )}
      {status ? <T small style={{ color: state === 'ok' ? c.good : state === 'thinking' ? c.sub : c.warn }}>{status}</T> : null}
    </Card>
  );
}

export function ProfileScreen({ profile, onOpen, onReload, loading, onSaveProfile, hasKey, onSaveKey, onAiToggle, onTestAi, coachState, hasResult }) {
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

      <AiCard c={c} s={s} on={p.aiOnline} hasKey={hasKey} onSaveKey={onSaveKey} onToggle={onAiToggle} onTest={onTestAi} state={coachState} hasResult={hasResult} />

      <Card>
        <CardHead title={tr('Единицы измерения')} />
        <Toggle k="mass" options={[['kg', tr('кг')], ['lb', 'lb']]} />
        <Toggle k="temp" options={[['c', '°C'], ['f', '°F']]} />
      </Card>

      <Card>
        <Link title={tr('Записать вручную')} onPress={() => onOpen('log')} />
        <Link title={tr('Обновить данные')} onPress={onReload} disabled={loading} />
        <Link title={tr('Доступ к данным')} onPress={() => onOpen('permissions')} />
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
  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 4 },
  keySaved: { color: c.good, fontSize: SIZES.text },
  keyAction: { fontSize: SIZES.text, fontWeight: '600' },
  input: { height: 46, borderRadius: SIZES.radiusSmall, borderWidth: 1, paddingHorizontal: 14, fontSize: SIZES.text },
});
