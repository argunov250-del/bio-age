// Подставляет закоммиченный keystore в release-сборку после expo prebuild.
// Пароль и alias совпадают с android-signing/epimely-release.keystore.
const fs = require('fs');

const file = process.argv[2] || 'android/app/build.gradle';
let g = fs.readFileSync(file, 'utf8');
if (!g.includes("storeFile file('epimely-release.keystore')")) {
  const at = g.indexOf('signingConfigs');
  const brace = g.indexOf('{', at);
  if (at < 0 || brace < 0) throw new Error('signingConfigs block not found');
  const block = [
    '',
    '        release {',
    "            storeFile file('epimely-release.keystore')",
    "            storePassword 'epimely-test'",
    "            keyAlias 'epimely'",
    "            keyPassword 'epimely-test'",
    '        }',
  ].join('\n');
  g = g.slice(0, brace + 1) + block + g.slice(brace + 1);
}
const types = g.indexOf('buildTypes');
const rel = types < 0 ? -1 : g.indexOf('release {', types);
const needle = 'signingConfig signingConfigs.debug';
const hit = rel < 0 ? -1 : g.indexOf(needle, rel);
if (hit < 0) throw new Error('release signingConfig not found');
g = g.slice(0, hit) + 'signingConfig signingConfigs.release' + g.slice(hit + needle.length);
if (!g.includes('signingConfig signingConfigs.release')) throw new Error('release signing was not applied');
fs.writeFileSync(file, g);
