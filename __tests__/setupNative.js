// llama.rn и legacy-файловая система не ставятся в тестовый package.json:
// нативные архивы качает postinstall. Виртуальные заглушки, чтобы lib/llm.js загружался.
jest.mock('llama.rn', () => ({
  __esModule: true,
  initLlama: jest.fn(async () => ({ completion: jest.fn(async () => ({ text: '' })) })),
}), { virtual: true });

jest.mock('expo-file-system/legacy', () => ({
  __esModule: true,
  documentDirectory: 'file:///mock-docs/',
  getInfoAsync: jest.fn(async () => ({ exists: false, isDirectory: false, size: 0 })),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}), { virtual: true });

jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}), { virtual: true });
