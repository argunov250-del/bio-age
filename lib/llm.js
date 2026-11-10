// Локальная модель Хирона (Qwen3-4B, GGUF) через llama.rn.
// Файл владельца: /storage/emulated/0/Download/qwen3-4b-q5_k_m.gguf.
// На Android 11+ (телефон владельца — Android 16) путь в «Загрузках» не читается,
// пока не включено «Все файлы». llama.cpp открывает только обычный файл, поэтому
// рабочая копия лежит в документах приложения. Если «Загрузки» закрыты, один раз
// открываем системный экран доступа и затем выбор файла.
import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, PermissionsAndroid } from 'react-native';

const MODEL_NAME = 'qwen3-4b-q5_k_m.gguf';
const DOWNLOAD_PATH = '/storage/emulated/0/Download/' + MODEL_NAME;
const PKG = 'com.bioage.proto';
// Меньше 100 МБ в документах приложения — обрезанная копия, её не грузим.
const MIN_BYTES = 100 * 1024 * 1024;

let context = null;
let pending = null;
let askedFiles = false;

const fileUri = (path) => (path && path.indexOf('://') === -1 ? 'file://' + path : path);

export function shortError(e) {
  const m = !e ? 'неизвестная ошибка' : (typeof e === 'string' ? e : (e.message || String(e)));
  return String(m).replace(/\s+/g, ' ').trim().slice(0, 180);
}

async function infoOf(uri) {
  try { return await FileSystem.getInfoAsync(uri, { size: true }); } catch (e) { return null; }
}

// min — нижняя граница размера. Размер неизвестен (старый Android) не отвергаем.
function good(info, min) {
  if (!info || !info.exists || info.isDirectory) return false;
  if (typeof info.size === 'number' && info.size < min) return false;
  return true;
}

async function allowPublicRead() {
  try {
    if (!Platform || Platform.OS !== 'android' || Number(Platform.Version) >= 33) return;
    if (!PermissionsAndroid || !PermissionsAndroid.request || !PermissionsAndroid.PERMISSIONS) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  } catch (e) { /* без разрешения остаётся «Все файлы» или выбор файла */ }
}

// Android 11+: READ_EXTERNAL_STORAGE не открывает чужой .gguf. Нужен отдельный экран.
async function requestAllFilesAccess() {
  if (askedFiles || !Platform || Platform.OS !== 'android' || Number(Platform.Version) < 30) return;
  askedFiles = true;
  try {
    const IntentLauncher = require('expo-intent-launcher');
    if (typeof IntentLauncher.startActivityAsync !== 'function') return;
    await IntentLauncher.startActivityAsync('android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION', { data: 'package:' + PKG });
  } catch (e) { /* на этой прошивке экрана нет — дальше выбор файла */ }
}

async function dropTiny(uri) {
  const info = await infoOf(uri);
  if (info && info.exists && !info.isDirectory && typeof info.size === 'number' && info.size < MIN_BYTES) {
    try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch (e) { /* копирование перезапишет */ }
  }
}

async function copyIn(src, dest) {
  await dropTiny(dest);
  await FileSystem.copyAsync({ from: src, to: dest });
  if (await good(await infoOf(dest), MIN_BYTES)) return dest;
  throw new Error('Копия модели в папке приложения слишком мала или не читается');
}

async function fromDownload(dest) {
  const src = fileUri(DOWNLOAD_PATH);
  if (!(await good(await infoOf(src), 1))) return '';
  try { return await copyIn(src, dest); } catch (e) { return src; }
}

async function localModelUri() {
  const root = FileSystem.documentDirectory || '';
  if (!root) throw new Error('Нет папки документов приложения');
  const dest = root + MODEL_NAME;
  if (await good(await infoOf(dest), MIN_BYTES)) return dest;
  await allowPublicRead();
  const direct = await fromDownload(dest);
  if (direct) return direct;
  await requestAllFilesAccess();
  const after = await fromDownload(dest);
  if (after) return after;
  // Не копируем 3 ГБ в кэш выбора: content:// сразу в документы приложения.
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: false, multiple: false });
  const asset = picked && !picked.canceled && picked.assets && picked.assets[0];
  if (!asset || !asset.uri) throw new Error('Нет файла ' + DOWNLOAD_PATH + '. Включите «Все файлы» для Epimely или выберите .gguf');
  try {
    return await copyIn(asset.uri, dest);
  } catch (e) {
    throw new Error('Не удалось скопировать модель: ' + shortError(e));
  }
}

async function openContext() {
  const model = await localModelUri();
  const common = { model, n_ctx: 2048 };
  let gpuErr;
  try {
    // Запрос владельца: mlock и GPU. Q5_K_M на OpenCL (Adreno, только Q4_0/Q6_K) часто бросает ошибку, не зависает.
    return await initLlama({ ...common, use_mlock: true, n_gpu_layers: 99 });
  } catch (e) { gpuErr = e; }
  try {
    return await initLlama({ ...common, use_mlock: false, n_gpu_layers: 0 });
  } catch (e) {
    throw new Error('GPU: ' + shortError(gpuErr) + ' | CPU: ' + shortError(e));
  }
}

async function getContext() {
  if (context) return context;
  if (!pending) {
    pending = openContext().then((ctx) => { context = ctx; return ctx; }).finally(() => { pending = null; });
  }
  return pending;
}

export function cleanAnswer(raw) {
  if (!raw) return '';
  const endThink = raw.indexOf('</think>');
  if (endThink !== -1) return raw.slice(endThink + 8).trim();
  const startThink = raw.indexOf('<think>');
  if (startThink !== -1) return raw.slice(0, startThink).trim();
  return raw.trim();
}

const SYSTEM = 'Ты Хирон — мудрый наставник. Отвечай только по-русски, коротко и сразу (1–3 предложения). Без списков, без заголовков и без тегов <think>. Говори спокойно и по делу. Ты не ставишь диагнозы.';
const FAIL = 'Не получилось ответить. Попробуй ещё раз.';

export async function askChiron(question) {
  try {
    const ctx = await getContext();
    const result = await ctx.completion({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: question || '' },
      ],
      n_predict: 120,
      temperature: 0.5,
      stop: ['</s>', 'user:', 'assistant:'],
    });
    return cleanAnswer(result.text || result.content || '');
  } catch (e) {
    console.error(e);
    const err = new Error(FAIL);
    err.detail = shortError(e);
    throw err;
  }
}
