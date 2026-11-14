// Run: node tests/conversions.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const KC = require('../assets/convert.js');
const near = (a, b, tol = 1e-6, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b}, got ${a}`);
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok -', name); };

t('1 cup = 16 tbsp = 48 tsp', () => {
  near(KC.convert(1, 'cup', 'tbsp'), 16);
  near(KC.convert(1, 'cup', 'tsp'), 48);
  near(KC.convert(1, 'tbsp', 'tsp'), 3);
});
t('volume chain', () => {
  near(KC.convert(1, 'cup', 'floz'), 8);
  near(KC.convert(1, 'gallon', 'quart'), 4);
  near(KC.convert(1, 'quart', 'pint'), 2);
  near(KC.convert(1, 'pint', 'cup'), 2);
  near(KC.convert(1, 'cup', 'ml'), 236.5882365);
  near(KC.convert(1, 'l', 'ml'), 1000);
});
t('1 lb = 453.592 g = 16 oz', () => {
  near(KC.convert(1, 'lb', 'g'), 453.592, 0.001);
  near(KC.convert(1, 'lb', 'oz'), 16);
  near(KC.convert(1, 'kg', 'g'), 1000);
});
t('350 F ~ 177 C, round trips', () => {
  assert.equal(Math.round(KC.fToC(350)), 177);
  near(KC.fToC(212), 100); near(KC.cToF(0), 32);
  near(KC.cToF(KC.fToC(425)), 425);
  assert.equal(KC.gasMarkForF(350).mark, '4');
  assert.equal(KC.gasMarkForF(100), null);
});
t('ingredient volume <-> weight', () => {
  near(KC.convert(1, 'cup', 'g', 125), 125);
  near(KC.convert(125, 'g', 'cup', 125), 1);
  near(KC.convert(8, 'tbsp', 'g', 227), 113.5);
  assert.ok(Number.isNaN(KC.convert(1, 'cup', 'g')));
});
t('pan scaling', () => {
  // Two 8-inch squares vs one 8-inch square at the same depth: 1x.
  near(KC.panScale({ shape: 'square', side: 8, depth: 2 }, { shape: 'square', side: 8, depth: 2 }, 'area'), 1);
  // 9x13 (117 sq in) from 8x8 (64 sq in).
  near(KC.panScale({ shape: 'square', side: 8, depth: 2 }, { shape: 'rect', length: 13, width: 9, depth: 2 }, 'area'), 117 / 64);
  // 9-inch round from 8-inch round = (9/8)^2.
  near(KC.panScale({ shape: 'round', diameter: 8, depth: 2 }, { shape: 'round', diameter: 9, depth: 2 }, 'area'), 81 / 64);
  // Volume basis accounts for depth.
  near(KC.panScale({ shape: 'loaf', length: 9, width: 5, depth: 3 }, { shape: 'square', side: 9, depth: 2 }, 'volume'), 162 / 135);
  // Bundt by capacity.
  near(KC.panScale({ shape: 'bundt', cups: 12 }, { shape: 'bundt', cups: 6 }), 0.5);
  near(KC.panGeometry({ shape: 'bundt', cups: 10 }).cups, 10);
});
t('amount parsing and fractions', () => {
  near(KC.parseAmount('1 1/2'), 1.5); near(KC.parseAmount('3/4'), 0.75);
  near(KC.parseAmount('½'), 0.5); near(KC.parseAmount('1½'), 1.5); near(KC.parseAmount('2,5'), 2.5);
  assert.ok(Number.isNaN(KC.parseAmount('abc'))); assert.ok(Number.isNaN(KC.parseAmount('1/0')));
  assert.equal(KC.toFraction(0.3333).text, '⅓'); assert.equal(KC.toFraction(2.5).text, '2 ½');
  assert.equal(KC.toFraction(0.99).text, '1');
});
t('ingredient data is sane', () => {
  const d = JSON.parse(fs.readFileSync(new URL('../data/ingredients.json', import.meta.url))).ingredients;
  assert.ok(d.length >= 40, 'at least 40 ingredients');
  const slugs = new Set();
  for (const i of d) {
    assert.ok(i.fdcId > 0 && i.gramsPerCup > 20 && i.gramsPerCup < 400, i.slug);
    assert.ok(!slugs.has(i.slug), 'dup ' + i.slug); slugs.add(i.slug);
  }
  assert.equal(d.find(i => i.slug === 'all-purpose-flour').gramsPerCup, 125);
  assert.equal(d.find(i => i.slug === 'granulated-sugar').gramsPerCup, 200);
});
t('Thanksgiving ingredients from USDA', () => {
  const d = JSON.parse(fs.readFileSync(new URL('../data/ingredients.json', import.meta.url))).ingredients;
  const pumpkin = d.find(i => i.slug === 'pumpkin-puree');
  assert.ok(pumpkin, 'pumpkin purée present');
  assert.equal(pumpkin.fdcId, 168450);
  assert.equal(pumpkin.gramsPerCup, 245);
  // A 15 oz can (425 g) of pumpkin is about 1 3/4 cups.
  near(KC.convert(425, 'g', 'cup', pumpkin.gramsPerCup), 1.735, 0.01);
  near(KC.convert(0.5, 'cup', 'g', pumpkin.gramsPerCup), 122.5);
  assert.equal(d.find(i => i.slug === 'evaporated-milk').gramsPerCup, 252);
  assert.equal(d.find(i => i.slug === 'dried-cranberries').gramsPerCup, 160);
  for (const s of ['fresh-cranberries', 'canned-sweet-potato', 'pumpkin-pie-spice', 'pecan-halves']) assert.ok(d.find(i => i.slug === s), s);
  assert.ok(fs.existsSync(new URL('../convert/1-cup-pumpkin-puree-in-grams/index.html', import.meta.url)), 'pumpkin chart page generated');
});
console.log(`\n${n} test groups passed`);
