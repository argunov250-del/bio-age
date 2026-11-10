// Локальная модель: путь к GGUF, параметры initLlama и очистка <think>. Нативные модули — заглушки.
jest.mock('react-native', () => ({
  Platform: { OS: 'android', Version: 34 },
  PermissionsAndroid: {
    PERMISSIONS: { READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE' },
    request: jest.fn(async () => 'granted'),
  },
}), { virtual: true });

const MODEL = 'qwen3-4b-q5_k_m.gguf';
const DEST = 'file:///mock-docs/' + MODEL;
const DOWNLOAD = 'file:///storage/emulated/0/Download/' + MODEL;
const BIG = 2800000000;

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
  return { llm: require('../lib/llm'), FS, llama, picker };
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
  test('копия в документах: init с mlock и GPU, ответ без think', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    const completion = jest.fn(async () => ({ text: '<think>ход</think>Ложись раньше.' }));
    llama.initLlama.mockResolvedValue({ completion });
    await expect(llm.askChiron('Как спать?')).resolves.toBe('Ложись раньше.');
    expect(llama.initLlama).toHaveBeenCalledTimes(1);
    expect(llama.initLlama).toHaveBeenCalledWith(expect.objectContaining({
      model: DEST, use_mlock: true, n_ctx: 2048, n_gpu_layers: 99,
    }));
    const arg = completion.mock.calls[0][0];
    expect(arg.n_predict).toBe(120);
    expect(arg.temperature).toBe(0.5);
    expect(arg.stop).toEqual(['</s>', 'user:', 'assistant:']);
    expect(arg.messages[0].role).toBe('system');
    expect(arg.messages[0].content).toMatch(/Хирон/);
    expect(arg.messages[1]).toEqual({ role: 'user', content: 'Как спать?' });
    llama.initLlama.mockClear();
    await expect(llm.askChiron('Ещё')).resolves.toBe('Ложись раньше.');
    expect(llama.initLlama).not.toHaveBeenCalled();
  });

  test('если mlock/GPU не встали, повтор на CPU', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    llama.initLlama.mockRejectedValueOnce(new Error('mlock')).mockResolvedValueOnce({
      completion: async () => ({ content: 'Ответ с CPU.' }),
    });
    await expect(llm.askChiron('?')).resolves.toBe('Ответ с CPU.');
    expect(llama.initLlama).toHaveBeenNthCalledWith(2, expect.objectContaining({ use_mlock: false, n_gpu_layers: 0, n_ctx: 2048, model: DEST }));
  });

  test('файл в Загрузках копируется в документы приложения', async () => {
    const { llm, FS, llama } = fresh();
    let copied = false;
    FS.copyAsync.mockImplementation(async () => { copied = true; });
    FS.getInfoAsync.mockImplementation(async (uri) => {
      if (uri === DEST) return copied ? present() : absent();
      if (uri === DOWNLOAD) return present();
      return absent();
    });
    llama.initLlama.mockResolvedValue({ completion: async () => ({ text: 'Скопировано.' }) });
    await expect(llm.askChiron('?')).resolves.toBe('Скопировано.');
    expect(FS.copyAsync).toHaveBeenCalledWith({ from: DOWNLOAD, to: DEST });
    expect(llama.initLlama.mock.calls[0][0].model).toBe(DEST);
  });

  test('нет файла и выбор отменён — detail с путём, модель не грузится', async () => {
    const { llm, FS, llama, picker } = fresh();
    FS.getInfoAsync.mockResolvedValue(absent());
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught;
    try { await llm.askChiron('?'); } catch (e) { caught = e; }
    expect(caught && caught.message).toBe('Не получилось ответить. Попробуй ещё раз.');
    expect(caught.detail).toMatch(/Нет файла/);
    expect(caught.detail).toMatch(/qwen3-4b-q5_k_m\.gguf/);
    expect(picker.getDocumentAsync).toHaveBeenCalled();
    expect(llama.initLlama).not.toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  test('GPU и CPU оба упали — в detail обе причины', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    llama.initLlama.mockRejectedValueOnce(new Error('opencl q5')).mockRejectedValueOnce(new Error('no mlock'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught;
    try { await llm.askChiron('?'); } catch (e) { caught = e; }
    expect(caught.detail).toMatch(/opencl q5/);
    expect(caught.detail).toMatch(/no mlock/);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  test('выбранный файл копируется в документы, исходник не удаляется', async () => {
    const { llm, FS, llama, picker } = fresh();
    let copied = false;
    const pickedUri = 'content://downloads/qwen.gguf';
    picker.getDocumentAsync.mockResolvedValue({ canceled: false, assets: [{ uri: pickedUri }] });
    FS.copyAsync.mockImplementation(async () => { copied = true; });
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST && copied ? present() : absent()));
    llama.initLlama.mockResolvedValue({ completion: async () => ({ text: 'Из выбора.' }) });
    await expect(llm.askChiron('?')).resolves.toBe('Из выбора.');
    expect(FS.copyAsync).toHaveBeenCalledWith({ from: pickedUri, to: DEST });
    expect(FS.deleteAsync).not.toHaveBeenCalled();
    expect(llama.initLlama.mock.calls[0][0].model).toBe(DEST);
  });
});
