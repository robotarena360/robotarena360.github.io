/* ===============================================================
   Results figures, drawn in the page from static/data/*.json.

   This is a port of the paper's figure code (manip-eureka-droid
   build_paper_figures_html.py / build_final_figures.py /
   make_trace_figure.py, and manip-eureka-robotarena
   fig_combined_svg.py): same primitives, palette and font sizes,
   but laid out for the width the page gives each figure and
   redrawn when that width changes. Coordinates are "paper px";
   a figure 1.35x wider on screen than its paper coordinates keeps
   the paper's 8.5-10 px labels at a readable 11-13.5 px.
   Data comes from tools/export_figure_data.py.
   =============================================================== */
(function () {
  'use strict';

  var INK = '#1a1a1a', INK2 = '#5c5b57', MUTED = '#8c8a84', AXIS = '#c9c7c0', SURF = '#ffffff';
  var GOOD = '#0c8a3e', BAD = '#c0392e';

  // ---------------------------------------------------------------- primitives
  function fmt(v, signed) {
    var s = (signed && v >= 0 ? '+' : '') + v.toFixed(2);
    return s.replace('-', '−');
  }
  function cls(c) { return c.split(' ').map(function (k) { return 'pf-' + k; }).join(' '); }
  function text(x, y, s, c, anchor, extra) {
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" class="' + cls(c || 't9 ink') +
      '" text-anchor="' + (anchor || 'start') + '" ' + (extra || '') + '>' + s + '</text>';
  }
  function tip(s) { return s ? ' data-tip="' + String(s).replace(/"/g, '&quot;') + '"' : ''; }
  function barV(x, w, y0, y1, color, r, op, t) {
    var h = Math.max(y0 - y1, 0.1);
    r = Math.min(r === undefined ? 3 : r, w / 2, h);
    return '<path d="M' + x.toFixed(1) + ',' + y0.toFixed(1) + ' v-' + (h - r).toFixed(1) +
      ' a' + r + ',' + r + ' 0 0 1 ' + r + ',-' + r + ' h' + (w - 2 * r).toFixed(1) +
      ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + ' v' + (h - r).toFixed(1) + ' z" fill="' + color + '"' +
      (op !== undefined && op !== 1 ? ' fill-opacity="' + op + '"' : '') + tip(t) + ' class="pf-hot"/>';
  }
  function ciV(x, lo, hi, op) {
    return '<line x1="' + x.toFixed(1) + '" y1="' + lo.toFixed(1) + '" x2="' + x.toFixed(1) + '" y2="' + hi.toFixed(1) +
      '" stroke="' + INK + '" stroke-opacity="' + (op || 0.45) + '" stroke-width="1.1" stroke-linecap="round"/>';
  }
  function ciH(x0, x1, y, op) {
    return '<line x1="' + x0.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y.toFixed(1) +
      '" stroke="' + INK + '" stroke-opacity="' + (op || 0.5) + '" stroke-width="1.1" stroke-linecap="round"/>';
  }
  function hline(x0, x1, y, isAxis) {
    return '<line x1="' + x0.toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + x1.toFixed(1) + '" y2="' + y.toFixed(1) +
      '" class="' + (isAxis ? 'pf-axis' : 'pf-grid') + '"/>';
  }
  function svg(w, h, body, label) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w.toFixed(1) + ' ' + Math.ceil(h) +
      '" role="img" aria-label="' + label + '">' + body + '</svg>';
  }
  // Legend: a run of [swatch, label] items; returns the x after the last one.
  function legend(o, x, y, items) {
    items.forEach(function (it) {
      if (it.kind === 'ci') {
        o.push(ciH(x, x + 12, y - 4) + text(x + 15, y, it.label, 't8 ink2'));
        x += 15 + it.label.length * 4.3 + 12;
      } else {
        o.push('<rect x="' + x + '" y="' + (y - 7) + '" width="9" height="6.5" rx="1" fill="' + (it.color || INK2) +
          '" fill-opacity="' + (it.op === undefined ? 1 : it.op) + '"/>' + text(x + 12, y, it.label, 't8 ink2'));
        x += 12 + it.label.length * 4.3 + 12;
      }
    });
    return x;
  }

  /* Vertical grouped bars with CI whiskers and the value above each whisker: the panel
     used by the gains, receiver and async figures. groups: [{label, sub:[..], bars:[{v, ci, color, op, tip}]}] */
  function barPanel(o, p) {
    var L = p.x + 30, PW = p.w - 30 - 8, top = p.y + 20, ph = p.h;
    var sy = function (v) { return top + ph - v / p.ymax * ph; };
    o.push(text(L - 26, top - 6, '(' + p.letter + ')', 't10 ink b'));
    o.push(text(L, top - 6, p.title, 't8 ink2'));
    p.ticks.forEach(function (t) {
      o.push(hline(L, L + PW, sy(t), t === 0));
      if (t) o.push(text(L - 4, sy(t) + 3, t.toFixed(1), 't8 muted', 'end'));
    });
    var gw = PW / p.groups.length;
    p.groups.forEach(function (g, i) {
      var cx = L + gw * (i + 0.5), n = g.bars.length;
      var bw = Math.min(p.bwMax, gw * (n === 3 ? 0.24 : 0.3)), gap = n === 3 ? 2 : 3;
      g.bars.forEach(function (b, j) {
        var x = cx + (j - (n - 1) / 2) * (bw + gap) - bw / 2;
        o.push(barV(x, bw, sy(0), sy(b.v), b.color, 2.5, b.op, b.tip));
        o.push(ciV(x + bw / 2, sy(b.ci[0]), sy(b.ci[1])));
        o.push(text(x + bw / 2, sy(b.ci[1]) - 3, fmt(b.v), 't8 ink2', 'middle', 'font-size="' + p.valSize + 'px"'));
      });
      var ly = top + ph + 11;
      o.push(text(cx, ly, g.label, 't9 ink', 'middle'));
      (g.sub || []).forEach(function (s, k) {
        o.push(text(cx, ly + 11 + k * 9.5, s, 't8 muted', 'middle', 'font-size="7.5px"'));
      });
    });
    return top + ph + 11 + (p.subRows || 0) * 9.5 + 4;
  }

  function statTip(label, s) {
    return label + ': success ' + fmt(s.sr) + ' [' + fmt(s.sr_ci[0]) + ', ' + fmt(s.sr_ci[1]) + ']' +
      ' · score ' + fmt(s.ms) + ' [' + fmt(s.ms_ci[0]) + ', ' + fmt(s.ms_ci[1]) + ']' +
      (s.n ? ' · ' + s.n + ' rollouts' : '');
  }
  function delta(v) { return fmt(Math.abs(v) < 0.005 ? 0 : v, true); }

  // ---------------------------------------------------------------- PD gains / shadow receiver
  function drawGains(W, data) {
    var o = [], wide = W >= 470, pw = wide ? W / 2 : W;
    var metrics = [['sr', 'sr_ci', 'success rate'], ['ms', 'ms_ci', 'mean progress score']];
    var bottom = 0;
    metrics.forEach(function (m, k) {
      var x = wide ? k * pw : 0, y = wide ? 0 : k * 132;
      var b = barPanel(o, {
        x: x, y: y, w: pw, h: wide ? 84 : 62, ymax: 0.9, ticks: [0, 0.2, 0.4, 0.6, 0.8], letter: 'ab'[k], title: m[2],
        bwMax: wide ? 22 : 17, valSize: 7, subRows: 2,
        groups: data.rows.map(function (r) {
          var cfgs = [['stock', 'stock', r.tint, 1], ['shared', 'sysid-A', r.color, 0.55], ['pi', 'sysid-B', r.color, 1]];
          return {
            label: r.name,
            sub: ['Δ ' + delta(r['d_shared_' + m[0]][0]) + ' (A)', 'Δ ' + delta(r['d_pi_' + m[0]][0]) + ' (B)'],
            bars: cfgs.map(function (c) {
              var s = r[c[0]];
              return { v: s[m[0]], ci: s[m[1]], color: c[2], op: c[3], tip: r.name + ' · ' + statTip(c[1], s) };
            })
          };
        })
      });
      bottom = Math.max(bottom, b);
    });
    var ly = bottom + 10;
    legend(o, 30, ly, [{ label: 'stock', op: 0.3 }, { label: 'sysid-A', op: 0.6 }, { label: 'sysid-B' }, { kind: 'ci', label: '95% CI' }]);
    return svg(W, ly + 6, o.join(''), 'Success rate and mean progress under three PD-gain profiles');
  }

  function drawReceiver(W, data) {
    var o = [], wide = W >= 560;
    var barsW = wide ? W * 0.62 : W, pw = wide ? barsW / 2 : W / 2;
    var metrics = [['sr', 'sr_ci', 'success rate'], ['ms', 'ms_ci', 'mean score']];
    var bottom = 0;
    metrics.forEach(function (m, k) {
      var b = barPanel(o, {
        x: k * pw, y: 0, w: pw, h: wide ? 84 : 70, ymax: 0.9, ticks: [0, 0.2, 0.4, 0.6, 0.8], letter: 'ab'[k], title: m[2],
        bwMax: wide ? 24 : 20, valSize: 7.5, subRows: 1,
        groups: data.rows.map(function (r) {
          return {
            label: r.name.replace(' N1.7', ''),
            sub: ['Δ ' + delta(r['d_' + m[0]][0])],
            bars: [
              { v: r.legacy[m[0]], ci: r.legacy[m[1]], color: r.tint, tip: r.name + ' · ' + statTip('textured mesh', r.legacy) },
              { v: r.native[m[0]], ci: r.native[m[1]], color: r.color, tip: r.name + ' · ' + statTip('Gaussian composite', r.native) }
            ]
          };
        })
      });
      bottom = Math.max(bottom, b);
    });
    // (c) what each receiver renders: one row per scene, the two receivers side by side
    var ex = wide ? barsW + 16 : 0, ew = wide ? W - barsW - 16 : W, ey = wide ? 0 : bottom + 8;
    var names = ['textured mesh', 'Gaussian composite'], gap = 5;
    var tw = (ew - gap) / 2, th = tw * 146 / 300;
    o.push(text(ex, ey + 14, '(c)', 't10 ink b'));
    names.forEach(function (n, c) {
      o.push(text(ex + c * (tw + gap) + tw / 2, ey + 14, n, 't8 ink2', 'middle'));
    });
    data.tiles.forEach(function (scene, row) {
      var y = ey + 20 + row * (th + 4);
      ['legacy', 'native'].forEach(function (rcv, c) {
        var x = ex + c * (tw + gap), id = 'rc' + row + c;
        o.push('<clipPath id="' + id + '"><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + tw.toFixed(1) +
          '" height="' + th.toFixed(1) + '" rx="3"/></clipPath>');
        o.push('<image x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + tw.toFixed(1) + '" height="' + th.toFixed(1) +
          '" href="./static/figures/receiver/' + scene + '_' + rcv + '.jpg" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"' +
          tip(names[c]) + '/>');
        o.push('<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + tw.toFixed(1) + '" height="' + th.toFixed(1) +
          '" rx="3" fill="none" stroke="' + AXIS + '" stroke-width="0.8"/>');
      });
    });
    var tilesBottom = ey + 20 + data.tiles.length * (th + 4);
    // wide: the legend sits under the bars, beside the tiles; narrow: under everything
    var ly = (wide ? bottom : Math.max(bottom, tilesBottom)) + 14;
    legend(o, 30, ly, [{ label: 'textured mesh', op: 0.3 }, { label: 'Gaussian composite' }, { kind: 'ci', label: '95% CI' }]);
    return svg(W, Math.max(ly + 6, tilesBottom + 2), o.join(''), 'Success and progress with a textured-mesh versus a Gaussian-composite shadow receiver');
  }

  // ---------------------------------------------------------------- asynchronous execution
  function drawAsync(W, data) {
    var o = [], wide = W >= 420, pw = wide ? W / 2 : W;
    var metrics = [['sr', 'sr_ci', 'success rate'], ['ms', 'ms_ci', 'mean progress score']];
    var bottom = 0;
    metrics.forEach(function (m, k) {
      var b = barPanel(o, {
        x: wide ? k * pw : 0, y: wide ? 0 : k * 170, w: pw, h: 90, ymax: 0.8, ticks: [0, 0.2, 0.4, 0.6, 0.8],
        letter: 'ab'[k], title: m[2], bwMax: wide ? 30 : 22, valSize: 7.5, subRows: 2,
        groups: data.rows.map(function (r) {
          return {
            label: r.name,
            sub: ['async latency ' + Math.round(r.latency_ms) + ' ms', 'Δ ' + delta(r['d_' + m[0]][0])],
            bars: [
              { v: r.blocking[m[0]], ci: r.blocking[m[1]], color: r.tint, tip: r.name + ' · ' + statTip('blocking', r.blocking) },
              { v: r.async[m[0]], ci: r.async[m[1]], color: r.color, tip: r.name + ' · ' + statTip('async, real time', r.async) }
            ]
          };
        })
      });
      bottom = Math.max(bottom, b);
    });
    var ly = bottom + 12;
    legend(o, 30, ly, [{ label: 'blocking', op: 0.3 }, { label: 'async (real time)' }, { kind: 'ci', label: '95% CI' }]);
    var note = 'Δ = async − blocking, paired over ' + data.tasks + ' tasks';
    var ny = W >= 520 ? ly : ly + 14;
    o.push(text(W >= 520 ? W - 8 : 30, ny, note, 't8 muted', W >= 520 ? 'end' : 'start'));
    return svg(W, ny + 6, o.join(''), 'Success and progress under blocking versus asynchronous execution');
  }

  // ---------------------------------------------------------------- human agreement
  function drawValidation(W, data) {
    var o = [], L = 30, R = 10;
    var byKey = {}; data.series.forEach(function (s) { byKey[s.ours ? 'ours' : 'gvl'] = s; });
    var drawOrder = data.series;                       // GVL cloud first, ours on top
    var lineCol = { gvl: '#9c9b95', ours: byKey.ours.color }, lineW = { gvl: 1.3, ours: 1.6 };
    var dash = { gvl: ' stroke-dasharray="4 2"', ours: '' };

    // wide: the scatter on the left, the metric bars stacked on the right
    var wide = W >= 560, split = wide ? W * 0.56 : W;

    // (a) predicted vs human score
    var ta = 18, pha = wide ? 172 : Math.max(104, W * 0.3), xa0 = L, xa1 = split - (wide ? 0 : R) - 46;
    var sx = function (v) { return xa0 + (v + 0.1) / 1.2 * (xa1 - xa0); };
    var sy = function (v) { return ta + pha - (v + 0.03) / 1.08 * pha; };
    o.push(text(4, ta - 4, '(a)', 't10 ink b'));
    o.push(text(xa1 + 46, ta - 4, 'predicted vs. human score', 't8 ink2', 'end'));
    [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
      o.push(hline(xa0, xa1, sy(t), t === 0));
      if (t) o.push(text(xa0 - 4, sy(t) + 3, t.toFixed(2), 't8 muted', 'end'));
    });
    data.levels.forEach(function (lv) { o.push(text(sx(lv), ta + pha + 11, (lv * 100).toFixed(0), 't8 muted', 'middle')); });
    o.push(text((xa0 + xa1) / 2, ta + pha + 21, 'human score', 't8 muted', 'middle'));
    o.push('<line x1="' + sx(0).toFixed(1) + '" y1="' + sy(0).toFixed(1) + '" x2="' + sx(1).toFixed(1) + '" y2="' + sy(1).toFixed(1) +
      '" stroke="' + AXIS + '" stroke-width="1" stroke-dasharray="1.5 2"/>');
    drawOrder.forEach(function (s) {
      s.points.forEach(function (p) {
        var human = Math.round(p[0] * 4) / 4;
        o.push('<circle cx="' + sx(p[0]).toFixed(1) + '" cy="' + sy(p[1]).toFixed(1) + '" r="1.9" fill="' + s.color +
          '" fill-opacity="' + (s.ours ? 0.55 : 0.85) + '" class="pf-hot"' +
          tip(s.label + ': predicted ' + p[1].toFixed(2) + ' · human ' + (human * 100).toFixed(0)) + '/>');
      });
    });
    var ends = [];
    drawOrder.forEach(function (s) {
      var k = s.ours ? 'ours' : 'gvl';
      o.push('<line x1="' + sx(0).toFixed(1) + '" y1="' + sy(s.fit[0]).toFixed(1) + '" x2="' + sx(1).toFixed(1) + '" y2="' + sy(s.fit[1]).toFixed(1) +
        '" stroke="' + lineCol[k] + '" stroke-width="' + lineW[k] + '" stroke-linecap="round"' + dash[k] + '/>');
      ends.push([sy(s.fit[1]), s, k]);
    });
    ends.sort(function (a, b) { return a[0] - b[0]; });
    for (var i = 1; i < ends.length; i++) ends[i][0] = Math.max(ends[i][0], ends[i - 1][0] + 9);
    ends.forEach(function (e) {
      var y = e[0], s = e[1], k = e[2];
      o.push('<line x1="' + (xa1 + 3).toFixed(1) + '" y1="' + y.toFixed(1) + '" x2="' + (xa1 + 11).toFixed(1) + '" y2="' + y.toFixed(1) +
        '" stroke="' + lineCol[k] + '" stroke-width="' + lineW[k] + '" stroke-linecap="round"' + dash[k] + '/>');
      o.push(text(xa1 + 13, y + 3, '<tspan class="pf-i">r</tspan> ' + s.stats.pearson.toFixed(2), s.ours ? 't8 ink b' : 't8 ink2'));
    });

    // (b) correlations and (c) MSE
    var lay = wide
      ? { b: [split + 44, W - R, ta, 72], c: [split + 44, W - R, ta + 72 + 50] }
      : { b: [L, W - R, ta + pha + 42, 64], c: [L, W - R, ta + pha + 42 + 64 + 44] };
    var bw = Math.max(15, Math.min(24, (lay.b[1] - lay.b[0]) / 3 * 0.17));
    function bars(box, groups, ymax, ticks, tickFmt, letter, title, labFmt, gap) {
      var x0 = box[0], x1 = box[1], tb = box[2], phb = box[3];
      var offs = [-(bw + gap / 2), gap / 2];
      var syb = function (v) { return tb + phb - v / ymax * phb; };
      o.push(text(x0 - 26, tb - 4, '(' + letter + ')', 't10 ink b'));
      o.push(text(x1, tb - 4, title, 't8 ink2', 'end'));
      ticks.forEach(function (t) {
        o.push(hline(x0, x1, syb(t), t === 0));
        if (t) o.push(text(x0 - 4, syb(t) + 3, tickFmt(t), 't8 muted', 'end'));
      });
      var gw = (x1 - x0) / groups.length;
      groups.forEach(function (g, gi) {
        var cx = x0 + gw * (gi + 0.5);
        drawOrder.forEach(function (s, si) {
          var v = s.stats[g[0]], ci = s.ci[g[0]], x = cx + offs[si];
          o.push(barV(x, bw, syb(0), syb(v), s.color, 2.5, s.opacity,
            s.label + ': ' + g[2] + ' ' + labFmt(v) + ' [' + labFmt(ci[0]) + ', ' + labFmt(ci[1]) + ']'));
          o.push(ciV(x + bw / 2, syb(ci[0]), syb(ci[1])));
          o.push(text(x + bw / 2, syb(ci[1]) - 3, labFmt(v), 't8 ink2', 'middle', 'font-size="6.5px"'));
        });
        if (g[1]) o.push(text(cx, tb + phb + 11, g[1], 't9 ink', 'middle'));
      });
    }
    var dot = function (v, d) { return v.toFixed(d).replace(/^0/, ''); };
    bars(lay.b, [['pearson', 'Pearson <tspan class="pf-i">r</tspan>', 'Pearson r'],
                    ['spearman', 'Spearman <tspan class="pf-i">ρ</tspan>', 'Spearman ρ'],
                    ['kendall', 'Kendall <tspan class="pf-i">τ</tspan><tspan font-size="6.5px" dy="2">b</tspan>', 'Kendall τb']],
      1.0, [0, 0.25, 0.5, 0.75, 1], function (t) { return t.toFixed(2); }, 'b', 'correlation ↑',
      function (v) { return dot(v, 2); }, 1.5);
    // (c) MSE as a horizontal comparison: one row per scorer on a shared axis, lower is better
    (function (box) {
      var x0 = box[0], x1 = box[1], tc = box[2], rowH = 17, bh = 11, xmax = 0.14;
      var ax = x0 + 26, sxc = function (v) { return ax + v / xmax * (x1 - ax); };
      var rows = [byKey.ours, byKey.gvl];
      o.push(text(x0 - 26, tc - 4, '(c)', 't10 ink b'));
      o.push(text(x1, tc - 4, 'mean squared error \u2193', 't8 ink2', 'end'));
      var bottomY = tc + rows.length * rowH + 4;
      [0, 0.04, 0.08, 0.12].forEach(function (t) {
        o.push('<line x1="' + sxc(t).toFixed(1) + '" y1="' + tc + '" x2="' + sxc(t).toFixed(1) + '" y2="' + bottomY +
          '" class="' + (t === 0 ? 'pf-axis' : 'pf-grid') + '"/>');
        o.push(text(sxc(t), bottomY + 10, t === 0 ? '0' : dot(t, 2), 't8 muted', 'middle'));
      });
      rows.forEach(function (s, i) {
        var y = tc + 3 + i * rowH, v = s.stats.mse, ci = s.ci.mse, cy = y + bh / 2;
        o.push(text(ax - 5, cy + 3, s.ours ? 'Ours' : 'GVL', s.ours ? 't9 ink b' : 't9 ink', 'end'));
        var w = Math.max(sxc(v) - ax, 0.1), r = Math.min(2.5, w / 2);
        o.push('<path d="M' + ax.toFixed(1) + ',' + y.toFixed(1) + ' h' + (w - r).toFixed(1) + ' a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
          ' v' + (bh - 2 * r).toFixed(1) + ' a' + r + ',' + r + ' 0 0 1 -' + r + ',' + r + ' h-' + (w - r).toFixed(1) + ' z" fill="' + s.color + '"' +
          (s.opacity !== 1 ? ' fill-opacity="' + s.opacity + '"' : '') + ' class="pf-hot"' +
          tip(s.label + ': MSE ' + dot(v, 3) + ' [' + dot(ci[0], 3) + ', ' + dot(ci[1], 3) + ']') + '/>');
        o.push(ciH(sxc(ci[0]), sxc(ci[1]), cy, 0.45));
        o.push(text(sxc(ci[1]) + 4, cy + 3, dot(v, 3), s.ours ? 't8 ink b' : 't8 ink2'));
      });
      lay.c.push(bottomY + 12 - tc);
    })(lay.c);

    var ly = Math.max(wide ? ta + pha + 36 : 0, lay.c[2] + lay.c[3] + 16);
    legend(o, L, ly, [{ label: byKey.ours.label, color: byKey.ours.color }, { label: byKey.gvl.label, color: byKey.gvl.color },
                      { kind: 'ci', label: '95% CI' }]);
    return svg(W, ly + 5, o.join(''), 'Agreement of the synthesized evaluator and GVL with human progress scores');
  }

  // ---------------------------------------------------------------- stage-wise traces
  function drawTraces(W, data, state) {
    var o = [], cols = W >= 540 ? 2 : 1, gapx = 24, M = 2, MR = 8;  // MR: room for the last event marker
    var colw = (W - M - MR - (cols - 1) * gapx) / cols;
    var FW = Math.min(cols === 2 ? 74 : 80, (colw - 26 - 15) / 4), FH = FW, plotH = cols === 2 ? 64 : 72;
    var blockH = 14 + FH + 14 + plotH + 18;
    var SC = data.stage_colors, stages = data.stages, miles = data.milestones;
    state.panels = [];

    data.episodes.forEach(function (ep, bi) {
      var ox = M + (bi % cols) * (colw + gapx), oy = Math.floor(bi / cols) * (blockH + 10);
      var L = ox + 26, PW = colw - 26, cut = ep.cut;
      var sx = function (step) { return L + step / cut * PW; };
      o.push(text(ox, oy + 11, '(' + 'abcdefgh'[bi] + ')', 't10 ink b'));
      o.push('<rect x="' + (ox + 22) + '" y="' + (oy + 3) + '" width="9" height="9" rx="2" fill="' + ep.color + '"/>');
      o.push(text(ox + 35, oy + 11, ep.name, 't9 ink b'));
      var head = ep.success ? '✓ success at ' + Math.round(ep.success_step * ep.dt) + ' s'
                            : '✗ ' + ep.trajectory_score.toFixed(2) + ' · stuck in ' + ep.stuck_in;
      o.push(text(ox + colw, oy + 11, head, 't8', 'end', 'fill="' + (ep.success ? GOOD : BAD) + '" font-weight="600"'));

      // key frames
      var fy = oy + 14, gapf = (PW - 4 * FW) / 3;
      var fx = [0, 1, 2, 3].map(function (j) { return L + j * (FW + gapf); });
      ep.events.forEach(function (ev, j) {
        var id = 'tc' + bi + j;
        o.push('<clipPath id="' + id + '"><rect x="' + fx[j].toFixed(1) + '" y="' + fy + '" width="' + FW.toFixed(1) + '" height="' + FH.toFixed(1) + '" rx="3"/></clipPath>');
        o.push('<image x="' + fx[j].toFixed(1) + '" y="' + fy + '" width="' + FW.toFixed(1) + '" height="' + FH.toFixed(1) + '" href="' + ev.img +
          '" preserveAspectRatio="xMidYMid slice" clip-path="url(#' + id + ')"' + tip((j + 1) + ' · ' + ev.label + ' · ' + Math.round(ev.step * ep.dt) + ' s') + '/>');
        o.push('<rect x="' + fx[j].toFixed(1) + '" y="' + fy + '" width="' + FW.toFixed(1) + '" height="' + FH.toFixed(1) + '" rx="3" fill="none" stroke="' + AXIS + '" stroke-width="0.8"/>');
        o.push(text(fx[j] + FW - 3, fy + FH - 4, Math.round(ev.step * ep.dt) + ' s', 't8', 'end',
          'fill="' + SURF + '" font-size="7.5px" style="paint-order:stroke" stroke="rgba(0,0,0,0.6)" stroke-width="2"'));
        o.push('<circle cx="' + (fx[j] + 8).toFixed(1) + '" cy="' + (fy + 8) + '" r="6" fill="' + INK + '" fill-opacity="0.75"/>');
        o.push(text(fx[j] + 8, fy + 11, String(j + 1), 't8', 'middle', 'fill="' + SURF + '" font-weight="600"'));
      });

      // plot frame
      var t0 = fy + FH + 14;
      var sy = function (v) { return t0 + plotH - v * plotH; };
      [0, 0.5, 1].forEach(function (t) {
        o.push(hline(L, L + PW, sy(t), t === 0));
        o.push(text(L - 4, sy(t) + 3, String(t), 't8 muted', 'end'));
      });
      ep.events.forEach(function (ev, j) {
        var xe = sx(ev.step);
        o.push('<line x1="' + (fx[j] + FW / 2).toFixed(1) + '" y1="' + (fy + FH) + '" x2="' + xe.toFixed(1) + '" y2="' + t0 + '" stroke="' + MUTED + '" stroke-width="0.7" stroke-dasharray="2 2"/>');
        o.push('<line x1="' + xe.toFixed(1) + '" y1="' + t0 + '" x2="' + xe.toFixed(1) + '" y2="' + (t0 + plotH) + '" stroke="' + MUTED + '" stroke-width="0.7" stroke-dasharray="2 2"/>');
      });

      // stage ribbon + wash
      ep.intervals.forEach(function (iv) {
        var n = iv[0], a = sx(iv[1]), z = sx(iv[2]), col = SC[n];
        o.push('<rect x="' + a.toFixed(1) + '" y="' + t0 + '" width="' + (z - a).toFixed(1) + '" height="' + plotH + '" fill="' + col + '" fill-opacity="0.05"/>');
        o.push('<rect x="' + a.toFixed(1) + '" y="' + (t0 - 5) + '" width="' + Math.max(z - a - 0.8, 0.3).toFixed(1) + '" height="3.5" fill="' + col + '" rx="1"/>');
        if (z - a > 8 + n.length * 4.2) {
          o.push(text((a + z) / 2, t0 - 7.5, n.replace('_', ' '), 't8', 'middle', 'fill="' + col + '" font-size="6.5px" font-weight="600" ' +
            'style="paint-order:stroke" stroke="' + SURF + '" stroke-width="2.5"'));
        }
      });
      Object.keys(ep.milestone_steps).forEach(function (m) {
        var xm = sx(ep.milestone_steps[m]);
        o.push('<path d="M' + (xm - 4.2).toFixed(1) + ',' + (t0 - 10.5) + ' L' + (xm + 4.2).toFixed(1) + ',' + (t0 - 10.5) + ' L' + xm.toFixed(1) + ',' + (t0 - 5) +
          ' Z" fill="' + SC[m] + '" stroke="' + SURF + '" stroke-width="0.9"/>');
      });

      // curves
      var steps = ep.steps;
      var pts = function (arr, from, to) {
        var out = [];
        steps.forEach(function (s, i) { if (s >= from && s <= to) out.push(sx(s).toFixed(1) + ',' + sy(arr[i]).toFixed(1)); });
        return out.join(' ');
      };
      var all = pts(ep.score, 0, cut);
      o.push('<polygon points="' + sx(steps[0]).toFixed(1) + ',' + sy(0).toFixed(1) + ' ' + all + ' ' + sx(steps[steps.length - 1]).toFixed(1) + ',' + sy(0).toFixed(1) +
        '" fill="' + data.score_color + '" fill-opacity="0.22"/>');
      stages.forEach(function (n) {
        o.push('<polyline points="' + pts(ep.terms[n], 0, cut) + '" fill="none" stroke="' + SC[n] + '" stroke-width="1.0" stroke-opacity="0.25"/>');
      });
      ep.intervals.forEach(function (iv) {
        if (!ep.terms[iv[0]]) return;
        var p = pts(ep.terms[iv[0]], iv[1], iv[2]);
        if (p.indexOf(' ') > 0) o.push('<polyline points="' + p + '" fill="none" stroke="' + SC[iv[0]] + '" stroke-width="1.4"/>');
      });
      Object.keys(ep.milestone_runs).forEach(function (m) {
        ep.milestone_runs[m].forEach(function (run) {
          var p = pts(ep.terms[m], run[0], run[1]);
          if (p.indexOf(' ') > 0) o.push('<polyline points="' + p + '" fill="none" stroke="' + SC[m] + '" stroke-width="1.4"/>');
        });
      });
      o.push('<polyline points="' + all + '" fill="none" stroke="' + SURF + '" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>');
      o.push('<polyline points="' + all + '" fill="none" stroke="' + data.score_color + '" stroke-width="2.0" stroke-linejoin="round" stroke-linecap="round"/>');

      if (ep.success) {
        var xs = sx(ep.success_step);
        o.push('<rect x="' + xs.toFixed(1) + '" y="' + t0 + '" width="' + (sx(ep.success_step + ep.hold_steps) - xs).toFixed(1) + '" height="' + plotH + '" fill="' + GOOD + '" fill-opacity="0.15"/>');
        o.push('<line x1="' + xs.toFixed(1) + '" y1="' + t0 + '" x2="' + xs.toFixed(1) + '" y2="' + (t0 + plotH) + '" stroke="' + GOOD + '" stroke-width="1.2"/>');
      } else {
        var pk = 0;
        ep.score.forEach(function (v, i) { if (v > ep.score[pk]) pk = i; });
        var px = sx(steps[pk]), py = sy(ep.score[pk]), right = steps[pk] < 0.8 * cut;
        o.push('<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="3.2" fill="' + BAD + '" stroke="' + SURF + '" stroke-width="1.2"/>');
        o.push(text(px + (right ? 6 : -6), py - 5, ep.score[pk].toFixed(2), 't8', right ? 'start' : 'end', 'fill="' + BAD + '" font-weight="600"'));
      }

      // numbered event ticks under the axis, nudged apart when events cluster
      var bx = [], last = -1e9;
      ep.events.forEach(function (ev) { var x = Math.max(sx(ev.step), last + 12); bx.push(x); last = x; });
      bx.forEach(function (x, j) {
        o.push('<circle cx="' + x.toFixed(1) + '" cy="' + (t0 + plotH + 7).toFixed(1) + '" r="5" fill="' + INK + '" fill-opacity="0.75"/>');
        o.push(text(x, t0 + plotH + 10, String(j + 1), 't8', 'middle', 'fill="' + SURF + '" font-weight="600" font-size="7.5px"'));
      });
      if (bx[0] > L + 22) o.push(text(L, t0 + plotH + 11, '0 s', 't8 muted', 'start'));
      var endLab = Math.round(cut * ep.dt) + ' s';
      if (bx[bx.length - 1] < L + PW - 24) o.push(text(L + PW, t0 + plotH + 11, endLab, 't8 muted', 'end'));
      else o.push(text(bx[bx.length - 1] - 8, t0 + plotH + 11, endLab, 't8 muted', 'end'));

      // hover layer: a cursor line and a read-out of score and active stage
      o.push('<line class="pf-cursor" data-panel="' + bi + '" x1="0" x2="0" y1="' + t0 + '" y2="' + (t0 + plotH) + '" stroke="' + INK + '" stroke-opacity="0.55" stroke-width="0.8" visibility="hidden"/>');
      o.push('<rect class="pf-trace-hit" data-panel="' + bi + '" x="' + L + '" y="' + t0 + '" width="' + PW + '" height="' + plotH + '" fill="transparent"/>');
      state.panels.push({ ep: ep, L: L, PW: PW, cut: cut });
    });

    // legend: items wrap onto a new line when the next one would not fit
    var rows = Math.ceil(data.episodes.length / cols);
    var H = rows * blockH + (rows - 1) * 10 + 16, ly = H - 4, x0 = M + 26, x = x0;
    function place(w) { if (x + w > W - MR && x > x0) { x = x0; ly += 14; H += 14; } var at = x; x += w; return at; }
    var at = place(20 + 14 * 4.2 + 10);
    o.push('<line x1="' + at + '" y1="' + (ly - 3.5) + '" x2="' + (at + 16) + '" y2="' + (ly - 3.5) + '" stroke="' + data.score_color + '" stroke-width="2"/>' + text(at + 20, ly, 'progress score', 't8 ink2'));
    at = place(6 * 4.2 + 8);
    o.push(text(at, ly, 'terms:', 't8 ink2'));
    stages.forEach(function (n) {
      var lab = miles.indexOf(n) >= 0 ? (n === 'lift' ? 'lifted' : n.replace('_', ' ')) : n.replace('_', ' ');
      if (miles.indexOf(n) >= 0) {
        at = place(12 + lab.length * 4.2 + 8);
        o.push('<path d="M' + at.toFixed(1) + ',' + (ly - 8.5) + ' L' + (at + 9).toFixed(1) + ',' + (ly - 8.5) + ' L' + (at + 4.5).toFixed(1) + ',' + (ly - 1) + ' Z" fill="' + SC[n] + '"/>' + text(at + 12, ly, lab, 't8 ink2'));
      } else {
        at = place(11 + lab.length * 4.2 + 8);
        o.push('<rect x="' + at.toFixed(1) + '" y="' + (ly - 8) + '" width="8" height="8" rx="1.5" fill="' + SC[n] + '"/>' + text(at + 11, ly, lab, 't8 ink2'));
      }
    });
    at = place(16 + 12 * 4.3 + 12);
    o.push('<rect x="' + at.toFixed(1) + '" y="' + (ly - 9) + '" width="12" height="8" fill="' + GOOD + '" fill-opacity="0.18" stroke="' + GOOD + '" stroke-width="1"/>' + text(at + 16, ly, 'success hold', 't8 ink2'));
    at = place(12 + 20 * 4.2);
    o.push('<circle cx="' + (at + 4).toFixed(1) + '" cy="' + (ly - 3.5) + '" r="3" fill="' + BAD + '"/>' + text(at + 12, ly, 'peak of a failed run', 't8 ink2'));
    return svg(W, H, o.join(''), 'Stage-wise progress traces of four rollouts of ' + data.task);
  }

  function traceHover(box, state) {
    var tipEl = PF.tip;
    box.addEventListener('mousemove', function (e) {
      var hit = e.target.closest ? e.target.closest('.pf-trace-hit') : null;
      box.querySelectorAll('.pf-cursor').forEach(function (c) { c.setAttribute('visibility', 'hidden'); });
      if (!hit) return;
      var svgEl = box.querySelector('svg'), pt = svgEl.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var p = pt.matrixTransform(svgEl.getScreenCTM().inverse());
      var panel = state.panels[+hit.dataset.panel], ep = panel.ep;
      var step = Math.max(0, Math.min(panel.cut, (p.x - panel.L) / panel.PW * panel.cut));
      var i = 0;
      while (i < ep.steps.length - 1 && ep.steps[i + 1] <= step) i++;
      var stage = '';
      ep.intervals.forEach(function (iv) { if (step >= iv[1] && step < iv[2]) stage = iv[0].replace('_', ' '); });
      var cur = box.querySelector('.pf-cursor[data-panel="' + hit.dataset.panel + '"]');
      var cx = panel.L + ep.steps[i] / panel.cut * panel.PW;
      cur.setAttribute('x1', cx); cur.setAttribute('x2', cx); cur.setAttribute('visibility', 'visible');
      tipEl.show(e, (ep.steps[i] * ep.dt).toFixed(1) + ' s · score ' + ep.score[i].toFixed(2) + (stage ? ' · ' + stage : ''));
    });
    box.addEventListener('mouseleave', function () {
      box.querySelectorAll('.pf-cursor').forEach(function (c) { c.setAttribute('visibility', 'hidden'); });
    });
  }

  // ---------------------------------------------------------------- mounting
  var PF = {};
  PF.tip = (function () {
    var el = null;
    function ensure() {
      if (!el) { el = document.createElement('div'); el.className = 'pf-tooltip'; el.hidden = true; document.body.appendChild(el); }
      return el;
    }
    return {
      show: function (e, s) {
        var t = ensure(); t.textContent = s; t.hidden = false;
        var x = e.clientX + 14, y = e.clientY + 14, w = t.offsetWidth;
        if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
        t.style.left = x + 'px'; t.style.top = y + 'px';
      },
      hide: function () { if (el) el.hidden = true; }
    };
  })();

  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.closest('.paper-fig')) return;
    PF.tip.show(e, t.getAttribute('data-tip'));
  });
  document.addEventListener('mousemove', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (t && t.closest('.paper-fig')) PF.tip.show(e, t.getAttribute('data-tip'));
    else if (!(e.target.closest && e.target.closest('.pf-trace-hit'))) PF.tip.hide();
  });

  var DRAW = {
    traces: { src: 'traces.json', fn: drawTraces, hover: traceHover },
    gains: { src: 'gains.json', fn: drawGains },
    receiver: { src: 'receiver.json', fn: drawReceiver },
    async: { src: 'async.json', fn: drawAsync },
    validation: { src: 'validation.json', fn: drawValidation }
  };

  function mount(box) {
    var spec = DRAW[box.dataset.figure];
    if (!spec) return;
    fetch('./static/data/' + spec.src).then(function (r) { return r.json(); }).then(function (data) {
      var state = {}, lastW = 0;
      function render() {
        var px = box.clientWidth;
        if (!px || Math.abs(px - lastW) < 4) return;
        lastW = px;
        var scale = px < 520 ? 1.12 : 1.35;   // paper px -> screen px
        box.innerHTML = spec.fn(px / scale, data, state);
      }
      render();
      if (spec.hover) spec.hover(box, state);
      if (window.ResizeObserver) new ResizeObserver(render).observe(box);
      else window.addEventListener('resize', render);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.paper-fig[data-figure]').forEach(mount);
  });
})();
