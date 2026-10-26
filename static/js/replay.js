/* ===============================================================
   Scoring replay: a real rollout video with the evaluator's output
   locked to it. Data: static/data/traces.json (four droid2 episodes:
   score, per-stage terms, stage intervals, key events). Videos:
   static/videos/rollouts/<policy>.mp4, which cover the whole episode
   (step 0 to `cut`), so video time maps linearly onto sim steps.

   <div data-replay></div>
   =============================================================== */
(function () {
  'use strict';

  // Stage weights of the droid2 evaluator ("put toy bear into black
  // bowl"): archetypes.place_in with W_APPROACH / W_ENGAGE / W_LIFT.
  var WEIGHTS = { approach: 0.03, engage: 0.05, lift: 0.07, transport: 0.25, place_in: 0.60 };
  var W = 1000, H = 150, PAD = 6;
  var NS = 'http://www.w3.org/2000/svg';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svgEl(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  var label = function (s) { return s.replace('_in', ' in').replace('_', ' '); };

  function build(host, data) {
    var eps = data.episodes, colors = data.stage_colors, stages = data.stages;
    host.innerHTML = '';

    // ---- header: task + policy pills
    var head = el('div', 'rp-head');
    head.appendChild(el('div', 'rp-task', '<small>Task &middot; droid2</small>' + data.task));
    var pills = el('div', 'rp-pills');
    eps.forEach(function (e, i) {
      var b = el('button', 'rp-pill', '<i style="background:' + e.color + '"></i>' + e.name +
        '<em class="' + (e.success ? 'ok' : 'bad') + '">' + (e.success ? 'success' : 'fail') + '</em>');
      b.type = 'button';
      b.addEventListener('click', function () { userPicked = true; play(i); });
      pills.appendChild(b);
    });
    head.appendChild(pills);
    host.appendChild(head);

    // ---- screen: the rollout video with a live readout over it
    var main = el('div', 'rp-main');
    var screen = el('div', 'rp-screen');
    var video = el('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto';
    video.setAttribute('playsinline', ''); video.setAttribute('aria-label', 'Rollout video');
    screen.appendChild(video);
    var hud = el('div', 'rp-hud glass is-dark');
    hud.dataset.glassScale = '22';
    hud.innerHTML = '<span class="rp-stage"></span><span class="rp-hud-score"><small>progress</small><b>0.00</b></span>';
    screen.appendChild(hud);
    var toast = el('div', 'rp-toast');
    screen.appendChild(toast);
    var clock = el('div', 'rp-clock');
    screen.appendChild(clock);
    var playBtn = el('button', 'rp-play glass is-dark is-press');
    playBtn.type = 'button'; playBtn.dataset.glassScale = '16';
    playBtn.setAttribute('aria-label', 'Pause');
    screen.appendChild(playBtn);
    main.appendChild(screen);

    // ---- side: per-stage terms with their weights, verdict
    var side = el('div', 'rp-side');
    side.appendChild(el('div', 'rp-k', 'Stage terms &middot; weight'));
    var list = el('ol', 'rp-stages');
    var rows = {};
    stages.forEach(function (s) {
      var li = el('li', '', '<span class="rp-dot"></span><span class="rp-name">' + label(s) + '</span>' +
        '<span class="rp-w">' + WEIGHTS[s].toFixed(2) + '</span>' +
        '<span class="rp-bar"><i></i></span><span class="rp-val">0.00</span>');
      li.style.setProperty('--c', colors[s]);
      list.appendChild(li);
      rows[s] = li;
    });
    side.appendChild(list);
    side.appendChild(el('p', 'rp-legend', '<span><i class="is-done"></i>reached</span><span><i class="is-part"></i>partial</span><span><i></i>pending</span>'));
    var verdict = el('div', 'rp-verdict');
    side.appendChild(verdict);
    main.appendChild(side);
    host.appendChild(main);

    // ---- chart: stage ribbon + score, click or drag to seek
    var chartWrap = el('div', 'rp-chartwrap');
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'rp-chart' });
    chartWrap.appendChild(svg);
    var axis = el('div', 'rp-axis');
    chartWrap.appendChild(axis);
    host.appendChild(chartWrap);

    var ep, n, cut, raf = 0, cur = 0, userPicked = false, visible = false, done = false, nextT = 0;
    var clipRect, headLine, marks = [];

    function x(step) { return PAD + (step / cut) * (W - PAD * 2); }
    function y(v) { return H - PAD - v * (H - PAD * 2); }
    function idx(step) {
      var lo = 0, hi = n - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (ep.steps[mid] <= step) lo = mid; else hi = mid - 1; }
      return lo;
    }
    function stageAt(step) {
      var s = ep.intervals[0][0];
      ep.intervals.forEach(function (iv) { if (step >= iv[1]) s = iv[0]; });
      return s;
    }

    function drawChart() {
      svg.innerHTML = '';
      ep.intervals.forEach(function (iv) {
        svg.appendChild(svgEl('rect', { x: x(iv[1]), y: 0, width: Math.max(0, x(iv[2]) - x(iv[1])), height: H,
          fill: colors[iv[0]] || '#888', opacity: 0.13 }));
      });
      [0.25, 0.5, 0.75].forEach(function (v) {
        svg.appendChild(svgEl('line', { x1: PAD, x2: W - PAD, y1: y(v), y2: y(v), class: 'rp-grid' }));
      });
      var d = ep.score.map(function (v, i) { return (i ? 'L' : 'M') + x(ep.steps[i]).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
      var id = 'rp-clip-' + Math.random().toString(36).slice(2);
      var clip = svgEl('clipPath', { id: id });
      clipRect = svgEl('rect', { x: 0, y: 0, width: 0, height: H });
      clip.appendChild(clipRect); svg.appendChild(clip);
      svg.appendChild(svgEl('path', { d: d, class: 'rp-ghost' }));
      svg.appendChild(svgEl('path', { d: d + 'L' + x(ep.steps[n - 1]) + ' ' + y(0) + 'L' + x(0) + ' ' + y(0) + 'Z', class: 'rp-area', 'clip-path': 'url(#' + id + ')' }));
      svg.appendChild(svgEl('path', { d: d, class: 'rp-line', 'clip-path': 'url(#' + id + ')' }));
      if (ep.success_step != null) svg.appendChild(svgEl('line', { x1: x(ep.success_step), x2: x(ep.success_step), y1: 0, y2: H, class: 'rp-succ' }));
      marks = ep.events.map(function (e) {
        var c = svgEl('circle', { cx: x(e.step), cy: y(ep.score[idx(e.step)]), r: 5, class: 'rp-mark' });
        svg.appendChild(c);
        return { el: c, step: e.step, label: e.label };
      });
      headLine = svgEl('line', { y1: 0, y2: H, class: 'rp-head-line' });
      svg.appendChild(headLine);
      var T = ep.cut * ep.dt;
      axis.innerHTML = '<span>0 s</span><span>sim time</span><span>' + T.toFixed(0) + ' s</span>';
    }

    function render() {
      var dur = video.duration || 1;
      var f = Math.min(1, Math.max(0, video.currentTime / dur));
      var step = f * cut, i = idx(step), px = x(step);
      clipRect.setAttribute('width', px);
      headLine.setAttribute('x1', px); headLine.setAttribute('x2', px);

      var st = ep.success_step != null && step >= ep.success_step ? 'success' : stageAt(step);
      var sEl = hud.querySelector('.rp-stage');
      sEl.textContent = st === 'success' ? 'success · holding' : label(st);
      sEl.style.setProperty('--c', colors[st] || '#888');
      hud.querySelector('b').textContent = ep.score[i].toFixed(2);

      stages.forEach(function (s) {
        var v = ep.terms[s][i], r = rows[s];
        r.querySelector('i').style.width = (v * 100).toFixed(1) + '%';
        r.querySelector('.rp-val').textContent = v.toFixed(2);
        r.classList.toggle('is-done', v >= 0.9);
        r.classList.toggle('is-part', v > 0.05 && v < 0.9);
        r.classList.toggle('is-now', s === st);
      });

      var last = null;
      marks.forEach(function (m) { var on = step >= m.step; m.el.classList.toggle('is-on', on); if (on) last = m; });
      if (last && toast.dataset.step !== String(last.step)) {
        toast.dataset.step = last.step;
        toast.textContent = last.label;
        toast.classList.remove('is-on'); void toast.offsetWidth; toast.classList.add('is-on');
      }
      var speed = (ep.cut * ep.dt) / dur;
      clock.innerHTML = 't = ' + (step * ep.dt).toFixed(1) + ' s' +
        '<em>' + (speed > 1.15 ? 'playing ×' + speed.toFixed(1) : 'real time') + '</em>';
    }

    function loop(t) {
      raf = requestAnimationFrame(loop);
      render();
      if (done && !userPicked && t > nextT) { done = false; play((cur + 1) % eps.length); }
    }

    function finish() {
      done = true; nextT = performance.now() + 2600;
      verdict.className = 'rp-verdict is-on ' + (ep.success ? 'is-ok' : 'is-bad');
      verdict.innerHTML = ep.success
        ? '<b>Success</b> at ' + (ep.success_step * ep.dt).toFixed(1) + ' s &middot; trajectory score ' + ep.trajectory_score.toFixed(2)
        : '<b>Failed</b> &middot; stuck in <em>' + label(ep.stuck_in) + '</em> &middot; score ' + ep.trajectory_score.toFixed(2);
      if (userPicked) setTimeout(function () { if (done && visible) { video.currentTime = 0; video.play().catch(function () {}); done = false; reset(); } }, 2600);
    }
    function reset() { verdict.className = 'rp-verdict'; toast.dataset.step = ''; toast.classList.remove('is-on'); }

    function syncBtn() {
      var p = video.paused;
      playBtn.innerHTML = p ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>'
                            : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>';
      playBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
    }

    function play(i) {
      cur = i; ep = eps[i]; n = ep.steps.length; cut = ep.cut;
      $$('.rp-pill', pills).forEach(function (b, j) { b.classList.toggle('is-on', j === i); });
      host.style.setProperty('--ep', ep.color);
      done = false; reset();
      drawChart();
      video.poster = 'static/images/rollouts/' + ep.policy + '.jpg';
      video.src = 'static/videos/rollouts/' + ep.policy + '.mp4';
      video.currentTime = 0;
      if (visible && !REDUCED) video.play().catch(function () {});
      if (!raf) raf = requestAnimationFrame(loop);
    }
    function $$(s, r) { return Array.prototype.slice.call(r.querySelectorAll(s)); }

    video.addEventListener('ended', finish);
    video.addEventListener('play', syncBtn); video.addEventListener('pause', syncBtn);
    video.addEventListener('loadedmetadata', render);
    playBtn.addEventListener('click', function () {
      if (video.paused) { if (done) { video.currentTime = 0; done = false; reset(); } video.play(); }
      else { userPicked = true; video.pause(); }
    });

    // Seek by clicking or dragging on the chart.
    var seeking = false;
    function seek(e) {
      var b = svg.getBoundingClientRect();
      var f = Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
      if (video.duration) video.currentTime = f * video.duration * 0.999;
      done = false; reset(); render();
    }
    svg.addEventListener('pointerdown', function (e) { seeking = true; userPicked = true; svg.setPointerCapture(e.pointerId); seek(e); });
    svg.addEventListener('pointermove', function (e) { if (seeking) seek(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) { svg.addEventListener(t, function () { seeking = false; }); });

    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (!ep) { if (visible) play(0); return; }
      if (visible && !done && !REDUCED) video.play().catch(function () {}); else video.pause();
    }, { threshold: 0.35 }).observe(host);
    if (window.LiquidGlass) LiquidGlass.scan(host);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var hosts = document.querySelectorAll('[data-replay]');
    if (!hosts.length) return;
    fetch('static/data/traces.json').then(function (r) { return r.json(); }).then(function (d) {
      hosts.forEach(function (h) { build(h, d); });
    });
  });
})();
