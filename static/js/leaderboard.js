/* ---------------------------------------------------------------
   Leaderboard. Scores come from static/data/leaderboard.json
   (tools/export_figure_data.py, fig 8a); organization, logo and
   footnotes from static/data/policies.json, which is edited by hand
   so re-exporting the scores never drops them.

   Two views share this file:
     #lb-preview            compact ranking on the project page
     #lb-podium, #lb-table  top three and the sortable table on
                            leaderboard/
   Paths resolve against this script, so it works from any page depth.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var STATIC = new URL('..', document.currentScript.src).href;   // .../static/

  function getJSON(path) {
    return fetch(STATIC + path).then(function (r) { return r.json(); });
  }
  function pct(v) { return (v * 100).toFixed(1) + '%'; }
  function f2(v) { return v.toFixed(2); }
  function width(v) { return (Math.max(0, Math.min(v, 1)) * 100).toFixed(2) + '%'; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

  var METRICS = {
    sr: { label: 'Success rate', fmt: pct },
    ms: { label: 'Mean score', fmt: f2 },
    solved: { label: 'Tasks solved', fmt: String }
  };

  function load() {
    return Promise.all([getJSON('data/leaderboard.json'), getJSON('data/policies.json')]).then(function (res) {
      var meta = res[1];
      var rows = res[0].rows.map(function (r) { return Object.assign({}, meta[r.id], r); });
      var notes = [];
      rows.forEach(function (r) {
        if (r.note) { notes.push(r.note); r.mark = '&dagger;'.repeat(notes.length); }
      });
      rows.sort(order('sr'));
      rows.forEach(function (r, i) { r.rank = i + 1; });
      return { rows: rows, notes: notes };
    });
  }

  // Descending by key; ties go to mean score, then success rate.
  function order(key) {
    return function (a, b) { return b[key] - a[key] || b.ms - a.ms || b.sr - a.sr; };
  }

  // ------------------------------------------------------------ pieces
  function logo(r) {
    if (!r.logo) return '<span class="lb-logo is-blank" aria-hidden="true">' + esc(r.name.charAt(0)) + '</span>';
    return '<img class="lb-logo" src="' + STATIC + 'images/logos/' + r.logo + '" alt="' + esc(r.org) +
      '" title="' + esc(r.org) + '" width="36" height="36" loading="lazy">';
  }

  function policy(r) {
    return '<span class="lb-policy">' + logo(r) +
      '<span class="lb-who"><span class="lb-name">' + r.name +
      (r.mark ? '<sup class="lb-mark" title="' + esc(r.note) + '">' + r.mark + '</sup>' : '') +
      '</span><span class="lb-org">' + esc(r.org || '') + '</span></span></span>';
  }

  function rankBadge(n) {
    return '<span class="lb-rank' + (n <= 3 ? ' is-top is-' + n : '') + '">' + n + '</span>';
  }

  // Value, then a 0-1 track with the bar and its 95% CI whisker.
  function meter(r, key) {
    var m = METRICS[key], ci = r[key + '_ci'];
    var tip = m.label + ' ' + m.fmt(r[key]) + ' (95% CI ' + m.fmt(ci[0]) + '–' + m.fmt(ci[1]) + ')';
    return '<span class="lb-meter" title="' + tip + '">' +
      '<span class="lb-num">' + m.fmt(r[key]) + '</span>' +
      '<span class="lb-track"><span class="lb-fill" style="width:' + width(r[key]) + ';background:' + r.color + '"></span>' +
      '<span class="lb-ci" style="left:' + width(ci[0]) + ';width:calc(' + width(ci[1]) + ' - ' + width(ci[0]) + ')"></span>' +
      '</span></span>';
  }

  function ring(n, total, colour, tint) {
    var R = 8, C = 2 * Math.PI * R;
    return '<svg class="lb-ring" viewBox="0 0 24 24" role="img" aria-label="' + n + ' of ' + total + ' tasks solved">' +
      '<title>' + n + ' of ' + total + ' tasks solved</title>' +
      '<circle cx="12" cy="12" r="' + R + '" stroke="' + tint + '"/>' +
      '<circle cx="12" cy="12" r="' + R + '" stroke="' + colour + '" stroke-dasharray="' +
      (C * n / total).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(-90 12 12)"/>' +
      '<text x="12" y="12">' + n + '</text></svg>';
  }

  // ------------------------------------------------------------ project page
  function drawPreview(el, data) {
    el.innerHTML = data.rows.map(function (r) {
      return '<div class="lb-mini-row">' + rankBadge(r.rank) + policy(r) + meter(r, 'sr') + '</div>';
    }).join('');
  }

  // ------------------------------------------------------------ leaderboard page
  function drawStats(el, rows) {
    var tasks = rows[0].scenes, per = rows[0].n / tasks;
    var total = rows.reduce(function (s, r) { return s + r.n; }, 0);
    el.innerHTML = [[rows.length, 'policies'], [tasks, 'tasks'], [per, 'rollouts per task'],
                    [total.toLocaleString('en-US'), 'rollouts in total']].map(function (s) {
      return '<span class="lb-stat"><b>' + s[0] + '</b>' + s[1] + '</span>';
    }).join('');
  }

  function drawPodium(el, rows) {
    el.innerHTML = rows.slice(0, 3).map(function (r) {
      return '<article class="lb-podium-card is-' + r.rank + '" style="--c:' + r.color + ';--t:' + r.tint + '">' +
        '<div class="lb-podium-top">' + rankBadge(r.rank) + logo(r) + '</div>' +
        '<h3 class="lb-podium-name">' + r.name + (r.mark ? '<sup class="lb-mark">' + r.mark + '</sup>' : '') + '</h3>' +
        '<p class="lb-podium-org">' + esc(r.org || '') + '</p>' +
        '<p class="lb-podium-big">' + pct(r.sr) + '<span>success rate</span></p>' +
        '<dl class="lb-podium-facts">' +
          '<div><dt>Mean score</dt><dd>' + f2(r.ms) + '</dd></div>' +
          '<div><dt>Tasks solved</dt><dd>' + r.solved + ' / ' + r.scenes + '</dd></div>' +
          '<div><dt>Successes</dt><dd>' + r.succ + ' / ' + r.n + '</dd></div>' +
        '</dl></article>';
    }).join('');
  }

  function drawTable(el, rows, notesEl, notes) {
    var key = 'sr';
    var cols = [['sr', 'Success rate'], ['ms', 'Mean score'], ['solved', 'Solved']];

    function header() {
      return '<div class="lb-row lb-head" role="row">' +
        '<span role="columnheader" class="lb-c-rank">#</span>' +
        '<span role="columnheader" class="lb-c-policy">Policy</span>' +
        cols.map(function (c) {
          var on = c[0] === key;
          return '<span role="columnheader" class="lb-c-' + c[0] + '" aria-sort="' + (on ? 'descending' : 'none') + '">' +
            '<button type="button" class="lb-sort' + (on ? ' is-on' : '') + '" data-key="' + c[0] + '">' + c[1] +
            '<span class="lb-arrow" aria-hidden="true">&#9662;</span></button></span>';
        }).join('') +
        '<span role="columnheader" class="lb-c-succ">Successes</span></div>';
    }

    function draw() {
      var sorted = rows.slice().sort(order(key));
      el.innerHTML = header() + sorted.map(function (r, i) {
        return '<div class="lb-row" role="row">' +
          '<span role="cell" class="lb-c-rank">' + rankBadge(i + 1) + '</span>' +
          '<span role="rowheader" class="lb-c-policy">' + policy(r) + '</span>' +
          '<span role="cell" class="lb-c-sr">' + meter(r, 'sr') + '</span>' +
          '<span role="cell" class="lb-c-ms">' + meter(r, 'ms') + '</span>' +
          '<span role="cell" class="lb-c-solved">' + ring(r.solved, r.scenes, r.color, r.tint) + '</span>' +
          '<span role="cell" class="lb-c-succ">' + r.succ + '<span class="lb-of"> / ' + r.n + '</span></span>' +
          '</div>';
      }).join('');
    }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('.lb-sort');
      if (!b || b.dataset.key === key) return;
      key = b.dataset.key;
      draw();
      el.querySelector('.lb-sort[data-key="' + key + '"]').focus();
    });
    draw();

    if (notesEl) {
      notesEl.innerHTML = notes.map(function (n, i) {
        return '<span><sup>' + '&dagger;'.repeat(i + 1) + '</sup> ' + esc(n) + '</span>';
      }).join('');
    }
  }

  function init() {
    var preview = document.getElementById('lb-preview');
    var table = document.getElementById('lb-table');
    if (!preview && !table) return;

    load().then(function (data) {
      if (preview) drawPreview(preview, data);
      if (table) {
        drawStats(document.getElementById('lb-stats'), data.rows);
        drawPodium(document.getElementById('lb-podium'), data.rows);
        drawTable(table, data.rows, document.getElementById('lb-notes'), data.notes);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
