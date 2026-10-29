// Импорт и резервная копия. Работает без интернета: файл выбирается на телефоне.
//  • Apple Health: export.zip (или export.xml) из «Здоровья» на iPhone. Архив читается
//    по оглавлению: распаковывается только export.xml, кусками — большой файл не держится в памяти.
//  • CSV: дата и показатели (шаги, сон, вес, пульс покоя, давление) → ручные записи.
//  • Резервная копия Epimely: профиль, записи и импорт в одном файле JSON.
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { DecodeUTF8 } from 'fflate';
import { findZipEntry, streamZipEntry } from './zipRead';
import { createAppleParser } from './appleHealth';
import { HISTORY_DAYS, addDays, startOfDay } from './metrics';

const CHUNK = 1 << 20; // 1 МБ за раз
const STORE = 'apple-import.json';
const tick = () => new Promise((r) => setTimeout(r, 0));

// Выбор файла. null — пользователь отменил.
export async function pickFile(mimeTypes) {
  const res = await DocumentPicker.getDocumentAsync({ type: mimeTypes, copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets || !res.assets.length) return null;
  return res.assets[0]; // { uri, name, size, mimeType }
}

// Удалить временную копию выбранного файла.
function dropCopy(uri) {
  try { const f = new File(uri); if (f.exists) f.delete(); } catch (e) {}
}

// Apple Health: потоковое чтение. onProgress(0…1).
export async function importAppleHealth(asset, onProgress = () => {}) {
  const parser = createAppleParser(addDays(startOfDay(new Date()), -HISTORY_DAYS).getTime());
  let rest = '';
  const decoder = new DecodeUTF8((text, final) => {
    const s = rest + text;
    const parts = s.split('\n');
    rest = final ? '' : parts.pop();
    for (const l of parts) parser.line(l);
    if (final && rest) parser.line(rest);
  });
  const isZip = /\.zip$/i.test(asset.name || '') || /zip/.test(asset.mimeType || '');
  const file = new File(asset.uri);
  const handle = file.open();
  try {
    // Обёртка: размер берём у файла, а если его нет — из сведений выбора файла.
    const h = {
      size: handle.size || asset.size || 0,
      get offset() { return handle.offset; },
      set offset(v) { handle.offset = v; },
      readBytes: (n) => handle.readBytes(n),
    };
    if (isZip) {
      // Основной файл: apple_health_export/export.xml (не export_cda.xml).
      const entry = await findZipEntry(h, (n) => /(^|\/)export\.xml$/.test(n));
      if (!entry) throw new Error('noExport');
      await streamZipEntry(h, entry, (data, final) => decoder.push(data, final), onProgress, CHUNK, tick);
    } else {
      const size = handle.size || asset.size || 1;
      for (;;) {
        const bytes = await handle.readBytes(CHUNK);
        const final = !bytes.length || handle.offset >= size;
        decoder.push(bytes, final);
        onProgress(Math.min(1, (handle.offset || 0) / size));
        if (final) break;
        await tick(); // даём экрану обновиться
      }
    }
  } finally {
    handle.close();
    dropCopy(asset.uri);
  }
  const store = parser.result();
  store.at = Date.now();
  store.file = asset.name || '';
  return store;
}

// Сохранённый импорт Apple Health (файл в памяти приложения — может быть большим).
export function loadImported() {
  try {
    const f = new File(Paths.document, STORE);
    return f.exists ? JSON.parse(f.textSync()) : null;
  } catch (e) {
    return null;
  }
}

export function saveImported(store) {
  const f = new File(Paths.document, STORE);
  if (!store) {
    if (f.exists) f.delete();
    return;
  }
  if (!f.exists) f.create();
  f.writeSync(JSON.stringify(store));
}

// ——— CSV ———
// Первая строка — заголовки. Разделитель «,» или «;». Дата: ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.
// Столбцы (рус./англ.): дата/date, шаги/steps, сон/sleep (часы), вес/weight (кг),
// пульс/rhr (пульс покоя), верхнее/sys и нижнее/dia (давление).
const COLS = {
  date: ['дата', 'date', 'day', 'день'],
  steps: ['шаги', 'steps', 'step'],
  sleep: ['сон', 'sleep', 'sleep_hours', 'сон_ч'],
  weight: ['вес', 'weight', 'weight_kg', 'кг'],
  rhr: ['пульс', 'пульс_покоя', 'rhr', 'resting_hr', 'resting heart rate'],
  sys: ['верхнее', 'sys', 'systolic', 'сист'],
  dia: ['нижнее', 'dia', 'diastolic', 'диаст'],
};

function csvDate(s) {
  const t = String(s || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
const csvNum = (s) => {
  const t = String(s == null ? '' : s).trim().replace(/\s/g, '').replace(',', '.');
  return t ? Number(t) : NaN;
};

// Текст CSV → { entries, rows, skipped }.
export function parseCSV(text) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { entries: [], rows: 0, skipped: 0 };
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const head = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
  const idx = {};
  for (const [k, names] of Object.entries(COLS)) idx[k] = head.findIndex((h) => names.includes(h));
  if (idx.date < 0) throw new Error('noDate');
  const today = new Date();
  const entries = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const date = csvDate(cells[idx.date]);
    if (!date || new Date(date + 'T12:00:00') > today) { skipped++; continue; }
    const [y, mo, d] = date.split('-').map(Number);
    const noon = new Date(y, mo - 1, d, 12).getTime();
    const id = (type) => `csv-${date}-${type}`;
    const get = (k) => (idx[k] >= 0 ? csvNum(cells[idx[k]]) : NaN);
    const steps = get('steps'), sleep = get('sleep'), weight = get('weight'), rhr = get('rhr'), sys = get('sys'), dia = get('dia');
    let any = false;
    if (steps >= 0 && steps <= 100000) { entries.push({ id: id('steps'), type: 'steps', date, t: noon, steps: Math.round(steps) }); any = true; }
    if (sleep >= 1 && sleep <= 16) {
      // Сон в часах: считаем, что проснулся(ась) в 07:00 этого дня.
      const end = new Date(y, mo - 1, d, 7).getTime();
      entries.push({ id: id('sleep'), type: 'sleep', date, start: end - sleep * 3600000, end, t: end });
      any = true;
    }
    if (weight >= 25 && weight <= 350) { entries.push({ id: id('weight'), type: 'weight', date, t: noon, kg: weight }); any = true; }
    if (rhr >= 25 && rhr <= 130) { entries.push({ id: id('rhr'), type: 'rhr', date, t: noon, bpm: rhr }); any = true; }
    if (sys >= 60 && sys <= 260 && dia >= 30 && dia <= 160 && dia < sys) { entries.push({ id: id('bp'), type: 'bp', date, t: noon, sys, dia }); any = true; }
    if (!any) skipped++;
  }
  return { entries, rows: lines.length - 1, skipped };
}

export async function readCSV(asset) {
  try {
    return parseCSV(await new File(asset.uri).text());
  } finally {
    dropCopy(asset.uri);
  }
}

// ——— Резервная копия ———
export async function shareBackup(data) {
  const name = `epimely-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.writeSync(JSON.stringify({ app: 'Epimely', kind: 'backup', v: 1, exportedAt: new Date().toISOString(), ...data }));
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Epimely' });
}

export async function readBackup(asset) {
  try {
    const data = JSON.parse(await new File(asset.uri).text());
    if (!data || data.app !== 'Epimely' || data.kind !== 'backup') throw new Error('notBackup');
    return data;
  } finally {
    dropCopy(asset.uri);
  }
}
