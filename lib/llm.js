// Хирон на телефоне: маленький GGUF (Qwen3-0.6B, Q4_K_M) качается в документы
// приложения и считается llama.rn на CPU. Если задан CHIRON_URL — вместо этого сервер.
// Папка «Загрузки» и «все файлы» не нужны.
import { initLlama } from 'llama.rn';
import * as FileSystem from 'expo-file-system/legacy';
import { CHIRON_URL, CHIRON_KEY, CHIRON_GGUF_URL, CHIRON_GGUF_MIRROR, CHIRON_MODEL_FILE } from './chironConfig';
import { CHIRON_SYSTEM } from './chironPersona';

const cfg = { url: CHIRON_URL || '', key: CHIRON_KEY || '', timeoutMs: 60000 };
// Готовый файл около 400 МБ. Меньше — докачка, не модель.
const MIN_BYTES = 200 * 1024 * 1024;

let context = null;
let pending = null;
const listeners = new Set();

export function setChironServer(next) {
  if (!next) return;
  if (next.url !== undefined) cfg.url = next.url || '';
  if (next.key !== undefined) cfg.key = next.key || '';
  if (next.timeoutMs) cfg.timeoutMs = next.timeoutMs;
}

export function onChironProgress(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(progress) {
  listeners.forEach((fn) => { try { fn(progress); } catch (e) { /* слушатель не должен ронять загрузку */ } });
}

export function shortError(e) {
  const m = !e ? 'неизвестная ошибка' : (typeof e === 'string' ? e : (e.message || String(e)));
  return String(m).replace(/\s+/g, ' ').trim().slice(0, 180);
}

async function infoOf(uri) {
  try { return await FileSystem.getInfoAsync(uri, { size: true }); } catch (e) { return null; }
}

function complete(info) {
  return !!(info && info.exists && !info.isDirectory && (typeof info.size !== 'number' || info.size >= MIN_BYTES));
}

async function pull(url, dest) {
  let resumeData;
  const resumePath = dest + '.resume.json';
  try {
    const raw = await FileSystem.readAsStringAsync(resumePath);
    const saved = JSON.parse(raw);
    if (saved && saved.url === url) resumeData = saved.resumeData;
  } catch (e) { resumeData = undefined; }
  if (typeof FileSystem.createDownloadResumable !== 'function') throw new Error('Скачивание модели недоступно');
  const task = FileSystem.createDownloadResumable(url, dest, {}, (p) => {
    const total = p && p.totalBytesExpectedToWrite;
    const written = p && p.totalBytesWritten || 0;
    emit({ phase: 'download', ratio: total ? written / total : 0 });
  }, resumeData);
  try {
    if (typeof FileSystem.writeAsStringAsync === 'function' && task.savable) {
      await FileSystem.writeAsStringAsync(resumePath, JSON.stringify({ url, resumeData: task.savable().resumeData }));
    }
  } catch (e) { /* докачка без записи состояния всё равно начнётся */ }
  const run = resumeData && task.resumeAsync ? task.resumeAsync.bind(task) : task.downloadAsync.bind(task);
  const result = await run();
  try { if (FileSystem.deleteAsync) await FileSystem.deleteAsync(resumePath, { idempotent: true }); } catch (e) { /* метка докачки не обязательна */ }
  return (result && result.uri) || dest;
}

async function localModelUri() {
  const root = FileSystem.documentDirectory || '';
  if (!root) throw new Error('Нет папки документов приложения');
  const dest = root + CHIRON_MODEL_FILE;
  if (complete(await infoOf(dest))) return dest;
  const urls = [CHIRON_GGUF_URL, CHIRON_GGUF_MIRROR];
  let last = 'Не удалось скачать модель';
  for (let i = 0; i < urls.length; i++) {
    try {
      await pull(urls[i], dest);
      if (complete(await infoOf(dest))) return dest;
      last = 'Файл модели слишком мал';
    } catch (e) { last = shortError(e); }
  }
  throw new Error(last);
}

async function openContext() {
  emit({ phase: 'load', ratio: 1 });
  const model = await localModelUri();
  const ctx = await initLlama({
    model,
    n_gpu_layers: 0,
    use_mmap: true,
    use_mlock: false,
    n_ctx: 2048,
    n_threads: 4,
  });
  emit({ phase: 'ready', ratio: 1 });
  return ctx;
}

function getContext() {
  if (context) return Promise.resolve(context);
  if (!pending) {
    pending = openContext().then((ctx) => { context = ctx; return ctx; }).finally(() => { pending = null; });
  }
  return pending;
}

export function prepareChiron() {
  if (cfg.url) return Promise.resolve(false);
  return getContext().then(() => true);
}

export function cleanAnswer(raw) {
  if (!raw) return '';
  const endThink = raw.indexOf('</think>');
  if (endThink !== -1) return raw.slice(endThink + 8).trim();
  const startThink = raw.indexOf('<think>');
  if (startThink !== -1) return raw.slice(0, startThink).trim();
  return raw.trim();
}

const FAIL = 'Не получилось ответить. Попробуй ещё раз.';

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error('Модель не ответила вовремя');
      err.offline = true;
      err.detail = err.message;
      reject(err);
    }, ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

