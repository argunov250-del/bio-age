import { FACTS, FACT_COUNT } from '../lib/knowledge';
import { tr, RU } from '../lib/i18n';

describe('knowledge base', () => {
  test('FACT_COUNT matches', () => {
    expect(FACT_COUNT).toBe(Object.keys(FACTS).length);
    expect(FACT_COUNT).toBeGreaterThan(0);
  });
  test.each(Object.entries(FACTS))('fact %s has text and a source', (key, f) => {
    expect(typeof f.text).toBe('string');
    expect(f.text.trim().length).toBeGreaterThan(10);
    expect(typeof f.source).toBe('string');
    expect(f.source.trim().length).toBeGreaterThan(3);
  });
});

describe('i18n', () => {
  test('RU is boolean', () => expect(typeof RU).toBe('boolean'));
  test('tr returns a string, unknown keys pass through', () => {
    expect(typeof tr('Выбери пол')).toBe('string');
    expect(tr('нет такой строки 12345')).toBe('нет такой строки 12345');
    expect(tr('')).toBe('');
  });
  test('tr translates known key when not RU', () => {
    if (!RU) expect(tr('Выбери пол')).toBe('Choose your sex');
    else expect(tr('Выбери пол')).toBe('Выбери пол');
  });
});
