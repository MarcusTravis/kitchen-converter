// Builds data/ingredients.json from the USDA FoodData Central "SR Legacy" CSV download (CC0).
// Usage: node scripts/build-data.mjs /path/to/FoodData_Central_sr_legacy_food_csv_2018-04
// Download: https://fdc.nal.usda.gov/download-datasets (SR Legacy, CSV)
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('Pass the SR Legacy CSV folder.'); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [head, ...body] = rows;
  return body.map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const foods = new Map(parseCSV(fs.readFileSync(path.join(dir, 'food.csv'), 'utf8')).map(r => [r.fdc_id, r.description]));
const portions = parseCSV(fs.readFileSync(path.join(dir, 'food_portion.csv'), 'utf8'));
const list = JSON.parse(fs.readFileSync(new URL('./ingredient-list.json', import.meta.url), 'utf8'));

const out = list.map(item => {
  const id = String(item.fdcId);
  const desc = foods.get(id);
  if (!desc) throw new Error(`FDC ${id} not found`);
  const p = portions.find(r => r.fdc_id === id && r.modifier === item.portion);
  if (!p) throw new Error(`Portion "${item.portion}" not found for FDC ${id}`);
  const amount = Number(p.amount);
  const grams = Number(p.gram_weight);
  const cups = amount * (item.portionCups ?? 1);
  return {
    slug: item.slug,
    name: item.name,
    group: item.group,
    gramsPerCup: Math.round((grams / cups) * 10) / 10,
    fdcId: item.fdcId,
    fdcDescription: desc,
    usdaPortion: `${p.amount} ${p.modifier} = ${p.gram_weight} g`
  };
});

fs.writeFileSync(new URL('../data/ingredients.json', import.meta.url), JSON.stringify({
  source: 'USDA FoodData Central, SR Legacy (April 2018 release), CC0 1.0. https://fdc.nal.usda.gov/',
  note: 'gramsPerCup is derived from the listed USDA household portion. 1 US cup = 236.588 mL.',
  ingredients: out
}, null, 1) + '\n');
console.log(`Wrote ${out.length} ingredients`);
