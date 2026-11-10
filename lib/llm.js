// Локальная модель Хирона (Qwen3-4B, GGUF) через llama.rn.
// Файл, который кладёт пользователь: /storage/emulated/0/Download/qwen3-4b-q5_k_m.gguf.
// На Android 11+ чужая папка «Загрузки» часто не читается (scoped storage), а llama.cpp
// открывает только обычный путь. Поэтому копия лежит в документах приложения: её видно
// без отдельного разрешения и после перезапуска. Если «Загрузки» недоступны, один раз
// спрашиваем файл через системный выбор — и тоже копируем в документы.
import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, PermissionsAndroid } from 'react-native';

const MODEL_NAME = 'qwen3-4b-q5_k_m.gguf';
const DOWNLOAD_PATH = '/storage/emulated/0/Download/' + MODEL_NAME;
// Меньше 100 МБ — это не вес Q5 модели: обрезанную копию не используем.
const MIN_BYTES = 100 * 1024 * 1024;

let context = null;
let pending = null;

const fileUri = (path) => (path && path.indexOf('://') === -1 ? 'file://' + path : path);

async function fileOk(uri) {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info || !info.exists || info.isDirectory) return false;
    if (typeof info.size === 'number' && info.size < MIN_BYTES) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// Android 10 и старше: чтение «Загрузок» просит READ_EXTERNAL_STORAGE.
// С 13-й версии это разрешение не открывает произвольный .gguf — дальше выбор файла.
async function allowPublicRead() {
  try {
    if (!Platform || Platform.OS !== 'android' || Number(Platform.Version) >= 33) return;
    if (!PermissionsAndroid || !PermissionsAndroid.request || !PermissionsAndroid.PERMISSIONS) return;
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  } catch (e) { /* без разрешения остаётся выбор файла */ }
}

async function localModelUri() {
  const root = FileSystem.documentDirectory || '';
  const dest = root ? root + MODEL_NAME : '';
  if (dest && await fileOk(dest)) return dest;
  await allowPublicRead();
  const sources = [fileUri(DOWNLOAD_PATH), DOWNLOAD_PATH];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    if (!(await fileOk(src))) continue;
    if (dest) {
      try {
        await FileSystem.copyAsync({ from: src, to: dest });
        if (await fileOk(dest)) return dest;
      } catch (e) { /* исходный файл всё ещё можно отдать модели */ }
    }
    return src.indexOf('://') === -1 ? fileUri(src) : src;
  }
  const picked = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  const asset = picked && !picked.canceled && picked.assets && picked.assets[0];
  if (!asset || !asset.uri || !dest) throw new Error('Модель не найдена по пути: ' + DOWNLOAD_PATH);
  await FileSystem.copyAsync({ from: asset.uri, to: dest });
  try { if (asset.uri !== dest) await FileSystem.deleteAsync(asset.uri, { idempotent: true }); } catch (e) { /* кэш почистит система */ }
  if (!(await fileOk(dest))) throw new Error('Модель не найдена по пути: ' + DOWNLOAD_PATH);
  return dest;
}

async function openContext() {
  const model = await localModelUri();
  const common = { model, n_ctx: 2048 };
  try {
    // Как просил владелец: mlock и слои на GPU. Q5_K_M на OpenCL (только Adreno, Q4_0/Q6_K) может не встать.
    return await initLlama({ ...common, use_mlock: true, n_gpu_layers: 99 });
  } catch (e) {
    return await initLlama({ ...common, use_mlock: false, n_gpu_layers: 0 });
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
    return 'Не получилось ответить. Попробуй ещё раз.';
  }
}
