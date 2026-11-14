// Renders the share preview image (assets/og-image.png, 1200x630) from the HTML below.
// Needs puppeteer-core and a local Chrome: CHROME=/usr/bin/google-chrome node scripts/render-og.cjs
const path = require('path');
const puppeteer = require(process.env.PUPPETEER || 'puppeteer-core');
const HTML = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0}
  body{width:1200px;height:630px;background:#fbf8f3;font-family:"DejaVu Sans",system-ui,sans-serif;color:#23201c;position:relative;overflow:hidden}
  .band{position:absolute;right:-120px;top:-120px;width:560px;height:560px;border-radius:50%;background:#e5f0ea}
  .band2{position:absolute;right:120px;bottom:-200px;width:340px;height:340px;border-radius:50%;background:#f3e3d6}
  .wrap{position:absolute;left:80px;top:78px;right:80px}
  .brand{display:flex;align-items:center;gap:28px}
  .brand svg{width:128px;height:128px}
  h1{font-size:96px;line-height:1;margin:0;letter-spacing:-2px;color:#2f6b4f;font-weight:800}
  p.tag{font-size:40px;margin:34px 0 0;color:#23201c;font-weight:600;max-width:900px}
  ul{list-style:none;padding:0;margin:44px 0 0;display:flex;flex-wrap:wrap;gap:16px;max-width:1000px}
  li{background:#fff;border:2px solid #e6ded2;border-radius:999px;padding:12px 24px;font-size:27px;color:#23201c}
  li b{color:#b4582a}
  .url{position:absolute;left:80px;bottom:48px;font-size:28px;color:#645d54}
  .free{position:absolute;right:80px;bottom:44px;font-size:28px;background:#2f6b4f;color:#fff;padding:10px 26px;border-radius:12px;font-weight:700}
</style></head><body>
  <div class="band"></div><div class="band2"></div>
  <div class="wrap">
    <div class="brand">
      <svg viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2f6b4f"/><path d="M8 12h16l-1.6 11.2A3 3 0 0 1 19.4 26h-6.8a3 3 0 0 1-3-2.8z" fill="#fbf8f3"/><path d="M11 16h10M11.5 20h9" stroke="#2f6b4f" stroke-width="1.6" stroke-linecap="round"/><path d="M12 9c0-2 2-2 2-4M17 9c0-2 2-2 2-4" stroke="#fbf8f3" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
      <h1>Cups &amp; Quarts</h1>
    </div>
    <p class="tag">Cups to grams, oven temps and pan sizes in one fast kitchen converter.</p>
    <ul>
      <li>1 cup flour <b>= 125 g</b></li>
      <li>1 cup pumpkin purée <b>= 245 g</b></li>
      <li>350 °F <b>= 177 °C</b></li>
      <li>9″ round → 9×13 <b>×1.84</b></li>
    </ul>
  </div>
  <div class="url">cupsnquarts.pages.dev</div>
  <div class="free">Free · No ads</div>
</body></html>
`;

(async () => {
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await p.setContent(HTML, { waitUntil: 'load' });
  await p.screenshot({ path: path.join(__dirname, '..', 'assets', 'og-image.png') });
  await b.close();
})();
