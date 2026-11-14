// Нативные модули, которых нет в тестовом окружении: виртуальные заглушки.
jest.mock('expo-document-picker', () => ({
  __esModule: true,
  getDocumentAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
}), { virtual: true });
