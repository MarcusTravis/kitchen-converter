// Generates every HTML page, sitemap.xml and robots.txt from data/ingredients.json.
// Usage: node scripts/generate-pages.mjs   (no dependencies; commit the output)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const KC = require('../assets/convert.js');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://kitchen-converter-aey.pages.dev';
const NAME = 'Kitchen Converter';
const KOFI = 'https://ko-fi.com/marcustravis';
const ANALYTICS_TOKEN = 'ae14af8fb44d49a1ac852db7819661e8';
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ingredients.json'), 'utf8'));
const ING = DATA.ingredients;
const VERSION = '1';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urls = [];

function write(rel, html) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const NAV = [['/', 'Converter'], ['/#ingredients', 'Cups to grams'], ['/#temperature', 'Oven temps'], ['/#pans', 'Pan sizes'], ['/convert/', 'Charts'], ['/about/', 'About & sources']];

function layout({ title, description, canonical, body, current = '', scripts = '', jsonld = null }) {
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === current ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${SITE}${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${NAME}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${SITE}${canonical}">
  <meta name="theme-color" content="#2f6b4f">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/site.css?v=${VERSION}">${jsonld ? `\n  <script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2f6b4f"/><path d="M8 12h16l-1.6 11.2A3 3 0 0 1 19.4 26h-6.8a3 3 0 0 1-3-2.8z" fill="#fbf8f3"/><path d="M11 16h10M11.5 20h9" stroke="#2f6b4f" stroke-width="1.6" stroke-linecap="round"/></svg>${NAME}</a>
      <nav class="site-nav" aria-label="Main">
        ${nav}
      </nav>
    </div>
  </header>
  <main id="main" class="wrap">
${body}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p class="support"><a href="${KOFI}" rel="noopener">Free and ad-free. If this site helped you, buy me a coffee →</a></p>
      <p>Ingredient weights come from <a href="/about/">USDA FoodData Central</a> and are approximate. US customary cups and spoons.</p>
    </div>
  </footer>
${scripts}  <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${ANALYTICS_TOKEN}"}'></script>
</body>
</html>
`;
}

// ---------- formatting helpers ----------
const FRAC_WORD = { 0.25: 'quarter', [1 / 3]: 'third', 0.5: 'half', [2 / 3]: 'two-thirds', 0.75: 'three-quarters' };
const UNIT_WORD = { cup: ['cup', 'cups'], tbsp: ['tablespoon', 'tablespoons'], tsp: ['teaspoon', 'teaspoons'] };
function amountText(n, unit) { // "½ cup", "2 cups", "1 tbsp"
  const f = KC.toFraction(n).text;
  return `${f} ${n > 1 ? UNIT_WORD[unit][1] : UNIT_WORD[unit][0]}`;
}
function amountAscii(n, unit) { // "1/2 Cup" for titles
  const map = { 0.25: '1/4', [1 / 3]: '1/3', 0.5: '1/2', [2 / 3]: '2/3', 0.75: '3/4' };
  const t = map[n] || String(n);
  const w = n > 1 ? UNIT_WORD[unit][1] : UNIT_WORD[unit][0];
  return `${t} ${w[0].toUpperCase()}${w.slice(1)}`;
}
function amountSlug(n, unit) {
  const w = n > 1 ? UNIT_WORD[unit][1] : UNIT_WORD[unit][0];
  return `${FRAC_WORD[n] || n}-${w}`;
}
function grams(g) { return g >= 10 ? String(Math.round(g)) : String(Math.round(g * 10) / 10); }
function ounces(g) { const o = g / KC.WEIGHT.oz.g; return o >= 1 ? (Math.round(o * 10) / 10).toString() : (Math.round(o * 100) / 100).toString(); }
const tc = s => s.replace(/(^|[\s(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
function cupsText(c) {
  const f = KC.toFraction(c);
  return f.exact ? `${f.text} cup${c > 1 ? 's' : ''}` : `about ${f.text} cup${c > 1.05 ? 's' : ''}`;
}

const SMALL = new Set(['baking-soda', 'baking-powder', 'ground-cinnamon', 'vanilla-extract', 'table-salt']);
const VOL_AMOUNTS = [[0.25, 'cup'], [1 / 3, 'cup'], [0.5, 'cup'], [2 / 3, 'cup'], [0.75, 'cup'], [1, 'cup'], [2, 'cup'], [1, 'tbsp']];
const SMALL_AMOUNTS = [[0.25, 'tsp'], [0.5, 'tsp'], [1, 'tsp'], [1, 'tbsp']];
const GRAM_AMOUNTS = [100, 250, 500];

const TIPS = {
  'Flours & starches': 'Flour packs down as it sits, so a cup scooped straight from the bag can weigh noticeably more than one that was spooned in and leveled with a knife. Spoon and level for results closest to these numbers, or better, weigh it.',
  'Sugars & syrups': 'For sticky syrups, give the cup a light coat of oil first so everything slides out and you get the full amount. Brown sugar is the one sugar that is normally packed firmly into the cup.',
  'Fats & oils': 'Solid fats are easiest to measure by weight or with the markings on the wrapper. Oils and melted fats can go straight into a liquid measuring cup.',
  'Liquids & dairy': 'Liquids are the easiest thing to measure by volume, so cups and a scale will agree closely. Dairy weighs a little more or less than water depending on its fat, sugar and air content.',
  'Grains & legumes': 'These figures are for dry, uncooked grains and legumes. Once cooked they soak up water and a cup weighs very differently.',
  'Baking extras': 'Small amounts like these are hard to read on a regular kitchen scale. A pocket scale that reads to 0.1 g helps, or just use level measuring spoons.',
  'Nuts, seeds & fruit': 'Whole, chopped and sliced pieces leave different amounts of air in the cup, so the same nut can weigh quite differently depending on the cut. Pick the closest match.'
};
const NOTES = {
  'butter': 'In the US, one stick of butter is ½ cup or 8 tablespoons, which is about 113 g (USDA rounds a cup to 227 g, so the chart shows 114 g).',
  'brown-sugar': 'This is for brown sugar pressed firmly into the cup, the way most recipes mean it. Loosely spooned brown sugar weighs much less.',
  'powdered-sugar': 'This is for unsifted powdered sugar. Sifting adds air, so a cup of sifted sugar weighs less.',
  'cake-flour': 'This assumes unsifted cake flour dipped into the cup. Sifted flour weighs less per cup.',
  'eggs': 'One large egg out of the shell is roughly 50 g, so a cup holds about 5 large eggs.',
  'water': '1 mL of water weighs very close to 1 g, which is why a cup of water is about 237 g.',
  'table-salt': 'This is fine table salt. Kosher and flaky salts have bigger crystals and weigh much less per spoon, so do not swap them one for one.',
  'heavy-cream': 'This is liquid cream before whipping. Whipped cream is mostly air and weighs about half as much per cup.'
};

function sourceLine(d) {
  return `<p class="hint">Source: <a href="https://fdc.nal.usda.gov/food-details/${d.fdcId}/portions" rel="noopener">USDA FoodData Central #${d.fdcId}</a>, ${esc(d.fdcDescription)}. USDA lists ${esc(d.usdaPortion)}. Weights are approximate.</p>`;
}

function toolLink(d, amt, unit, to) {
  return `/?ing=${d.slug}&amp;amt=${encodeURIComponent(amt)}&amp;from=${unit}&amp;to=${to}#ingredients`;
}

const pages = []; // for the /convert/ index

function volumePage(d, n, unit) {
  const cups = KC.convertVolume(n, unit, 'cup');
  const g = cups * d.gramsPerCup;
  const slug = `${amountSlug(n, unit)}-${d.slug}-in-grams`;
  const amt = amountText(n, unit);
  const lname = d.name.toLowerCase();
  const title = `${amountAscii(n, unit)} ${tc(d.name)} in Grams (${grams(g)} g) | ${NAME}`;
  const description = `${amt[0].toUpperCase() + amt.slice(1)} of ${lname} weighs about ${grams(g)} grams (${ounces(g)} oz). Based on USDA FoodData Central portion data, with a chart for other amounts.`;
  const amounts = SMALL.has(d.slug) ? SMALL_AMOUNTS : VOL_AMOUNTS;
  const rows = amounts.map(([m, u]) => {
    const gg = KC.convertVolume(m, u, 'cup') * d.gramsPerCup;
    const s = `${amountSlug(m, u)}-${d.slug}-in-grams`;
    const label = amountText(m, u);
    const cell = s === slug ? `<strong>${label}</strong>` : `<a href="/convert/${s}/">${label}</a>`;
    return `<tr><td>${cell}</td><td class="num">${grams(gg)} g</td><td class="num">${ounces(gg)} oz</td></tr>`;
  }).join('\n          ');
  const related = ING.filter(x => x.group === d.group && x.slug !== d.slug && SMALL.has(x.slug) === SMALL.has(d.slug)).slice(0, 8)
    .map(x => `<li><a href="/convert/${amountSlug(n, unit)}-${x.slug}-in-grams/">${amt} ${esc(x.name.toLowerCase())}</a></li>`).join('\n          ');
  const body = `    <p class="crumbs"><a href="/">Converter</a> › <a href="/convert/">Charts</a> › ${esc(d.name)}</p>
    <h1>How many grams is ${amt} of ${esc(lname)}?</h1>
    <section class="card" aria-labelledby="ans">
      <h2 id="ans" class="visually-hidden">Answer</h2>
      <p class="answer">${grams(g)} g</p>
      <p>${amt[0].toUpperCase() + amt.slice(1)} of ${esc(lname)} is about <strong>${grams(g)} grams</strong>, or ${ounces(g)} ounces. That works out from USDA's figure of roughly ${d.gramsPerCup} g for a full US cup (236.6 mL).</p>
      ${NOTES[d.slug] ? `<p>${NOTES[d.slug]}</p>` : ''}
      <p><a class="btn cta" href="${toolLink(d, KC.toFraction(n).text.replace(/ /g, ' '), unit, 'g')}">Convert a different amount →</a></p>
    </section>
    <section class="card">
      <h2>${esc(d.name)}: cups and spoons to grams</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th scope="col">Volume</th><th scope="col" class="num">Grams</th><th scope="col" class="num">Ounces</th></tr></thead>
          <tbody>
          ${rows}
          </tbody>
        </table>
      </div>
      ${sourceLine(d)}
    </section>
    <section class="card">
      <h2>Measuring tip</h2>
      <p>${TIPS[d.group]}</p>
    </section>
    ${related ? `<section class="card">
      <h2>Related conversions</h2>
      <ul class="link-grid">
          ${related}
      </ul>
    </section>` : ''}`;
  const canonical = `/convert/${slug}/`;
  write(`convert/${slug}/index.html`, layout({ title, description, canonical, body }));
  urls.push(canonical);
  pages.push({ d, href: canonical, label: `${amt} ${lname} in grams` });
}

function gramPage(d, gr) {
  const cups = gr / d.gramsPerCup;
  const tbsp = cups * 16;
  const slug = `${gr}-grams-${d.slug}-in-cups`;
  const lname = d.name.toLowerCase();
  const ct = cupsText(cups);
  const title = `${gr} Grams of ${tc(d.name)} in Cups | ${NAME}`;
  const description = `${gr} g of ${lname} is ${ct} (${KC.formatNumber(cups)} US cups). Converted with USDA FoodData Central portion data.`;
  const rows = GRAM_AMOUNTS.concat([50, 125, 200, 1000]).sort((a, b) => a - b).map(x => {
    const c = x / d.gramsPerCup;
    const label = GRAM_AMOUNTS.includes(x) && x !== gr ? `<a href="/convert/${x}-grams-${d.slug}-in-cups/">${x} g</a>` : x === gr ? `<strong>${x} g</strong>` : `${x} g`;
    return `<tr><td>${label}</td><td class="num">${KC.formatNumber(c)}</td><td>${cupsText(c)}</td></tr>`;
  }).join('\n          ');
  const body = `    <p class="crumbs"><a href="/">Converter</a> › <a href="/convert/">Charts</a> › ${esc(d.name)}</p>
    <h1>How many cups is ${gr} grams of ${esc(lname)}?</h1>
    <section class="card" aria-labelledby="ans">
      <h2 id="ans" class="visually-hidden">Answer</h2>
      <p class="answer">${ct.replace('about ', '≈ ')}</p>
      <p>${gr} grams of ${esc(lname)} fills ${ct} (${KC.formatNumber(cups)} US cups, or about ${KC.formatNumber(tbsp)} tablespoons). The math uses USDA's figure of roughly ${d.gramsPerCup} g per cup.</p>
      ${NOTES[d.slug] ? `<p>${NOTES[d.slug]}</p>` : ''}
      <p><a class="btn cta" href="${toolLink(d, gr, 'g', 'cup')}">Convert a different amount →</a></p>
    </section>
    <section class="card">
      <h2>${esc(d.name)}: grams to cups</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th scope="col">Weight</th><th scope="col" class="num">US cups</th><th scope="col">In the kitchen</th></tr></thead>
          <tbody>
          ${rows}
          </tbody>
        </table>
      </div>
      ${sourceLine(d)}
    </section>
    <section class="card">
      <h2>Measuring tip</h2>
      <p>${TIPS[d.group]} When a recipe gives grams, a scale is always the most accurate choice.</p>
      <p>See also: <a href="/convert/1-cup-${d.slug}-in-grams/">1 cup of ${esc(lname)} in grams</a>.</p>
    </section>`;
  const canonical = `/convert/${slug}/`;
  write(`convert/${slug}/index.html`, layout({ title, description, canonical, body }));
  urls.push(canonical);
  pages.push({ d, href: canonical, label: `${gr} g ${lname} in cups` });
}

// ---------- unit fact pages ----------
const FACTS = [
  ['tablespoons-in-a-cup', 'How many tablespoons are in a cup?', '16 tablespoons', 'One US cup holds 16 tablespoons, so ½ cup is 8 tablespoons and ¼ cup is 4.', 'cup', 'tbsp'],
  ['teaspoons-in-a-tablespoon', 'How many teaspoons are in a tablespoon?', '3 teaspoons', 'A tablespoon is exactly three teaspoons in US measures, which makes scaling small amounts easy.', 'tbsp', 'tsp'],
  ['teaspoons-in-a-cup', 'How many teaspoons are in a cup?', '48 teaspoons', 'With 16 tablespoons to a cup and 3 teaspoons to a tablespoon, a cup comes to 48 teaspoons.', 'cup', 'tsp'],
  ['fluid-ounces-in-a-cup', 'How many fluid ounces are in a cup?', '8 fl oz', 'A US cup is 8 fluid ounces. Fluid ounces measure volume, not weight, so they only match weight ounces for water-like liquids.', 'cup', 'floz'],
  ['ml-in-a-cup', 'How many milliliters are in a cup?', '236.6 mL', 'A US cup is 236.6 mL. Many recipes round it to 240 mL, and a metric cup used in some countries is 250 mL.', 'cup', 'ml'],
  ['ml-in-a-tablespoon', 'How many milliliters are in a tablespoon?', '14.8 mL', 'A US tablespoon is about 14.8 mL, often rounded to 15 mL.', 'tbsp', 'ml'],
  ['ml-in-a-teaspoon', 'How many milliliters are in a teaspoon?', '4.9 mL', 'A US teaspoon is about 4.93 mL, usually rounded to 5 mL.', 'tsp', 'ml'],
  ['cups-in-a-pint', 'How many cups are in a pint?', '2 cups', 'A US liquid pint is 2 cups, or 16 fluid ounces.', 'pint', 'cup'],
  ['cups-in-a-quart', 'How many cups are in a quart?', '4 cups', 'A US quart is 4 cups, which is 2 pints.', 'quart', 'cup'],
  ['cups-in-a-gallon', 'How many cups are in a gallon?', '16 cups', 'A US gallon holds 16 cups, or 4 quarts.', 'gallon', 'cup'],
  ['grams-in-an-ounce', 'How many grams are in an ounce?', '28.35 g', 'One avoirdupois ounce, the kind used for food, is 28.35 grams.', 'oz', 'g'],
  ['ounces-in-a-pound', 'How many ounces are in a pound?', '16 oz', 'There are 16 ounces in a pound.', 'lb', 'oz'],
  ['grams-in-a-pound', 'How many grams are in a pound?', '453.6 g', 'A pound is 453.59 grams, so 1 kg is a little over 2.2 lb.', 'lb', 'g']
];
const TEMPS = [[325, 'F'], [350, 'F'], [375, 'F'], [400, 'F'], [425, 'F'], [450, 'F'], [160, 'C'], [180, 'C'], [200, 'C'], [220, 'C']];
const unitPages = [];
function factPages() {
  for (const [slug, q, a, text, from, to] of FACTS) {
    const fl = (KC.VOLUME[from] || KC.WEIGHT[from]).label, tl = (KC.VOLUME[to] || KC.WEIGHT[to]).label;
    const rows = [0.25, 0.5, 1, 2, 4].map(n => `<tr><td>${KC.toFraction(n).text} ${(KC.VOLUME[from] || KC.WEIGHT[from]).short}</td><td class="num">${KC.formatNumber(KC.convert(n, from, to))} ${(KC.VOLUME[to] || KC.WEIGHT[to]).short}</td></tr>`).join('\n          ');
    const body = `    <p class="crumbs"><a href="/">Converter</a> › <a href="/convert/">Charts</a></p>
    <h1>${q}</h1>
    <section class="card">
      <p class="answer">${a}</p>
      <p>${text}</p>
      <p><a class="btn cta" href="/#units">Open the unit converter →</a></p>
    </section>
    <section class="card">
      <h2>${fl[0].toUpperCase() + fl.slice(1)} to ${tl}</h2>
      <table>
        <thead><tr><th scope="col">${fl}</th><th scope="col" class="num">${tl}</th></tr></thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="hint">US customary measures.</p>
    </section>`;
    const canonical = `/convert/${slug}/`;
    write(`convert/${slug}/index.html`, layout({ title: `${q} (${a}) | ${NAME}`, description: `${text} Quick chart included.`, canonical, body }));
    urls.push(canonical); unitPages.push({ href: canonical, label: q });
  }
  for (const [t, s] of TEMPS) {
    const other = s === 'F' ? Math.round(KC.fToC(t)) : Math.round(KC.cToF(t));
    const os = s === 'F' ? 'C' : 'F';
    const f = s === 'F' ? t : other;
    const gas = KC.gasMarkForF(f);
    const slug = `${t}-${s.toLowerCase()}-to-${os.toLowerCase()}`;
    const q = `What is ${t} °${s} in °${os}?`;
    const body = `    <p class="crumbs"><a href="/">Converter</a> › <a href="/convert/">Charts</a></p>
    <h1>${q}</h1>
    <section class="card">
      <p class="answer">${other} °${os}</p>
      <p>${t} °${s} is ${s === 'F' ? KC.formatNumber(KC.fToC(t)) : KC.formatNumber(KC.cToF(t))} °${os}, which rounds to ${other} °${os}.${gas ? ` On a gas oven that is about Gas Mark ${gas.mark}.` : ''} If you have a fan (convection) oven, recipes usually suggest setting it about 25 °F / 15 °C lower.</p>
      <p><a class="btn cta" href="/#temperature">Open the temperature converter →</a></p>
    </section>`;
    const canonical = `/convert/${slug}/`;
    write(`convert/${slug}/index.html`, layout({ title: `${t}°${s} to °${os} (${other}°${os}) | ${NAME}`, description: `${t} degrees ${s === 'F' ? 'Fahrenheit' : 'Celsius'} is about ${other} degrees ${os === 'F' ? 'Fahrenheit' : 'Celsius'}${gas ? ` (Gas Mark ${gas.mark})` : ''}.`, canonical, body }));
    urls.push(canonical); unitPages.push({ href: canonical, label: `${t} °${s} to °${os}` });
  }
}

// ---------- home ----------
function ovenTable() {
  const bands = [
    ['Very low', 225, 275, 'Meringues, drying, slow braises'],
    ['Low', 300, 325, 'Rich fruit cakes, custards, cheesecake'],
    ['Moderate', 350, 375, 'Most cakes, cookies and casseroles'],
    ['Moderately hot', 400, 400, 'Muffins, roast vegetables'],
    ['Hot', 425, 450, 'Bread, pizza, roasting potatoes'],
    ['Very hot', 475, 500, 'Pizza on a stone, quick high-heat roasting']
  ];
  return bands.map(([name, lo, hi, use]) => {
    const f = lo === hi ? `${lo}` : `${lo}–${hi}`;
    const c = lo === hi ? `${Math.round(KC.fToC(lo) / 5) * 5}` : `${Math.round(KC.fToC(lo) / 5) * 5}–${Math.round(KC.fToC(hi) / 5) * 5}`;
    const gl = KC.gasMarkForF(lo), gh = KC.gasMarkForF(hi);
    const g = gl && gh ? (gl === gh ? gl.mark : `${gl.mark}–${gh.mark}`) : '';
    return `<tr><th scope="row">${name}</th><td class="num">${f}</td><td class="num">${c}</td><td class="num">${g}</td><td>${use}</td></tr>`;
  }).join('\n            ');
}

function panSide(p, label, preset) {
  const opts = [['', 'Choose a common pan…'], ['round-8', '8-inch round'], ['round-9', '9-inch round'], ['round-10', '10-inch round'], ['square-8', '8 × 8 in square'], ['square-9', '9 × 9 in square'], ['rect-11x7', '11 × 7 in baking dish'], ['rect-9x13', '9 × 13 in pan'], ['rect-15x10', '15 × 10 in jelly roll'], ['loaf-8x4', '8½ × 4½ in loaf'], ['loaf-9x5', '9 × 5 in loaf'], ['bundt-6', '6-cup bundt'], ['bundt-10', '10-cup bundt'], ['bundt-12', '12-cup bundt']]
    .map(([v, t]) => `<option value="${v}"${v === preset ? ' selected' : ''}>${t}</option>`).join('');
  const def = { pa: { shape: 'round', diameter: 9, side: 8, length: 13, width: 9, depth: 2, cups: 10 }, pb: { shape: 'rect', diameter: 9, side: 8, length: 13, width: 9, depth: 2, cups: 10 } }[p];
  const field = (k, lab, unit) => `<div class="field" id="${p}-${k}-wrap"><label for="${p}-${k}">${lab} <span class="len-unit">${unit}</span></label><input id="${p}-${k}" type="number" inputmode="decimal" min="0" step="any" value="${def[k]}"></div>`;
  return `<fieldset>
          <legend>${label}</legend>
          <div class="row two">
            <div class="field"><label for="${p}-preset">Common size</label><select id="${p}-preset">${opts}</select></div>
            <div class="field"><label for="${p}-shape">Shape</label><select id="${p}-shape">
              <option value="round"${def.shape === 'round' ? ' selected' : ''}>Round</option><option value="square">Square</option><option value="rect"${def.shape === 'rect' ? ' selected' : ''}>Rectangle</option><option value="loaf">Loaf</option><option value="bundt">Bundt / tube</option></select></div>
          </div>
          <div class="pan-dims">
            ${field('diameter', 'Diameter', 'in')}
            ${field('side', 'Side', 'in')}
            ${field('length', 'Length', 'in')}
            ${field('width', 'Width', 'in')}
            ${field('depth', 'Depth', 'in')}
            <div class="field" id="${p}-cups-wrap"><label for="${p}-cups">Capacity (cups)</label><input id="${p}-cups" type="number" inputmode="decimal" min="0" step="any" value="${def.cups}"></div>
          </div>
        </fieldset>`;
}

function home() {
  const popular = ['all-purpose-flour', 'granulated-sugar', 'butter', 'brown-sugar', 'powdered-sugar', 'whole-milk', 'rolled-oats', 'cocoa-powder', 'honey', 'white-rice']
    .map(s => ING.find(x => x.slug === s)).map(d => `<li><a href="/convert/1-cup-${d.slug}-in-grams/">1 cup ${esc(d.name.toLowerCase())} in grams</a></li>`).join('\n          ');
  const body = `    <h1>Kitchen &amp; ingredient converter</h1>
    <p class="lede">Cups, spoons, grams and ounces, cups to grams for ${ING.length} ingredients, oven temperatures and pan sizes. Results update as you type.</p>
    <ul class="jump">
      <li><a href="#units">Units</a></li><li><a href="#ingredients">Cups ↔ grams</a></li><li><a href="#temperature">Temperature</a></li><li><a href="#pans">Pan sizes</a></li>
    </ul>

    <section id="units" class="card" aria-labelledby="units-h">
      <h2 id="units-h">Volume &amp; weight units</h2>
      <div class="row three">
        <div class="field amount"><label for="u-amount">Amount</label><input id="u-amount" type="text" inputmode="decimal" autocomplete="off" value="1"></div>
        <div class="field"><label for="u-from">From</label><select id="u-from"></select></div>
        <div class="field"><label for="u-to">To</label><select id="u-to"></select></div>
      </div>
      <p><button type="button" class="btn ghost swap" id="u-swap">⇅ Swap units</button></p>
      <div class="result" aria-live="polite">
        <div class="big" id="u-result">1 cup = 16 tbsp</div>
        <div class="sub" id="u-sub"></div>
        <ul class="chips" id="u-chips" aria-label="Same amount in other units"></ul>
      </div>
      <p class="hint">Fractions like 1 1/2 or ¾ work too. Cups and spoons are shown as the nearest kitchen fraction.</p>
    </section>

    <section id="ingredients" class="card" aria-labelledby="ing-h">
      <h2 id="ing-h">Ingredient cups ↔ grams</h2>
      <div class="row two">
        <div class="field"><label for="i-ing">Ingredient</label><select id="i-ing"></select></div>
        <div class="field amount"><label for="i-amount">Amount</label><input id="i-amount" type="text" inputmode="decimal" autocomplete="off" value="1"></div>
      </div>
      <div class="row two" style="margin-top:.75rem">
        <div class="field"><label for="i-from">From</label><select id="i-from"></select></div>
        <div class="field"><label for="i-to">To</label><select id="i-to"></select></div>
      </div>
      <p><button type="button" class="btn ghost swap" id="i-swap">⇅ Swap units</button></p>
      <div class="result" aria-live="polite">
        <div class="big" id="i-result">1 cup all-purpose flour ≈ 125 g</div>
        <div class="sub" id="i-sub"></div>
        <ul class="chips" id="i-chips" aria-label="Same amount in other units"></ul>
      </div>
      <p class="hint" id="i-source"></p>
      <h3>Popular charts</h3>
      <ul class="link-grid">
          ${popular}
      </ul>
      <p><a href="/convert/">All ingredient charts →</a></p>
    </section>

    <section id="temperature" class="card" aria-labelledby="temp-h">
      <h2 id="temp-h">Oven temperature</h2>
      <div class="row three">
        <div class="field amount"><label for="t-f">Fahrenheit (°F)</label><input id="t-f" type="number" inputmode="decimal" step="any" value="350"></div>
        <div class="field amount"><label for="t-c">Celsius (°C)</label><input id="t-c" type="number" inputmode="decimal" step="any" value="177"></div>
        <div class="field"><label for="t-gas-pick">Gas Mark</label><select id="t-gas-pick"><option value="">Pick a gas mark…</option></select></div>
      </div>
      <div class="result" aria-live="polite"><div class="big" id="t-gas">Gas Mark 4</div><div class="sub">Gas marks are approximate; ovens vary, so an oven thermometer is worth having.</div></div>
      <h3>Oven temperature guide</h3>
      <div class="table-scroll">
        <table>
          <thead><tr><th scope="col">Oven</th><th scope="col" class="num">°F</th><th scope="col" class="num">°C</th><th scope="col" class="num">Gas</th><th scope="col">Good for</th></tr></thead>
          <tbody>
            ${ovenTable()}
          </tbody>
        </table>
      </div>
      <p class="hint">Celsius rounded to the nearest 5. For a fan or convection oven, try about 25 °F / 15 °C lower.</p>
    </section>

    <section id="pans" class="card" aria-labelledby="pans-h">
      <h2 id="pans-h">Pan size converter</h2>
      <p>Baking a recipe in a different pan? Enter both pans to see how much to scale the recipe.</p>
      <form id="pan-form" novalidate>
        <div class="seg" role="radiogroup" aria-label="Measurement units">
          <label><input type="radio" name="pan-units" value="in" checked><span>Inches</span></label>
          <label><input type="radio" name="pan-units" value="cm"><span>Centimeters</span></label>
        </div>
        <div class="row two" style="margin-top:.75rem">
          ${panSide('pa', 'Recipe’s pan', 'round-9')}
          ${panSide('pb', 'Your pan', 'rect-9x13')}
        </div>
        <div class="field" style="margin-top:.75rem;max-width:22rem"><label for="p-basis">Compare by</label>
          <select id="p-basis"><option value="area">Area (keep the same batter depth)</option><option value="volume">Volume (fill to the same level)</option></select></div>
      </form>
      <div class="result" aria-live="polite"><div class="big" id="p-result">Multiply the recipe by 1.84</div><div class="sub" id="p-sub"></div></div>
      <p class="hint">Bundt and tube pans are compared by capacity. To find one, fill the pan with water a cup at a time.</p>
    </section>
    <script type="application/json" id="ingredient-data">${JSON.stringify({ ingredients: ING.map(({ slug, name, group, gramsPerCup, fdcId, usdaPortion }) => ({ slug, name, group, gramsPerCup, fdcId, usdaPortion })) })}</script>`;
  write('index.html', layout({
    title: `${NAME}: Cups to Grams, Oven Temps & Pan Sizes`,
    description: `A fast, free, ad-free kitchen converter: cups, spoons, grams and ounces, cups to grams for ${ING.length} ingredients from USDA data, oven temperatures and pan sizes.`,
    canonical: '/', current: '/', body,
    scripts: `  <script src="/assets/convert.js?v=${VERSION}"></script>\n  <script src="/assets/app.js?v=${VERSION}"></script>\n`,
    jsonld: { '@context': 'https://schema.org', '@type': 'WebApplication', name: NAME, url: SITE + '/', applicationCategory: 'UtilitiesApplication', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } }
  }));
  urls.unshift('/');
}

