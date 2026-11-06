// Слова не рвутся посреди (RU/EN): заголовки ужимаются, а не переносятся по буквам.
import fs from 'fs';
import path from 'path';
import { fit } from '../lib/fit';
import { EN_DICT } from '../lib/i18n';

const LIB = path.resolve(__dirname, '../lib');
const read = (f) => fs.readFileSync(path.join(LIB, f), 'utf8');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'coach' ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []));

test('fit(): строки, ужатие шрифта, без переноса слогов', () => {
  expect(fit(2, 0.6)).toMatchObject({ numberOfLines: 2, adjustsFontSizeToFit: true, minimumFontScale: 0.6, textBreakStrategy: 'simple', android_hyphenationFrequency: 'none' });
});

test('ui.js: заголовки, плитки, статы, чипы, табы используют fit()', () => {
  const ui = read('ui.js');
  for (const style of ['s.section,', 's.heroTitle', 's.tileTitle', 's.statVal', 's.stat,', 's.chipText', 's.tabText', 's.headTitle', 's.btnText']) {
    const line = ui.split('\n').find((l) => l.includes('<Text style={[' + style));
    expect(line).toBeTruthy();
    expect(line).toMatch(/fit\(/);
  }
});

test('KineticText не рвёт слово: буквы сгруппированы по словам', () => {
  const m = read('motion.js');
  expect(m).toMatch(/groups\.map/);
  expect(m).toMatch(/onLayout/);
});

test('профиль: язык без двуязычных подписей', () => {
  const p = read('screens/ProfileScreen.js');
  expect(p).not.toMatch(/Язык \/ Language/);
  expect(p).not.toMatch(/Авто · Auto/);
  expect(EN_DICT['Язык']).toBe('Language');
  expect(EN_DICT['Авто']).toBe('Auto');
});

test('обзор длинных заголовков: title/Section/PageTitle не длиннее 30 знаков в RU и EN', () => {
  const found = new Set();
  for (const f of walk(LIB)) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:title=\{tr\(|<(?:Section|PageTitle)>\{tr\()'([^']+)'\)/g)) found.add(m[1]);
  }
  expect(found.size).toBeGreaterThan(20);
  const long = [];
  for (const ru of found) {
    const en = EN_DICT[ru] || ru;
    if (ru.length > 30) long.push(['ru', ru]);
    if (en.length > 30) long.push(['en', en]);
  }
  // Не больше 30 знаков: влезает в 2 строки крупного заголовка с ужатием шрифта.
  expect(long).toEqual([]);
});
