/* Interactive converter UI. Depends on assets/convert.js (window.KC). */
(function () {
  'use strict';
  var KC = window.KC;
  var $ = function (id) { return document.getElementById(id); };
  var SPOON_CUP = { tsp: 1, tbsp: 1, cup: 1 };

  function fmtUnit(value, unit) {
    var u = KC.VOLUME[unit] || KC.WEIGHT[unit];
    var num = KC.formatNumber(value);
    if (SPOON_CUP[unit] && value > 0 && value < 100) {
      var f = KC.toFraction(value);
      if (f && f.text !== '0') {
        var approx = f.exact ? '' : '≈ ';
        if (f.exact || Math.abs(value) >= 0.1) return approx + f.text + ' ' + u.short + (f.exact ? '' : ' (' + num + ')');
      }
    }
    return num + ' ' + u.short;
  }

  function fillUnitSelect(sel, kinds, def) {
    var groups = { volume: KC.VOLUME, weight: KC.WEIGHT };
    sel.innerHTML = '';
    kinds.forEach(function (k) {
      var og = document.createElement('optgroup');
      og.label = k === 'volume' ? 'Volume' : 'Weight';
      Object.keys(groups[k]).forEach(function (key) {
        var o = document.createElement('option');
        o.value = key; o.textContent = groups[k][key].label + ' (' + groups[k][key].short + ')';
        og.appendChild(o);
      });
      sel.appendChild(og);
    });
    sel.value = def;
  }

  function chipList(el, value, from, units, gpc) {
    el.innerHTML = '';
    units.forEach(function (u) {
      if (u === from) return;
      var v = KC.convert(value, from, u, gpc);
      if (!isFinite(v)) return;
      var li = document.createElement('li');
      var b = document.createElement('b');
      b.textContent = fmtUnit(v, u);
      li.appendChild(b);
      li.appendChild(document.createTextNode((KC.VOLUME[u] || KC.WEIGHT[u]).label));
      el.appendChild(li);
    });
  }

  var params = new URLSearchParams(location.search);

  // ---- Units ----
  (function units() {
    var amt = $('u-amount'), from = $('u-from'), to = $('u-to'), out = $('u-result'), sub = $('u-sub'), chips = $('u-chips');
    if (!amt) return;
    var all = ['volume', 'weight'];
    fillUnitSelect(from, all, 'cup');
    fillUnitSelect(to, all, 'tbsp');
    function run() {
      var v = KC.parseAmount(amt.value);
      var kf = KC.kind(from.value), kt = KC.kind(to.value);
      if (!isFinite(v)) { out.textContent = 'Enter an amount like 1, 1.5 or 1 1/2'; sub.textContent = ''; chips.innerHTML = ''; return; }
      if (kf !== kt) {
        out.textContent = 'Volume ↔ weight depends on the ingredient';
        sub.innerHTML = 'Use the <a href="#ingredients">ingredient converter</a> below for cups ↔ grams.';
        chips.innerHTML = '';
        return;
      }
      var r = KC.convert(v, from.value, to.value);
      out.textContent = amt.value.trim() + ' ' + (KC.VOLUME[from.value] || KC.WEIGHT[from.value]).short + ' = ' + fmtUnit(r, to.value);
      sub.textContent = 'Exact: ' + r.toPrecision(6).replace(/\.?0+$/, '') + ' ' + (KC.VOLUME[to.value] || KC.WEIGHT[to.value]).label + ' (US customary measures)';
      chipList(chips, v, from.value, Object.keys(kf === 'volume' ? KC.VOLUME : KC.WEIGHT));
    }
    [amt, from, to].forEach(function (el) { el.addEventListener('input', run); });
    $('u-swap').addEventListener('click', function () { var t = from.value; from.value = to.value; to.value = t; run(); });
    run();
  })();

  // ---- Ingredients ----
  (function ingredients() {
    var dataEl = $('ingredient-data'), sel = $('i-ing');
    if (!dataEl || !sel) return;
    var data = JSON.parse(dataEl.textContent).ingredients;
    var bySlug = {};
    var groups = {};
    data.forEach(function (d) { bySlug[d.slug] = d; (groups[d.group] = groups[d.group] || []).push(d); });
    Object.keys(groups).forEach(function (g) {
      var og = document.createElement('optgroup'); og.label = g;
      groups[g].forEach(function (d) { var o = document.createElement('option'); o.value = d.slug; o.textContent = d.name; og.appendChild(o); });
      sel.appendChild(og);
    });
    var amt = $('i-amount'), from = $('i-from'), to = $('i-to'), out = $('i-result'), sub = $('i-sub'), chips = $('i-chips'), src = $('i-source');
    fillUnitSelect(from, ['volume', 'weight'], 'cup');
    fillUnitSelect(to, ['weight', 'volume'], 'g');
    if (params.get('ing') && bySlug[params.get('ing')]) sel.value = params.get('ing');
    if (params.get('amt')) amt.value = params.get('amt');
    if (params.get('from') && KC.kind(params.get('from'))) from.value = params.get('from');
    if (params.get('to') && KC.kind(params.get('to'))) to.value = params.get('to');
    function run() {
      var d = bySlug[sel.value];
      var v = KC.parseAmount(amt.value);
      if (!d) return;
      src.innerHTML = '';
      src.appendChild(document.createTextNode('1 cup ≈ ' + d.gramsPerCup + ' g. Source: USDA FoodData Central #'));
      var a = document.createElement('a');
      a.href = 'https://fdc.nal.usda.gov/food-details/' + d.fdcId + '/portions';
      a.rel = 'noopener'; a.textContent = d.fdcId;
      src.appendChild(a);
      src.appendChild(document.createTextNode(' (' + d.usdaPortion + ').'));
      if (!isFinite(v)) { out.textContent = 'Enter an amount like 1, 0.5 or 2/3'; sub.textContent = ''; chips.innerHTML = ''; return; }
      var r = KC.convert(v, from.value, to.value, d.gramsPerCup);
      var fu = KC.VOLUME[from.value] || KC.WEIGHT[from.value];
      out.textContent = amt.value.trim() + ' ' + fu.short + ' ' + d.name.toLowerCase() + ' ≈ ' + fmtUnit(r, to.value);
      sub.textContent = 'Weights are approximate: how you fill the cup matters, especially for flour and powders.';
      chipList(chips, v, from.value, ['g', 'oz', 'lb', 'cup', 'tbsp', 'tsp', 'ml'], d.gramsPerCup);
    }
    [sel, amt, from, to].forEach(function (el) { el.addEventListener('input', run); });
    $('i-swap').addEventListener('click', function () { var t = from.value; from.value = to.value; to.value = t; run(); });
    run();
  })();

  // ---- Temperature ----
  (function temperature() {
    var f = $('t-f'), c = $('t-c'), gas = $('t-gas');
    if (!f) return;
    function showGas(fv) {
      var g = isFinite(fv) ? KC.gasMarkForF(fv) : null;
      gas.textContent = g ? 'Gas Mark ' + g.mark : (isFinite(fv) ? 'No gas mark (outside 225–500 °F)' : '–');
      var fan = $('t-fan');
      if (fan) fan.textContent = isFinite(fv) ? 'Fan / convection oven: about ' + Math.round(fv - 25) + ' °F / ' + Math.round(KC.fToC(fv) - 15) + ' °C' : '';
    }
    f.addEventListener('input', function () {
      var v = parseFloat(f.value);
      c.value = isFinite(v) ? Math.round(KC.fToC(v)) : '';
      showGas(v);
    });
    c.addEventListener('input', function () {
      var v = parseFloat(c.value);
      var fv = isFinite(v) ? KC.cToF(v) : NaN;
      f.value = isFinite(fv) ? Math.round(fv) : '';
      showGas(fv);
    });
    var gsel = $('t-gas-pick');
    KC.GAS_MARKS.forEach(function (g, i) {
      var o = document.createElement('option'); o.value = i; o.textContent = 'Gas Mark ' + g.mark; gsel.appendChild(o);
    });
    gsel.addEventListener('input', function () {
      if (gsel.value === '') return;
      var g = KC.GAS_MARKS[+gsel.value];
      f.value = g.f; c.value = g.c; showGas(g.f);
    });
    if (f.value) f.dispatchEvent(new Event('input'));
  })();

  // ---- Pans ----
  (function pans() {
    var form = $('pan-form');
    if (!form) return;
    var PRESETS = {
      'round-8': { shape: 'round', diameter: 8, depth: 2 },
      'round-9': { shape: 'round', diameter: 9, depth: 2 },
      'round-10': { shape: 'round', diameter: 10, depth: 2 },
      'square-8': { shape: 'square', side: 8, depth: 2 },
      'square-9': { shape: 'square', side: 9, depth: 2 },
      'rect-9x13': { shape: 'rect', length: 13, width: 9, depth: 2 },
      'rect-11x7': { shape: 'rect', length: 11, width: 7, depth: 2 },
      'rect-15x10': { shape: 'rect', length: 15, width: 10, depth: 1 },
      'loaf-9x5': { shape: 'loaf', length: 9, width: 5, depth: 3 },
      'loaf-8x4': { shape: 'loaf', length: 8.5, width: 4.5, depth: 2.75 },
      'bundt-10': { shape: 'bundt', cups: 10 },
      'bundt-12': { shape: 'bundt', cups: 12 },
      'bundt-6': { shape: 'bundt', cups: 6 }
    };
    var FIELDS = { round: ['diameter', 'depth'], square: ['side', 'depth'], rect: ['length', 'width', 'depth'], loaf: ['length', 'width', 'depth'], bundt: ['cups'] };
    var IN_PER_CM = 1 / 2.54;
    function metric() { return form.querySelector('input[name="pan-units"]:checked').value === 'cm'; }

    function side(prefix) {
      var shape = $(prefix + '-shape');
      function showFields() {
        FIELDS.round.concat(['side', 'length', 'width', 'cups']).forEach(function (k) {
          var w = $(prefix + '-' + k + '-wrap');
          if (w) w.hidden = FIELDS[shape.value].indexOf(k) === -1;
        });
      }
      $(prefix + '-preset').addEventListener('input', function () {
        var p = PRESETS[this.value];
        if (!p) return;
        shape.value = p.shape;
        var m = metric();
        Object.keys(p).forEach(function (k) {
          if (k === 'shape') return;
          var el = $(prefix + '-' + k);
          if (el) el.value = (k !== 'cups' && m) ? +(p[k] * 2.54).toFixed(1) : p[k];
        });
        showFields();
      });
      shape.addEventListener('input', function () { $(prefix + '-preset').value = ''; showFields(); });
      showFields();
      return function read() {
        var p = { shape: shape.value }, m = metric(), ok = true;
        FIELDS[shape.value].forEach(function (k) {
          var v = parseFloat($(prefix + '-' + k).value);
          if (!(v > 0)) ok = false;
          p[k] = (k !== 'cups' && m) ? v * IN_PER_CM : v;
        });
        return ok ? p : null;
      };
    }
    var readA = side('pa'), readB = side('pb');
    var out = $('p-result'), sub = $('p-sub');
    function describe(g, m) {
      if (isNaN(g.area)) return KC.formatNumber(g.cups) + ' cups capacity';
      var area = m ? KC.formatNumber(g.area * 6.4516) + ' cm²' : KC.formatNumber(g.area) + ' sq in';
      return area + ', about ' + KC.formatNumber(g.cups) + ' cups to the brim';
    }
    function run() {
      var a = readA(), b = readB();
      if (!a || !b) { out.textContent = 'Fill in every size for both pans'; sub.textContent = ''; return; }
      var basis = $('p-basis').value;
      var s = KC.panScale(a, b, basis);
      var usedVolume = basis === 'volume' || a.shape === 'bundt' || b.shape === 'bundt';
      out.textContent = 'Multiply the recipe by ' + KC.formatNumber(s) + (KC.toFraction(s) && KC.toFraction(s).exact ? ' (' + KC.toFraction(s).text + ')' : '');
      var m = metric();
      sub.textContent = 'Original pan: ' + describe(KC.panGeometry(a), m) + '. New pan: ' + describe(KC.panGeometry(b), m) + '. ' +
        (usedVolume ? 'Compared by volume.' : 'Compared by area, so the batter stays the same depth.') +
        (s > 1.15 || s < 0.85 ? ' Baking time will change: check early and use a toothpick.' : '');
    }
    form.addEventListener('input', run);
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    form.querySelectorAll('input[name="pan-units"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var toCm = r.value === 'cm';
        ['pa', 'pb'].forEach(function (p) {
          ['diameter', 'side', 'length', 'width', 'depth'].forEach(function (k) {
            var el = $(p + '-' + k), v = parseFloat(el.value);
            if (v > 0) el.value = toCm ? +(v * 2.54).toFixed(1) : +(v / 2.54).toFixed(2);
          });
        });
        form.querySelectorAll('.len-unit').forEach(function (s) { s.textContent = toCm ? 'cm' : 'in'; });
        run();
      });
    });
    run();
  })();
})();
