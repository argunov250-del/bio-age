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
  readAsStringAsync: jest.fn(async () => { throw new Error('no resume'); }),
  writeAsStringAsync: jest.fn(async () => {}),
  createDownloadResumable: jest.fn((url, dest) => ({
    downloadAsync: jest.fn(async () => ({ uri: dest })),
    resumeAsync: jest.fn(async () => ({ uri: dest })),
    savable: () => ({ url, fileUri: dest, resumeData: '1' }),
  })),
}), { virtual: true });

jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}), { virtual: true });
