window.HELP_IMPROVE_VIDEOJS = false;

/* ---------------------------------------------------------------
   Leaderboard, drawn like panel (a) of the benchmark figure:
   success rate (solid) over mean score (tint) on one shared axis,
   95% CI whiskers, the value printed past the whisker, and a
   tasks-solved ring. Data: static/data/leaderboard.json
   (tools/export_figure_data.py).
   --------------------------------------------------------------- */
var LB_XMAX = 0.95;              // axis runs to 0.95 so the labels fit
var LB_TICKS = [0, 0.2, 0.4, 0.6, 0.8];

function fmt2(v) { return v.toFixed(2); }
function pct(v) { return (Math.max(0, Math.min(v, LB_XMAX)) / LB_XMAX * 100).toFixed(3) + '%'; }

function lbBar(kind, value, ci, colour, tip) {
  return '<div class="lb-series lb-' + kind + '" title="' + tip + '">' +
    '<span class="lb-bar" style="width:' + pct(value) + ';background:' + colour + '"></span>' +
    '<span class="lb-ci" style="left:' + pct(ci[0]) + ';width:calc(' + pct(ci[1]) + ' - ' + pct(ci[0]) + ')"></span>' +
    '<span class="lb-val" style="left:' + pct(ci[1]) + '">' + fmt2(value) + '</span></div>';
}

function lbRing(n, total, colour, tint) {
  var R = 8, C = 2 * Math.PI * R;
  return '<svg class="lb-ring" viewBox="0 0 24 24" role="img" aria-label="' + n + ' of ' + total + ' tasks solved">' +
    '<title>' + n + ' of ' + total + ' tasks solved</title>' +
    '<circle cx="12" cy="12" r="' + R + '" stroke="' + tint + '"/>' +
    '<circle cx="12" cy="12" r="' + R + '" stroke="' + colour + '" stroke-dasharray="' +
    (C * n / total).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(-90 12 12)"/>' +
    '<text x="12" y="12">' + n + '</text></svg>';
}

function initLeaderboard() {
  var chart = document.getElementById('leaderboard-chart');
  if (!chart) return;

  fetch('./static/data/leaderboard.json').then(function (r) { return r.json(); }).then(function (data) {
    var rows = data.rows.slice();
    var tasks = rows[0].scenes;
    document.getElementById('lb-meta').textContent =
      rows.length + ' policies · ' + tasks + ' tasks · ' + rows[0].n / tasks + ' rollouts per task';
    document.getElementById('lb-ring-label').textContent = 'tasks solved / ' + tasks;

    var axis = '<div class="lb-row lb-axis" aria-hidden="true"><span></span><span></span><div class="lb-plot">' +
      LB_TICKS.map(function (t) {
        return '<span class="lb-tick" style="left:' + pct(t) + '">' + t.toFixed(1) + '</span>';
      }).join('') + '</div><span></span></div>';

    // Ranked by success rate (ties broken by mean score).
    function draw(key) {
      rows.sort(function (a, b) { return b[key] - a[key] || b.ms - a.ms; });
      var head = '<div class="lb-row lb-head" role="row">' +
        '<span role="columnheader">#</span><span class="lb-name" role="columnheader">Policy</span>' +
        '<span role="columnheader">Success rate &middot; mean score</span>' +
        '<span class="lb-solved" role="columnheader">Solved</span></div>';
      chart.innerHTML = head + rows.map(function (r, i) {
        var srTip = 'Success rate ' + fmt2(r.sr) + ' (95% CI ' + fmt2(r.sr_ci[0]) + '–' + fmt2(r.sr_ci[1]) +
          ') · ' + r.succ + ' / ' + r.n + ' rollouts';
        var msTip = 'Mean score ' + fmt2(r.ms) + ' (95% CI ' + fmt2(r.ms_ci[0]) + '–' + fmt2(r.ms_ci[1]) + ')';
        return '<div class="lb-row" role="row">' +
          '<span class="lb-rank" role="cell">' + (i + 1) + '</span>' +
          '<span class="lb-name" role="rowheader">' + r.name + '</span>' +
          '<div class="lb-plot" role="cell">' +
            lbBar('sr', r.sr, r.sr_ci, r.color, srTip) + lbBar('ms', r.ms, r.ms_ci, r.tint, msTip) +
          '</div>' +
          '<span class="lb-solved" role="cell">' + lbRing(r.solved, r.scenes, r.color, r.tint) + '</span>' +
          '</div>';
      }).join('') + axis;
    }

    draw('sr');
  });
}

