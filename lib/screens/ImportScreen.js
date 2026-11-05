// «Импорт и резервная копия»: Apple Health (export.zip с iPhone), таблица CSV,
// сохранение и восстановление копии Epimely. Всё — файлами на телефоне, без интернета.
import React, { useMemo, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Screen, Card, Section, Note, Msg, Button, ProgressBar, Subhead } from '../ui';
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
  if (m === 'notZip' || m === 'badZip' || m === 'truncated') return tr('Архив повреждён или скачан не полностью — экспортируй и перешли файл ещё раз.');
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
    say('csv', '');
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
        { text: tr('Восстановить'), onPress: async () => {
          try { await onRestore(data); say('backup', tr('Копия восстановлена.')); } catch (e) { say('backup', errText(e), true); }
        } },
      ]);
    } catch (e) {
      say('backup', errText(e), true);
    }
  };

  const sum = importInfo && importInfo.summary;
  const note = (k) => <Msg bad={msg[k] && msg[k].bad}>{msg[k] && msg[k].text}</Msg>;
  return (
    <Screen title={tr('Импорт и резервная копия')} onBack={onBack}>
      <Section>{tr('Apple Health (iPhone)')}</Section>
      <Card>
        <Note>{tr('1. На iPhone: «Здоровье» → фото профиля → «Экспортировать все медданные».\n2. Передай export.zip на этот телефон: мессенджер, почта или облако.\n3. Нажми «Выбрать файл».')}</Note>
        <Note>{tr('Читаются последние 6 месяцев: шаги, сон, пульс, HRV, тренировки, вес, давление, SpO2, VO2max, цикл. Данные Health Connect важнее.')}</Note>
        {busy === 'apple' ? (
          <View style={s.progress}>
            <ProgressBar value={progress} />
            <Text style={s.sumTitle}>{tr('Читаю файл… ') + Math.round(progress * 100) + '%'}</Text>
            <Note>{tr('Большой архив читается несколько минут — не закрывай приложение.')}</Note>
          </View>
        ) : <Button title={tr('Выбрать файл')} onPress={apple} disabled={!!busy} />}
        {note('apple')}
        {sum ? (
          <View style={s.sum}>
            <Subhead>{tr('Импортировано ') + ago(importInfo.at)}</Subhead>
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

      <Section>{tr('Таблица CSV')}</Section>
      <Card>
        <Note>{tr('Первая строка — заголовки, разделитель «;» или «,». Обязателен только столбец с датой; остальные по желанию: шаги, сон (часы), вес (кг), пульс покоя, верхнее и нижнее давление.')}</Note>
        <Text style={s.code}>{'дата;шаги;сон;вес;пульс;верхнее;нижнее\n28.10.2026;8500;7,5;80,2;58;120;80'}</Text>
        <Button title={tr('Выбрать CSV')} onPress={csv} disabled={!!busy} />
        {note('csv')}
      </Card>

      <Section>{tr('Резервная копия')}</Section>
      <Card>
        <Note>{tr('Файл с профилем, записями и импортом. Сохрани его в облаке или на компьютере — пригодится при смене телефона.')}</Note>
        <Note>{tr('Сейчас записей: ') + entriesCount}</Note>
        <Button title={tr('Сохранить копию')} onPress={save} disabled={!!busy} />
        <Button title={tr('Восстановить из копии')} onPress={restore} secondary disabled={!!busy} />
        {note('backup')}
      </Card>
    </Screen>
  );
}

const makeStyles = (c) => StyleSheet.create({
  progress: { gap: 6 },
  sum: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: c.edge },
  sumTitle: { color: c.text, fontSize: SIZES.body, fontWeight: '600' },
  sumText: { color: c.sub, fontSize: SIZES.small, lineHeight: 19 },
  code: { color: c.text, fontSize: SIZES.small, fontFamily: 'monospace', backgroundColor: c.raised, borderRadius: 8, padding: 10 },
});
