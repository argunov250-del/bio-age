// Генерирует превью виджетов для выбора на домашнем экране: assets/widgets/*.png (светлая тема, демо-данные).
// Запуск: node tools/genWidgetPreviews.js  (нужен playwright с установленным chromium).
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, '..', 'assets', 'widgets');
const css = `*{box-sizing:border-box;margin:0}body{background:transparent;font-family:Roboto,"Helvetica Neue",Arial,sans-serif}
.c{background:#fff;border:1px solid #E7EAEE;border-radius:22px;padding:14px;color:#111;overflow:hidden}
.b{font-size:8px;font-weight:700;letter-spacing:1.5px;color:#6B7280}.m{color:#6B7280}.g{color:#2BB673}`;
const ring = (pct, s) => { const a = pct * 2 * Math.PI; const x = 50 + 42 * Math.sin(a), y = 50 - 42 * Math.cos(a);
  return `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="#E7EAEE" stroke-width="9"/><path d="M50 8 A42 42 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y}" fill="none" stroke="#2BB673" stroke-width="9" stroke-linecap="round"/></svg>`; };
const W = {
  bodyage: { w: 150, h: 150, html: `<div class="c" style="width:150px;height:150px"><div class="b">EPIMELY</div><div class="m" style="font-size:12px;margin-top:2px">Возраст тела</div><div style="font-size:38px;font-weight:700">34,2</div><div class="g" style="font-size:13px;font-weight:700">−0,5 лет</div></div>` },
  readiness: { w: 150, h: 150, html: `<div class="c" style="width:150px;height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px"><div style="position:relative;width:74px;height:74px">${ring(0.78, 74)}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:31px;font-weight:700">78</div></div><div class="m" style="font-size:11px;margin-top:6px">Готовность · хорошо</div><div class="b" style="margin-top:3px">EPIMELY</div></div>` },
  steps: { w: 320, h: 70, html: `<div class="c" style="width:320px;height:70px;padding:14px"><div style="display:flex;justify-content:space-between;align-items:center"><div style="display:flex;align-items:center"><span style="font-size:20px;font-weight:700">6 420</span><span class="m" style="font-size:11px;margin-left:8px">из 8 000 шагов</span></div><div class="b">EPIMELY</div></div><div style="margin-top:6px;height:8px;border-radius:4px;background:#E7EAEE;overflow:hidden"><div style="width:80%;height:8px;border-radius:4px;background:#2BB673"></div></div></div>` },
  daysummary: { w: 320, h: 150, html: `<div class="c" style="width:320px;height:150px;display:flex;align-items:center"><div style="width:30%;margin-right:12px"><div class="b">EPIMELY</div><div class="m" style="font-size:11px;margin-top:4px">Уровень</div><div class="g" style="font-size:30px;font-weight:700">12</div><div style="font-size:11px">Следопыт</div></div><div style="flex:1">${[['Сон', '7,2 ч'], ['Шаги', '6 420'], ['Пульс покоя', '58 уд/мин']].map(([a, b]) => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span class="m" style="font-size:11px">${a}</span><b style="font-size:14px">${b}</b></div>`).join('')}</div></div>` },
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