async function askLocal(question, hooks) {
  try {
    const ctx = await getContext();
    let acc = '';
    const result = await withTimeout(ctx.completion({
      messages: [
        { role: 'system', content: CHIRON_SYSTEM },
        { role: 'user', content: question || '' },
      ],
      n_predict: 160,
      temperature: 0.5,
      enable_thinking: false,
      stop: ['</s>', '<|im_end|>', '<|endoftext|>'],
    }, (data) => {
      const tok = data && (data.token || data.content || '');
      if (!tok) return;
      acc += tok;
      if (hooks && hooks.onDelta) hooks.onDelta(tok, acc);
    }), cfg.timeoutMs);
    const raw = (result && (result.text || result.content)) || acc;
    return cleanAnswer(raw);
  } catch (e) {
    console.error(e);
    const err = new Error(FAIL);
    err.detail = e && e.detail ? e.detail : shortError(e);
    err.offline = !!(e && e.offline);
    throw err;
  }
}

async function readServerBody(res, hooks) {
  if (typeof res.text === 'function') {
    const raw = await res.text();
    const trimmed = String(raw || '').trim();
    if (trimmed.startsWith('{')) {
      const data = JSON.parse(trimmed);
      const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
      return cleanAnswer(content);
    }
    let acc = '';
    String(raw || '').split('\n').forEach((line) => {
      const t = line.trim();
      if (t.indexOf('data:') !== 0) return;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') return;
      let data;
      try { data = JSON.parse(payload); } catch (e) { return; }
      const choice = data && data.choices && data.choices[0] || {};
      const delta = choice.delta || choice.message || {};
      const tok = delta.content || '';
      if (!tok) return;
      acc += tok;
      if (hooks && hooks.onDelta) hooks.onDelta(tok, acc);
    });
    return cleanAnswer(acc);
  }
  const data = await res.json();
  const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || '';
  return cleanAnswer(content);
}

async function askServer(question, hooks) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    const res = await fetch(String(cfg.url).replace(/\/$/, '') + '/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(cfg.key ? { Authorization: 'Bearer ' + cfg.key } : {}) },
      body: JSON.stringify({
        model: 'chiron',
        stream: true,
        chat_template_kwargs: { enable_thinking: false },
        messages: [{ role: 'system', content: CHIRON_SYSTEM }, { role: 'user', content: question || '' }],
      }),
    });
    if (!res.ok) {
      const err = new Error('Сервер Хирона: ' + res.status);
      err.offline = true;
      err.detail = err.message;
      throw err;
    }
    return readServerBody(res, hooks);
  } catch (e) {
    if (e && e.offline) throw e;
    const err = new Error(e && e.name === 'AbortError' ? 'Сервер Хирона не ответил вовремя' : shortError(e));
    err.offline = true;
    err.detail = err.message;
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Пустой адрес — модель в документах приложения. Заданный CHIRON_URL — сервер.
export async function askChiron(question, hooks) {
  if (cfg.url) return askServer(question, hooks);
  return askLocal(question, hooks);
}
