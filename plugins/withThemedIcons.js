// Локальный Expo config plugin (Android): значки приложения A–D со светлой и тёмной
// версией (ночная тема системы), монохромным слоем и activity-alias для смены в настройках.
// Ресурсы генерируются при prebuild из assets/icons (PNG), ресайз — jimp-compact из @expo/image-utils.
// Имена alias совпадают с ожиданиями expo-alternate-app-icons: .MainActivityDefault (= B) и .MainActivityA/C/D.
// Сам плагин expo-alternate-app-icons НЕ подключаем — нужен только его нативный модуль.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const VARIANTS = ['A', 'B', 'C', 'D'];
const DEFAULT = 'B';
// Адаптивные слои 108 dp, обычные значки 48 dp.
const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function loadJimp() {
  const base = require.resolve('@expo/image-utils');
  return require(require.resolve('jimp-compact', { paths: [base] }));
}

const src = (dir, v, t, kind) => path.join(dir, `${v}-${t}-${kind}.png`);
const monoSrc = (dir, v) => path.join(dir, `${v}-mono.png`);

function available(dir) {
  return VARIANTS.filter((v) => ['light', 'dark'].every((t) => ['fg', 'bg', 'icon'].every((k) => fs.existsSync(src(dir, v, t, k)))) && fs.existsSync(monoSrc(dir, v)));
}

async function writePng(Jimp, from, size, to) {
  const img = await Jimp.read(from);
  img.resize(size, size, Jimp.RESIZE_BILINEAR);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, await img.getBufferAsync('image/png'));
}

const adaptiveXml = (n) => `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@mipmap/ic_launcher_${n}_background"/>
  <foreground android:drawable="@mipmap/ic_launcher_${n}_foreground"/>
  <monochrome android:drawable="@mipmap/ic_launcher_${n}_monochrome"/>
</adaptive-icon>
`;

async function generate(res, dir, variants) {
  const Jimp = loadJimp();
  const any = path.join(res, 'mipmap-anydpi-v26');
  fs.mkdirSync(any, { recursive: true });
  for (const v of variants) {
    const n = v.toLowerCase();
    fs.writeFileSync(path.join(any, `ic_launcher_${n}.xml`), adaptiveXml(n));
    fs.writeFileSync(path.join(any, `ic_launcher_${n}_round.xml`), adaptiveXml(n));
    for (const [d, k] of Object.entries(DENSITIES)) {
      const adaptive = Math.round(108 * k);
      const legacy = Math.round(48 * k);
      await writePng(Jimp, monoSrc(dir, v), adaptive, path.join(res, `mipmap-${d}`, `ic_launcher_${n}_monochrome.png`));
      for (const [t, q] of [['light', ''], ['dark', 'night-']]) {
        const out = path.join(res, `mipmap-${q}${d}`);
        await writePng(Jimp, src(dir, v, t, 'fg'), adaptive, path.join(out, `ic_launcher_${n}_foreground.png`));
        await writePng(Jimp, src(dir, v, t, 'bg'), adaptive, path.join(out, `ic_launcher_${n}_background.png`));
        await writePng(Jimp, src(dir, v, t, 'icon'), legacy, path.join(out, `ic_launcher_${n}.png`));
        await writePng(Jimp, src(dir, v, t, 'icon'), legacy, path.join(out, `ic_launcher_${n}_round.png`));
      }
    }
  }
}

function alias(name, icon, enabled) {
  return {
    $: {
      'android:name': `.MainActivity${name}`,
      'android:enabled': enabled ? 'true' : 'false',
      'android:exported': 'true',
      'android:icon': `@mipmap/ic_launcher_${icon}`,
      'android:roundIcon': `@mipmap/ic_launcher_${icon}_round`,
      'android:targetActivity': '.MainActivity',
    },
    'intent-filter': [{
      action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
      category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
    }],
  };
}

const isLauncher = (f) => (f.category || []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER');

module.exports = function withThemedIcons(config, opts = {}) {
  const iconsRel = opts.iconsDir || 'assets/icons';
  let dir = null;
  let variants = [];
  config = withDangerousMod(config, ['android', async (cfg) => {
    dir = path.join(cfg.modRequest.projectRoot, iconsRel);
    variants = available(dir);
    if (!variants.includes(DEFAULT)) {
      console.warn('[withThemedIcons] нет файлов значка ' + DEFAULT + ' в ' + dir + ' — плагин пропущен');
      variants = [];
      return cfg;
    }
    await generate(path.join(cfg.modRequest.platformProjectRoot, 'app/src/main/res'), dir, variants);
    return cfg;
  }]);
  // Порядок модов: dangerous выполняется раньше манифеста, поэтому variants уже известны.
  config = withAndroidManifest(config, (cfg) => {
    if (!variants.includes(DEFAULT)) return cfg;
    const app = cfg.modResults.manifest.application[0];
    const main = (app.activity || []).find((a) => a.$['android:name'] === '.MainActivity');
    if (!main) return cfg;
    main['intent-filter'] = (main['intent-filter'] || []).filter((f) => !isLauncher(f));
    const aliases = (app['activity-alias'] || []).filter((a) => !/^\.MainActivity(Default|[A-D])$/.test(a.$['android:name']));
    aliases.push(alias('Default', DEFAULT.toLowerCase(), true));
    for (const v of variants) if (v !== DEFAULT) aliases.push(alias(v, v.toLowerCase(), false));
    app['activity-alias'] = aliases;
    return cfg;
  });
  return config;
};
