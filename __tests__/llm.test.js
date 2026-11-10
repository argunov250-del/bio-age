// Локальная модель: путь к GGUF, параметры initLlama и очистка <think>. Нативные модули — заглушки.
jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 34 },
  PermissionsAndroid: {
    PERMISSIONS: { READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE' },
    request: jest.fn(async () => 'granted'),
  },
}), { virtual: true });

const MODEL = 'chiron-0.6b-q4_k_m.gguf';
const DEST = 'file:///mock-docs/' + MODEL;
const BIG = 400000000;

function absent() { return { exists: false, isDirectory: false, size: 0 }; }
function present() { return { exists: true, isDirectory: false, size: BIG }; }

function fresh() {
  jest.resetModules();
  const FS = require('expo-file-system/legacy');
  const llama = require('llama.rn');
  const picker = require('expo-document-picker');
  FS.documentDirectory = 'file:///mock-docs/';
  FS.getInfoAsync.mockReset();
  FS.copyAsync.mockReset();
  FS.copyAsync.mockResolvedValue(undefined);
  FS.deleteAsync.mockReset();
  FS.deleteAsync.mockResolvedValue(undefined);
  picker.getDocumentAsync.mockReset();
  picker.getDocumentAsync.mockResolvedValue({ canceled: true, assets: [] });
  llama.initLlama.mockReset();
  const llm = require('../lib/llm');
  llm.setChironServer({ url: '', key: '' });
  return { llm, FS, llama, picker };
}

describe('cleanAnswer', () => {
  test('срезает блок think и края', () => {
    const { llm } = fresh();
    expect(llm.cleanAnswer('<think>скрыто</think>  Короткий ответ.  ')).toBe('Короткий ответ.');
    expect(llm.cleanAnswer('До <think>и дальше')).toBe('До');
    expect(llm.cleanAnswer('  просто текст  ')).toBe('просто текст');
    expect(llm.cleanAnswer('')).toBe('');
  });
});

describe('askChiron', () => {
  test('готовый файл: CPU, mmap, без think, второй вопрос без повторной загрузки', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    const deltas = [];
    const completion = jest.fn(async (params, cb) => {
      if (cb) cb({ token: 'Ло' });
      return { text: '<think>ход</think>Ложись раньше.' };
    });
    llama.initLlama.mockResolvedValue({ completion });
    await expect(llm.askChiron('Как спать?', { onDelta: (t) => deltas.push(t) })).resolves.toBe('Ложись раньше.');
    expect(deltas).toEqual(['Ло']);
    expect(llama.initLlama).toHaveBeenCalledWith(expect.objectContaining({
      model: DEST, use_mlock: false, use_mmap: true, n_ctx: 2048, n_threads: 4, n_gpu_layers: 0,
    }));
    const arg = completion.mock.calls[0][0];
    expect(arg.enable_thinking).toBe(false);
    expect(arg.messages[0].content).toMatch(/наставник Epimely/);
    expect(arg.messages[1]).toEqual({ role: 'user', content: 'Как спать?' });
    llama.initLlama.mockClear();
    await expect(llm.askChiron('Ещё')).resolves.toBe('Ложись раньше.');
    expect(llama.initLlama).not.toHaveBeenCalled();
  });

  test('нет файла: качает с Hugging Face, при ошибке — зеркало GitHub', async () => {
    const { llm, FS, llama } = fresh();
    let downloaded = false;
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST && downloaded ? present() : absent()));
    FS.createDownloadResumable.mockImplementation((url, dest) => ({
      downloadAsync: jest.fn(async () => {
        if (url.indexOf('huggingface.co') !== -1) throw new Error('hf');
        downloaded = true;
        return { uri: dest };
      }),
      resumeAsync: jest.fn(),
      savable: () => ({ url, resumeData: '1' }),
    }));
    llama.initLlama.mockResolvedValue({ completion: async () => ({ text: 'С зеркала.' }) });
    await expect(llm.askChiron('?')).resolves.toBe('С зеркала.');
    const urls = FS.createDownloadResumable.mock.calls.map((c) => c[0]);
    expect(urls[0]).toBe('https://huggingface.co/MaksimSun/chiron-gguf/resolve/main/chiron-0.6b-q4_k_m.gguf');
    expect(urls[1]).toBe('https://github.com/argunov250-del/bio-age/releases/download/android-latest/chiron.gguf');
    expect(llama.initLlama.mock.calls[0][0].n_gpu_layers).toBe(0);
  });

  test('оба адреса недоступны — ошибка без initLlama', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockResolvedValue(absent());
    FS.createDownloadResumable.mockImplementation(() => { throw new Error('сеть'); });
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught;
    try { await llm.askChiron('?'); } catch (e) { caught = e; }
    expect(caught.detail).toMatch(/сеть/);
    expect(llama.initLlama).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('сервер Хирона', () => {
  afterEach(() => { delete global.fetch; });
  test('заданный адрес идёт на сервер, а не в llama.rn', async () => {
    const { llm, llama } = fresh();
    llm.setChironServer({ url: 'http://chiron.test', key: 'k' });
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    let caught;
    try { await llm.askChiron('Как спать?'); } catch (e) { caught = e; }
    expect(caught.offline).toBe(true);
    expect(llama.initLlama).not.toHaveBeenCalled();
    expect(global.fetch.mock.calls[0][0]).toBe('http://chiron.test/v1/chat/completions');
  });
  test('ответ сервера очищается от think и уходит с ключом', async () => {
    const { llm } = fresh();
    llm.setChironServer({ local: false, url: 'http://chiron.test', key: 'k' });
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '<think>x</think>Ложись раньше.' } }] }) }));
    await expect(llm.askChiron('Как спать?')).resolves.toBe('Ложись раньше.');
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers.Authorization).toBe('Bearer k');
    const body = JSON.parse(opts.body);
    expect(body.stream).toBe(true);
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(body.messages[0].content).toMatch(/наставник Epimely/);
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Как спать?' });
    expect(opts.signal).toBeTruthy();
    expect(global.fetch.mock.calls[0][0]).toBe('http://chiron.test/v1/chat/completions');
  });
  test('поток сервера отдаёт токены, обрыв через 60 секунд', async () => {
    const { llm } = fresh();
    llm.setChironServer({ url: 'http://chiron.test', key: '' });
    const deltas = [];
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => 'data: {"choices":[{"delta":{"content":"Ло"}}]}\n\ndata: [DONE]\n',
    }));
    await expect(llm.askChiron('?', { onDelta: (t) => deltas.push(t) })).resolves.toBe('Ло');
    expect(deltas).toEqual(['Ло']);
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, opts) => new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () => {
        const e = new Error('aborted');
        e.name = 'AbortError';
        reject(e);
      });
    }));
    const pending = llm.askChiron('?');
    const assertion = expect(pending).rejects.toMatchObject({ offline: true, detail: 'Сервер Хирона не ответил вовремя' });
    await jest.advanceTimersByTimeAsync(60000);
    await assertion;
    jest.useRealTimers();
  });
});