function convertIndex() {
  const groups = {};
  for (const p of pages) (groups[p.d.group] = groups[p.d.group] || {}, (groups[p.d.group][p.d.name] = groups[p.d.group][p.d.name] || []).push(p));
  const sections = Object.entries(groups).map(([g, byName]) => `    <section class="card">
      <h2>${esc(g)}</h2>
${Object.entries(byName).map(([n, list]) => `      <h3>${esc(n)}</h3>
      <ul class="link-grid">
        ${list.map(p => `<li><a href="${p.href}">${esc(p.label)}</a></li>`).join('\n        ')}
      </ul>`).join('\n')}
    </section>`).join('\n');
  const body = `    <h1>Conversion charts</h1>
    <p class="lede">Quick answers for common amounts. For anything else, use the <a href="/">interactive converter</a>.</p>
    <section class="card">
      <h2>Units &amp; temperatures</h2>
      <ul class="link-grid">
        ${unitPages.map(p => `<li><a href="${p.href}">${esc(p.label)}</a></li>`).join('\n        ')}
      </ul>
    </section>
${sections}`;
  write('convert/index.html', layout({ title: `Cups to Grams Charts for ${ING.length} Ingredients | ${NAME}`, description: `Every ingredient chart on ${NAME}: cups, tablespoons and teaspoons to grams, grams to cups, and kitchen unit and oven temperature conversions.`, canonical: '/convert/', current: '/convert/', body }));
  urls.push('/convert/');
}