/* ---------------------------------------------------------------
   Sidebar scroll-spy: highlight the nav link for whatever section
   is currently in view. Picks the last section whose top has passed
   the trigger line, and pins the final link once we hit the bottom.
   --------------------------------------------------------------- */
function initScrollSpy() {
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.side-nav ul a[href^="#"]'));
  if (!links.length) return;

  var targets = links.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  });

  var nav = document.querySelector('.side-nav');
  var hero = document.querySelector('.hero-header');

  function update() {
    // Reveal the rail only once the hero has scrolled mostly out of view.
    if (nav && hero) {
      var past = hero.getBoundingClientRect().bottom < window.innerHeight * 0.35;
      nav.classList.toggle('is-visible', past);
    }

    var trigger = window.scrollY + window.innerHeight * 0.3;
    var atBottom =
      window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
    var current = -1;

    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].offsetTop <= trigger) current = i;
    }
    if (atBottom) current = targets.length - 1;

    links.forEach(function (a, i) {
      a.classList.toggle('is-current', i === current);
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      update();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// Reconstructed-environment preview: one tab per scene, each showing a
// pre-rendered orbit video until the visitor asks for the interactive splat
// viewer (loaded on demand — each scene is ~10–17 MB).
function initEnvPreview() {
  var tabs = document.querySelectorAll('.env-tab');
  var video = document.getElementById('env-video');
  var frame = document.getElementById('env-3d');
  var caption = document.getElementById('env-caption');
  var modeBtn = document.getElementById('env-mode');
  if (!tabs.length || !video) return;

  var scene = tabs[0].dataset.scene;
  var interactive = false;

  function render() {
    var tab = document.querySelector('.env-tab[data-scene="' + scene + '"]');
    tabs.forEach(function (t) {
      var on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    caption.innerHTML = '<b>' + tab.textContent.trim() + '</b> &middot; task: &ldquo;' + tab.dataset.task +
      '&rdquo; &middot; objects: ' + tab.dataset.objects;

    var src = './static/videos/env_' + scene + '.mp4';
    if (video.getAttribute('data-src') !== src) {
      video.setAttribute('data-src', src);
      video.poster = './static/images/env_' + scene + '.jpg';
      video.querySelector('source').src = src;
      video.load();
    }

    video.hidden = interactive;
    frame.hidden = !interactive;
    if (interactive) {
      video.pause();
      var url = './static/viewer/index.html?scene=' + scene;
      if (frame.getAttribute('src') !== url) frame.setAttribute('src', url);
    } else {
      video.play().catch(function () {});
    }
    // FontAwesome swaps <i> for <svg>, so rebuild the icon rather than editing it.
    modeBtn.innerHTML = '<span class="icon"><i class="fas ' +
      (interactive ? 'fa-film' : 'fa-cube') + '"></i></span><span>' +
      (interactive ? 'Back to orbit video' : 'Explore in 3D') + '</span>';
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { scene = t.dataset.scene; render(); });
  });
  modeBtn.addEventListener('click', function () { interactive = !interactive; render(); });
  render();
}

$(document).ready(function () {
  initScrollSpy();
  initEnvPreview();

  // Carousels (used by the qualitative results section, if enabled).
  var options = {
    slidesToScroll: 1,
    slidesToShow: 3,
    loop: true,
    infinite: true,
    autoplay: false,
    autoplaySpeed: 3000,
  };
  bulmaCarousel.attach('.carousel', options);

  bulmaSlider.attach();

  initLeaderboard();
});
