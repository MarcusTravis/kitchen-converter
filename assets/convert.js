/* Cups & Quarts core math. Works in the browser (window.KC) and in Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KC = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // US customary volume units, in millilitres.
  var VOLUME = {
    tsp: { ml: 4.92892159375, label: 'teaspoons', short: 'tsp' },
    tbsp: { ml: 14.78676478125, label: 'tablespoons', short: 'tbsp' },
    floz: { ml: 29.5735295625, label: 'fluid ounces', short: 'fl oz' },
    cup: { ml: 236.5882365, label: 'cups', short: 'cup' },
    pint: { ml: 473.176473, label: 'pints', short: 'pt' },
    quart: { ml: 946.352946, label: 'quarts', short: 'qt' },
    gallon: { ml: 3785.411784, label: 'gallons', short: 'gal' },
    ml: { ml: 1, label: 'millilitres', short: 'mL' },
    l: { ml: 1000, label: 'litres', short: 'L' }
  };

  // Weight units, in grams.
  var WEIGHT = {
    g: { g: 1, label: 'grams', short: 'g' },
    kg: { g: 1000, label: 'kilograms', short: 'kg' },
    oz: { g: 28.349523125, label: 'ounces', short: 'oz' },
    lb: { g: 453.59237, label: 'pounds', short: 'lb' }
  };

  var CUP_ML = VOLUME.cup.ml;
  var CUBIC_IN_PER_CUP = 14.4375; // 231 in^3 per US gallon / 16

  function kind(unit) {
    if (VOLUME[unit]) return 'volume';
    if (WEIGHT[unit]) return 'weight';
    return null;
  }

  function convertVolume(value, from, to) {
    return value * VOLUME[from].ml / VOLUME[to].ml;
  }

  function convertWeight(value, from, to) {
    return value * WEIGHT[from].g / WEIGHT[to].g;
  }

  // Convert between any two units. Volume <-> weight needs gramsPerCup (ingredient density).
  function convert(value, from, to, gramsPerCup) {
    var kf = kind(from), kt = kind(to);
    if (!kf || !kt) throw new Error('Unknown unit');
    if (kf === kt) return kf === 'volume' ? convertVolume(value, from, to) : convertWeight(value, from, to);
    if (!(gramsPerCup > 0)) return NaN;
    if (kf === 'volume') {
      var cups = convertVolume(value, from, 'cup');
      return convertWeight(cups * gramsPerCup, 'g', to);
    }
    var grams = convertWeight(value, from, 'g');
    return convertVolume(grams / gramsPerCup, 'cup', to);
  }

  // Parse "1 1/2", "3/4", "1.5", "1,5", "½", "1½".
  var UNICODE_FRAC = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  function parseAmount(input) {
    if (typeof input === 'number') return input;
    var s = String(input || '').trim().replace(/,/g, '.');
    if (!s) return NaN;
    var total = 0, found = false;
    s = s.replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, function (ch) { total += UNICODE_FRAC[ch]; found = true; return ' '; }).trim();
    if (!s) return found ? total : NaN;
    var m = s.match(/^(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?$/);
    if (!m || (!m[1] && !m[2])) return NaN;
    if (m[1]) total += parseFloat(m[1]);
    if (m[2]) { var d = parseInt(m[3], 10); if (!d) return NaN; total += parseInt(m[2], 10) / d; }
    return total;
  }

  // Friendly number formatting.
  function round(n, digits) {
    var p = Math.pow(10, digits);
    return Math.round(n * p) / p;
  }
  function formatNumber(n) {
    if (!isFinite(n)) return '–';
    var a = Math.abs(n);
    var d = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
    return round(n, d).toLocaleString('en-US', { maximumFractionDigits: d });
  }

  // Nearest kitchen fraction (eighths and thirds). Returns { text, exact }.
  var FRACS = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'], [1, '']];
  function toFraction(n) {
    if (!isFinite(n) || n < 0) return null;
    var whole = Math.floor(n), rest = n - whole, best = FRACS[0], err = Infinity;
    for (var i = 0; i < FRACS.length; i++) {
      var e = Math.abs(rest - FRACS[i][0]);
      if (e < err) { err = e; best = FRACS[i]; }
    }
    if (best[0] === 1) { whole += 1; best = FRACS[0]; }
    var text = whole === 0 && !best[1] ? '0' : (whole ? String(whole) : '') + (whole && best[1] ? ' ' : '') + best[1];
    return { text: text, exact: err < 0.005, error: err };
  }

  // Temperatures.
  function fToC(f) { return (f - 32) * 5 / 9; }
  function cToF(c) { return c * 9 / 5 + 32; }
  var GAS_MARKS = [
    { mark: '¼', f: 225, c: 110 }, { mark: '½', f: 250, c: 120 }, { mark: '1', f: 275, c: 140 },
    { mark: '2', f: 300, c: 150 }, { mark: '3', f: 325, c: 160 }, { mark: '4', f: 350, c: 180 },
    { mark: '5', f: 375, c: 190 }, { mark: '6', f: 400, c: 200 }, { mark: '7', f: 425, c: 220 },
    { mark: '8', f: 450, c: 230 }, { mark: '9', f: 475, c: 240 }, { mark: '10', f: 500, c: 260 }
  ];
  function gasMarkForF(f) {
    var best = null, err = Infinity;
    for (var i = 0; i < GAS_MARKS.length; i++) {
      var e = Math.abs(GAS_MARKS[i].f - f);
      if (e < err) { err = e; best = GAS_MARKS[i]; }
    }
    return err <= 12.5 ? best : null;
  }

  // Pans. Dimensions in inches. Returns { area (in^2), volume (in^3), cups }.
  function panGeometry(p) {
    var area = 0, volume = 0;
    switch (p.shape) {
      case 'round': area = Math.PI * Math.pow(p.diameter / 2, 2); break;
      case 'square': area = p.side * p.side; break;
      case 'rect':
      case 'loaf': area = p.length * p.width; break;
      case 'bundt':
        volume = p.cups * CUBIC_IN_PER_CUP;
        return { area: NaN, volume: volume, cups: p.cups };
      default: throw new Error('Unknown pan shape');
    }
    volume = area * (p.depth || 0);
    return { area: area, volume: volume, cups: volume / CUBIC_IN_PER_CUP };
  }

  // How much to multiply a recipe made for `from` so it fits `to`.
  // basis 'area' keeps batter depth the same; 'volume' keeps the pans equally full.
  function panScale(from, to, basis) {
    var a = panGeometry(from), b = panGeometry(to);
    var useVolume = basis === 'volume' || from.shape === 'bundt' || to.shape === 'bundt';
    return useVolume ? b.volume / a.volume : b.area / a.area;
  }

  return {
    VOLUME: VOLUME, WEIGHT: WEIGHT, CUP_ML: CUP_ML, CUBIC_IN_PER_CUP: CUBIC_IN_PER_CUP, GAS_MARKS: GAS_MARKS,
    kind: kind, convert: convert, convertVolume: convertVolume, convertWeight: convertWeight,
    parseAmount: parseAmount, formatNumber: formatNumber, toFraction: toFraction,
    fToC: fToC, cToF: cToF, gasMarkForF: gasMarkForF, panGeometry: panGeometry, panScale: panScale
  };
});
