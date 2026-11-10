const { authorize, RateLimit } = require('../chiron-server/limit');

test('ключ совпадает целиком и без него доступ закрыт', () => {
  expect(authorize('Bearer secret', 'secret')).toBe(true);
  expect(authorize('bearer secret', 'secret')).toBe(true);
  expect(authorize('Bearer other', 'secret')).toBe(false);
  expect(authorize('', 'secret')).toBe(false);
  expect(authorize('Bearer secret', '')).toBe(false);
});

test('лимит режет частоту и не хранит текст', () => {
  const lim = new RateLimit(2);
  expect(lim.allow('1.2.3.4')).toBe(true);
  expect(lim.allow('1.2.3.4')).toBe(true);
  expect(lim.allow('1.2.3.4')).toBe(false);
  expect(lim.allow('5.6.7.8')).toBe(true);
  const dumped = JSON.stringify([...lim.hits.values()]);
  expect(dumped).not.toMatch(/сон|sleep|вопрос/);
});