function about() {
  const rows = ING.map(d => `<tr><td>${esc(d.name)}</td><td class="num">${d.gramsPerCup}</td><td><a href="https://fdc.nal.usda.gov/food-details/${d.fdcId}/portions" rel="noopener">${d.fdcId}</a></td><td>${esc(d.usdaPortion)}</td></tr>`).join('\n            ');
  const body = `    <h1>About &amp; sources</h1>
    <section class="card">
      <h2>What this is</h2>
      <p>${NAME} is a small, fast tool for everyday cooking and baking math: switching between cups, spoons, grams and ounces, turning a cup of an ingredient into grams, converting oven temperatures and resizing recipes for a different pan. It is free, it has no ads, and it does not need an account.</p>
      <p>The only analytics is Cloudflare Web Analytics, which counts page views without cookies and without tracking you across sites.</p>
    </section>
    <section class="card">
      <h2>Where the ingredient weights come from</h2>
      <p>Ingredient weights are derived from household portion data in <a href="https://fdc.nal.usda.gov/" rel="noopener">USDA FoodData Central</a> (SR Legacy release), published by the U.S. Department of Agriculture, Agricultural Research Service. FoodData Central data is in the public domain under <a href="https://creativecommons.org/publicdomain/zero/1.0/" rel="noopener">CC0 1.0</a>. Each ingredient below links to the USDA record it came from.</p>
      <p><strong>Weights are approximate.</strong> The same cup of flour can vary by 20% or more depending on how it is filled, the brand, humidity and how finely something is ground. USDA lists one typical value; your kitchen may differ. For baking where precision matters, weigh your ingredients, and follow the recipe author’s own weights when they give them.</p>
      <p>Unit math uses US customary measures: 1 cup = 236.588 mL = 16 tablespoons = 48 teaspoons, 1 fl oz = 29.574 mL, 1 oz = 28.3495 g and 1 lb = 453.592 g.</p>
    </section>
    <section class="card">
      <h2>Ingredient data</h2>
      <div class="table-scroll">
        <table>
          <thead><tr><th scope="col">Ingredient</th><th scope="col" class="num">g per cup</th><th scope="col">FDC ID</th><th scope="col">USDA portion used</th></tr></thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
      <p class="hint">Where USDA only lists a spoon measure, the per-cup figure is scaled up from it (1 cup = 16 tbsp = 48 tsp).</p>
    </section>
    <section class="card">
      <h2>Feedback</h2>
      <p>Spotted a number that looks off, or want an ingredient added? Open an issue on <a href="https://github.com/MarcusTravis/kitchen-converter/issues" rel="noopener">GitHub</a>. The site’s code is there too.</p>
    </section>`;
  write('about/index.html', layout({ title: `About & Sources | ${NAME}`, description: `How ${NAME} works and where its ingredient weights come from: USDA FoodData Central (CC0). Weights are approximate.`, canonical: '/about/', current: '/about/', body }));
  urls.push('/about/');
}

function notFound() {
  const body = `    <h1>Page not found</h1>
    <section class="card"><p>That page doesn’t exist. Try the <a href="/">converter</a> or browse the <a href="/convert/">conversion charts</a>.</p></section>`;
  write('404.html', layout({ title: `Page not found | ${NAME}`, description: 'This page could not be found.', canonical: '/404.html', body }));
}

// ---------- run ----------
fs.rmSync(path.join(ROOT, 'convert'), { recursive: true, force: true });
home();
for (const d of ING) {
  for (const [n, u] of (SMALL.has(d.slug) ? SMALL_AMOUNTS : VOL_AMOUNTS)) volumePage(d, n, u);
  if (!SMALL.has(d.slug)) for (const g of GRAM_AMOUNTS) gramPage(d, g);
}
factPages();
convertIndex();
about();
notFound();

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`Generated ${pages.length} ingredient pages, ${unitPages.length} unit/temperature pages, ${urls.length} URLs in sitemap.`);
