// «Импорт и резервная копия»: Apple Health (export.zip с iPhone), таблица CSV,
// сохранение и восстановление копии Epimely. Всё — файлами на телефоне, без интернета.
import React, { useMemo, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Screen, Card, CardHead, T, Button } from '../ui';
import { SIZES } from '../theme';
import { tr } from '../i18n';
import { useColors } from '../colors';
import { fmt } from '../format';
import { ago } from '../time';
import { pickFile, importAppleHealth, readCSV, shareBackup, readBackup } from '../importer';

const errText = (e) => {
  const m = String((e && e.message) || e);
  if (m === 'noExport') return tr('В архиве нет export.xml — нужен файл экспорта из «Здоровья» на iPhone.');
  if (m === 'noDate') return tr('В таблице нет столбца с датой (дата или date).');
  if (m === 'notBackup') return tr('Это не резервная копия Epimely.');
  return tr('Не получилось прочитать файл: ') + m;
};

export function ImportScreen({ importInfo, entriesCount, onApple, onDeleteApple, onCSV, backupData, onRestore, onBack }) {
  const c = useColors();
  const s = useMemo(() => makeStyles(c), [c]);
  const [busy, setBusy] = useState('');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState({});
  const say = (key, text, bad) => setMsg((x) => ({ ...x, [key]: { text, bad } }));

  const apple = async () => {
    const f = await pickFile('*/*');
    if (!f) return;
    if (!/\.(zip|xml)$/i.test(f.name || '')) return say('apple', tr('Нужен файл export.zip или export.xml.'), true);
    setBusy('apple');
    setProgress(0);
    say('apple', '');
    try {
      const store = await importAppleHealth(f, setProgress);
      await onApple(store);
      say('apple', tr('Готово. Данные пересчитываются.'));
    } catch (e) {
      say('apple', errText(e), true);
    }
    setBusy('');
  };

  const csv = async () => {
    const f = await pickFile('*/*');
    if (!f) return;
    setBusy('csv');
    try {
      const r = await readCSV(f);
      if (!r.entries.length) say('csv', tr('Не нашёл подходящих строк. Проверь заголовки и формат даты.'), true);
      else {
        await onCSV(r.entries);
        say('csv', tr('Добавлено записей: ') + r.entries.length + (r.skipped ? tr(', пропущено строк: ') + r.skipped : ''));
      }
    } catch (e) {
      say('csv', errText(e), true);
    }
    setBusy('');
  };

  const save = async () => {
    try { await shareBackup(backupData()); } catch (e) { say('backup', errText(e), true); }
  };

  const restore = async () => {
    const f = await pickFile('*/*');
    if (!f) return;
    try {
      const data = await readBackup(f);
      Alert.alert(tr('Восстановить из копии?'), tr('Профиль и записи заменятся данными из копии от ') + String(data.exportedAt || '').slice(0, 10) + '.', [
        { text: tr('Отмена'), style: 'cancel' },
        { text: tr('Восстановить'), onPress: async () => { await onRestore(data); say('backup', tr('Копия восстановлена.')); } },
      ]);
    } catch (e) {
      say('backup', errText(e), true);
    }
  };

  const sum = importInfo && importInfo.summary;
  const Msg = ({ k }) => (msg[k] && msg[k].text ? <T small style={{ color: msg[k].bad ? c.bad : c.good }}>{msg[k].text}</T> : null);
  return (
    <Screen title={tr('Импорт и резервная копия')} onBack={onBack}>
      <Card>
        <CardHead title={tr('Apple Health (iPhone)')} />
        <T sub small>{tr('1. На iPhone открой «Здоровье» → фото профиля → «Экспортировать все медданные».\n2. Отправь файл export.zip на этот телефон (мессенджер, почта, облако) и сохрани.\n3. Нажми «Выбрать файл».')}</T>
        <T sub small>{tr('Берутся последние 6 месяцев: шаги, сон, пульс, HRV, тренировки, вес, давление, SpO2, VO2max, цикл. Если те же данные есть в Health Connect, важнее они.')}</T>
        {busy === 'apple' ? (
          <View style={{ gap: 6 }}>
            <View style={s.bar}><View style={[s.fill, { width: `${Math.round(progress * 100)}%`, backgroundColor: c.accent }]} /></View>
            <T small>{tr('Читаю файл… ') + Math.round(progress * 100) + '%'}</T>
            <T sub small>{tr('Большой архив читается несколько минут — не закрывай приложение.')}</T>
          </View>
        ) : <Button title={tr('Выбрать файл')} onPress={apple} disabled={!!busy} />}
        <Msg k="apple" />
        {sum ? (
          <View style={s.sum}>
            <Text style={s.sumTitle}>{tr('Импортировано ') + ago(importInfo.at)}</Text>
            <Text style={s.sumText}>
              {[
                [tr('шаги, дней'), sum.steps], [tr('ночей сна'), sum.sleep], [tr('пульс, дней'), sum.hrDays], [tr('пульс покоя'), sum.rhr],
                ['HRV', sum.hrv], [tr('тренировок'), sum.workouts], [tr('вес'), sum.weight], [tr('давление'), sum.bp],
                ['SpO2', sum.spo2], ['VO2max', sum.vo2], [tr('дней месячных'), sum.cycle],
              ].filter(([, n]) => n).map(([l, n]) => l + ': ' + fmt(n)).join(' · ') || tr('подходящих данных не нашлось')}
            </Text>
            <Button title={tr('Удалить импорт')} secondary onPress={onDeleteApple} disabled={!!busy} />
          </View>
        ) : null}
      </Card>

      <Card>
        <CardHead title={tr('Таблица CSV')} />
        <T sub small>{tr('Первая строка — заголовки, разделитель «;» или «,». Столбцы: дата, шаги, сон (часы), вес (кг), пульс (в покое), верхнее и нижнее (давление). Можно не все.')}</T>
        <Text style={s.code}>{'дата;шаги;сон;вес;пульс;верхнее;нижнее\n28.10.2026;8500;7,5;80,2;58;120;80'}</Text>
        <Button title={tr('Выбрать CSV')} onPress={csv} disabled={!!busy} />
        <Msg k="csv" />
      </Card>

      <Card>
        <CardHead title={tr('Резервная копия')} />
        <T sub small>{tr('Файл со всем, что есть в приложении: профиль, записи и импорт. Сохрани его в облако или на компьютер — пригодится при смене телефона.')}</T>
        <T sub small>{tr('Сейчас записей: ') + entriesCount}</T>
        <Button title={tr('Сохранить копию')} onPress={save} disabled={!!busy} />
        <Button title={tr('Восстановить из копии')} onPress={restore} secondary disabled={!!busy} />
        <Msg k="backup" />
      </Card>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  bar: { height: 8, borderRadius: 4, backgroundColor: c.raised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  sum: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.edge },
  sumTitle: { color: c.text, fontSize: SIZES.small + 1, fontWeight: '600' },
  sumText: { color: c.sub, fontSize: SIZES.small, lineHeight: 19 },
  code: { color: c.text, fontSize: SIZES.small, fontFamily: 'monospace', backgroundColor: c.raised, borderRadius: 8, padding: 10 },
});
