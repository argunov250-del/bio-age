// Генерирует превью виджетов для выбора на домашнем экране: assets/widgets/*.png (светлая тема, демо-данные).
// Запуск: node tools/genWidgetPreviews.js  (нужен playwright с установленным chromium).
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets', 'widgets');
const css = `*{box-sizing:border-box;margin:0}body{background:transparent;font-family:Roboto,"Helvetica Neue",Arial,sans-serif}
.c{background:#fff;border:1px solid #E7EAEE;border-radius:22px;padding:14px;color:#111;overflow:hidden}
.b{font-size:8px;font-weight:700;letter-spacing:1.5px;color:#6B7280}.m{color:#6B7280}.g{color:#2BB673}`;
const chip = '<div style="width:28px;height:28px;border-radius:14px;background:#F0F2F4;display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">ICON</svg></div>';
const ic = { body: '<circle cx="12" cy="6" r="3"/><path d="M5 21c0-4 3-7 7-7s7 3 7 7"/>', bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>', pulse: '<path d="M3 12h4l3-8 4 16 3-8h4"/>', growth: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>' };
const pill = (t) => `<div style="border:1.5px solid #2BB673;color:#2BB673;border-radius:14px;padding:2px 9px;font-size:13px">${t}</div>`;
const spark = (v, w, h) => { const lo = Math.min(...v), hi = Math.max(...v); const p = v.map((y, i) => [i / (v.length - 1) * w, 3 + (1 - (y - lo) / (hi - lo)) * (h - 6)]); const l = p.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2BB673" stop-opacity=".35"/><stop offset="1" stop-color="#2BB673" stop-opacity="0"/></linearGradient></defs><path d="${l} L${w} ${h} L0 ${h} Z" fill="url(#g)"/><path d="${l}" fill="none" stroke="#2BB673" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
const tile = (icon, p, num, unit, label) => `<div class="c" style="width:150px;height:150px;padding:12px"><div style="display:flex;justify-content:space-between;align-items:center">${chip.replace('ICON', ic[icon])}${pill(p)}</div><div style="display:flex;align-items:flex-end;margin-top:4px"><span style="font-size:30px;font-weight:700;line-height:36px">${num}</span><span class="m" style="font-size:12px;margin:0 0 4px 3px">${unit}</span></div><div style="display:flex;justify-content:space-between"><span class="m" style="font-size:12px">${label}</span><span class="b">EPIMELY</span></div><div style="margin-top:4px">${spark([5, 6, 4, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12], 124, 40)}</div></div>`;
const W = {
  bodyage: { w: 150, h: 150, html: tile('body', '−0,5', '34,5', 'лет', 'Возраст тела') },
  readiness: { w: 150, h: 150, html: tile('bolt', 'хорошо', '78', '/100', 'Готовность') },
  steps: { w: 320, h: 70, html: `<div class="c" style="width:320px;height:70px;padding:10px;display:flex;align-items:center">${chip.replace('ICON', ic.pulse)}<div style="flex:1;margin:0 8px"><div style="display:flex;align-items:flex-end"><span style="font-size:20px;font-weight:700">6 420</span><span class="m" style="font-size:11px;margin-left:6px">из 8 000</span></div><div style="margin-top:3px;height:6px;border-radius:3px;background:#E7EAEE;overflow:hidden"><div style="width:80%;height:6px;background:#2BB673"></div></div></div>${pill('80%')}</div>` },
  daysummary: { w: 320, h: 150, html: `<div class="c" style="width:320px;height:150px;padding:12px"><div style="display:flex;align-items:center">${chip.replace('ICON', ic.growth)}<div style="flex:1;margin:0 8px"><div style="font-size:14px;font-weight:700">Следопыт</div><div class="b">EPIMELY</div></div>${pill('Ур. 12')}</div><div style="display:flex;margin-top:6px">${[['7,2 ч', 'Сон'], ['6 420', 'Шаги'], ['58', 'Пульс покоя']].map(([a, b]) => `<div style="flex:1"><div style="font-size:17px;font-weight:700">${a}</div><div class="m" style="font-size:10px">${b}</div></div>`).join('')}</div><div style="margin-top:4px">${spark([5, 6, 4, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12], 294, 44)}</div></div>` },
};

(async () => {
  const browser = await chromium.launch();
  for (const [name, d] of Object.entries(W)) {
    const page = await browser.newPage({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 });
    await page.setContent(`<style>${css}</style>${d.html}`);
    await page.screenshot({ path: path.join(OUT, name + '.png'), omitBackground: true });
    await page.close();
  }
  await browser.close();
})();
