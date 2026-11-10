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
      model: DEST, use_mlock: false, use_mmap: true, n_ctx: 1024, n_batch: 256, n_threads: 4, n_gpu_layers: 0, no_gpu_devices: true,
    }));
    const arg = completion.mock.calls[0][0];
    expect(arg.n_predict).toBe(120);
    expect(arg.temperature).toBe(0.5);
    expect(arg.enable_thinking).toBe(false);
    expect(arg.stop).toEqual(['</s>', '<|im_end|>', '<|endoftext|>']);
    expect(arg.messages[0].role).toBe('system');
    expect(arg.messages[0].content).toMatch(/Хирон/);
    expect(arg.messages[1]).toEqual({ role: 'user', content: 'Как спать?' });
    llama.initLlama.mockClear();
    await expect(llm.askChiron('Ещё')).resolves.toBe('Ложись раньше.');
    expect(llama.initLlama).not.toHaveBeenCalled();
  });

  test('файл в Загрузках открывается напрямую, без копии', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DOWNLOAD ? present() : absent()));
    llama.initLlama.mockResolvedValue({ completion: async () => ({ text: 'С диска.' }) });
    await expect(llm.askChiron('?')).resolves.toBe('С диска.');
    expect(FS.copyAsync).not.toHaveBeenCalled();
    expect(llama.initLlama.mock.calls[0][0].model).toBe(DOWNLOAD);
    expect(llama.initLlama.mock.calls[0][0].n_gpu_layers).toBe(0);
    expect(llama.initLlama.mock.calls[0][0].use_mlock).toBe(false);
  });

  test('только блок think — ошибка с куском ответа, а не пустая строка', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    llama.initLlama.mockResolvedValue({ completion: async () => ({ text: '<think>долго думаю и не закрываю' }) });
    let caught;
    try { await llm.askChiron('?'); } catch (e) { caught = e; }
    expect(caught.detail).toMatch(/Пустой ответ/);
    expect(caught.detail).toMatch(/think/);
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

  test('сбой загрузки CPU попадает в detail', async () => {
    const { llm, FS, llama } = fresh();
    FS.getInfoAsync.mockImplementation(async (uri) => (uri === DEST ? present() : absent()));
    llama.initLlama.mockRejectedValue(new Error('mmap failed'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caught;
    try { await llm.askChiron('?'); } catch (e) { caught = e; }
    expect(caught.detail).toMatch(/mmap failed/);
    expect(llama.initLlama).toHaveBeenCalledTimes(1);
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
