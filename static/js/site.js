/* ===============================================================
   Project page behaviour. Liquid glass and the tab droplet come from
   static/js/glass.js; the scoring replay from static/js/replay.js;
   figures and the leaderboard from figures.js / leaderboard.js.
   =============================================================== */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function onVisible(el, fn, opts) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      fn();
    }, opts || { threshold: 0.3 });
    io.observe(el);
  }

  // ------------------------------------------------------------ title
  // Letters drop in one by one, grouped per word so lines only break
  // between words.
  function splitTitle(t) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { f.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.style.cssText = 'display:inline-block;white-space:nowrap';
            word.split('').forEach(function (ch) {
              var s = document.createElement('span');
              s.className = 'ch'; s.textContent = ch;
              s.style.animationDelay = (0.15 + i++ * 0.04) + 's';
              w.appendChild(s);
            });
            f.appendChild(w);
          });
          node.replaceChild(f, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(t);
    t.setAttribute('aria-label', t.textContent.replace(/\s+/g, ' ').trim());
  }

  // ------------------------------------------------------------ top bar
  function topBar() {
    var top = $('[data-top]'), hero = $('[data-hero]');
    LiquidGlass.tabs($('[data-tabs]'), { keepFirst: false });

    // Dark-on-light once the hero is behind us.
    function day() { document.body.classList.toggle('is-day', hero.getBoundingClientRect().bottom < 70); }
    window.addEventListener('scroll', function () { requestAnimationFrame(day); }, { passive: true });
    day();

    // Phone menu.
    var btn = $('[data-menu-btn]');
    function set(open) {
      top.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
    btn.addEventListener('click', function () { set(!top.classList.contains('is-open')); });
    $('[data-menu]').addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', function (e) { if (!top.contains(e.target)) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && top.classList.contains('is-open')) { set(false); btn.focus(); } });
  }

  // ------------------------------------------------------------ hero
  // The background is a reconstructed scene's orbit video under a glass
  // title slab. Optional parts, each switched on by its markup:
  //   [data-pick]   scene picker (liquid droplet)
  //   [data-enter]  "Step inside": swaps in the live Gaussian-splat viewer
  //                 (static/viewer/, loaded on demand: ~25 MB per scene)
  //   data-cycle    comma-separated scenes to crossfade through on a timer
  // data-base is the path to the site root ("../" on leaderboard/).
  function hero() {
    var h = $('[data-hero]'), slab = h && $('.slab', h);
    if (!slab) return;
    requestAnimationFrame(function () { requestAnimationFrame(function () { slab.classList.remove('is-pre'); }); });

    var base = h.dataset.base || './';
    var vids = $$('video.v', h), front = 0, scene = h.dataset.scene || 'droid2';
    var frame = $('iframe', h), live = false, visible = true;
    function load() { frame.src = base + 'static/viewer/index.html?scene=' + scene; }

    function show(next) {
      if (next === scene) return;
      scene = next;
      var back = vids[1 - front], old = vids[front];
      back.poster = base + 'static/images/env_' + scene + '.jpg';
      back.src = base + 'static/videos/env_' + scene + '.mp4';
      back.play().catch(function () {});
      back.classList.add('is-on'); old.classList.remove('is-on');
      setTimeout(function () { old.pause(); }, 1300);
      front = 1 - front;
      if (live) load();
    }

    var pick = $('[data-pick]', h), label = $('[data-picker-task]', h);
    if (pick) {
      LiquidGlass.tabs(pick, { manual: true, onSelect: function (a) {
        label.textContent = a.dataset.task;
        show(a.dataset.scene);
      } });
    }

    var enter = $('[data-enter]', h), exit = $('[data-exit]', h);
    if (enter && frame) {
      enter.addEventListener('click', function () {
        live = true; frame.hidden = false; load(); h.classList.add('is-live');
        exit.focus({ preventScroll: true });
      });
      exit.addEventListener('click', function () {
        live = false; h.classList.remove('is-live');
        enter.focus({ preventScroll: true });
        setTimeout(function () { if (!live) { frame.hidden = true; frame.removeAttribute('src'); } }, 800);
      });
    }

    if (h.dataset.cycle && !REDUCED) {
      var list = h.dataset.cycle.split(','), i = 0;
      setInterval(function () {
        if (!visible || live || document.hidden) return;
        i = (i + 1) % list.length;
        show(list[i]);
      }, 9000);
    }

    // Pause the background while it is off screen.
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      var v = vids[front];
      if (visible) v.play().catch(function () {}); else v.pause();
    }).observe(h);
  }

  // ------------------------------------------------------------ media
  // Videos marked data-visible-play only play while on screen.
  function lazyVideos() {
    var vids = $$('video[data-visible-play]');
    if (!('IntersectionObserver' in window)) { vids.forEach(function (v) { v.play().catch(function () {}); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting && !v.dataset.userPaused) v.play().catch(function () {});
        else v.pause();
      });
    }, { threshold: 0.15 });
    vids.forEach(function (v) { io.observe(v); });
  }

  function film() {
    var box = $('[data-film]');
    if (!box) return;
    var v = $('video', box), pb = $('[data-film-play]', box);
    function sync() {
      $('span', pb).textContent = v.paused ? 'Play' : 'Pause';
      $('svg', pb).innerHTML = v.paused ? '<path d="M7 5v14l12-7z"/>' : '<path d="M7 5h3v14H7zM14 5h3v14h-3z"/>';
    }
    pb.addEventListener('click', function () {
      if (v.paused) { delete v.dataset.userPaused; v.play(); } else { v.dataset.userPaused = '1'; v.pause(); }
    });
    v.addEventListener('play', sync); v.addEventListener('pause', sync);
    $('[data-film-restart]', box).addEventListener('click', function () { delete v.dataset.userPaused; v.currentTime = 0; v.play(); });
    $('[data-film-full]', box).addEventListener('click', function () {
      var el = v.requestFullscreen ? v : null;
      if (el) el.requestFullscreen(); else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });
  }

  // ------------------------------------------------------------ ring
  // 3D ring of environment orbit videos: idles slowly, drag to spin, click
  // a card to bring it to the front. The radius follows the card count so
  // the cards never overlap, and only the cards facing the viewer play
  // video (the rest hold their poster frame).
  function ring(wrap) {
    var el = $('.ring', wrap), cards = Array.prototype.slice.call(el.children);
    var N = cards.length, STEP = 360 / N, scope = wrap.parentNode;
    var cap = $('[data-ring-cap]', scope), num = $('[data-ring-num]', scope), note = $('[data-ring-note]', scope);
    var vids = cards.map(function (c) { return $('video', c); });
    var cw = function () { return cards[0].offsetWidth; };
    var radius = function () { return (cw() * 1.07) / (2 * Math.sin(Math.PI / N)); };
    var idle = REDUCED ? 0 : -0.06, a = 0, v = idle, drag = false, lx = 0, moved = 0, visible = false, target = null;

    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (!visible) vids.forEach(function (vd) { if (vd) vd.pause(); });
    }).observe(wrap);

    function frame() {
      requestAnimationFrame(frame);
      if (!visible) return;
      if (target != null) {
        var d = target - a;
        a += d * 0.12; v = 0;
        if (Math.abs(d) < 0.05) { a = target; target = null; }
      } else if (!drag) { v += (idle - v) * 0.025; a += v; }
      var r = radius();
      el.style.transform = 'translateZ(' + (-r) + 'px) rotateX(-6deg) rotateY(' + a + 'deg)';
      var best = 0, bestc = -2;
      cards.forEach(function (c, i) {
        var cz = Math.cos((i * STEP + a) * Math.PI / 180);
        var vis = Math.min(1, Math.max(0, (cz + 0.1) / 0.55));   // fade out the far side
        c.style.transform = 'rotateY(' + (i * STEP) + 'deg) translateZ(' + r + 'px)';
        c.style.opacity = vis.toFixed(3);
        c.style.visibility = vis < 0.02 ? 'hidden' : '';
        c.style.filter = 'blur(' + Math.max(0, (0.75 - cz) * 2.2).toFixed(2) + 'px) brightness(' + (0.55 + 0.45 * Math.max(0, cz)).toFixed(2) + ')';
        var vd = vids[i];   // still cards have no video
        if (vd) {
          if (cz > 0.5) { if (vd.paused) vd.play().catch(function () {}); }
          else if (!vd.paused) vd.pause();
        }
        if (cz > bestc) { bestc = cz; best = i; }
      });
      if (cap.textContent !== cards[best].dataset.task) {
        cap.textContent = cards[best].dataset.task;
        if (num) num.textContent = (best + 1) + ' / ' + N;
        if (note) note.innerHTML = cards[best].dataset.note || '';
        cap.parentNode.classList.remove('is-flip'); void cap.offsetWidth; cap.parentNode.classList.add('is-flip');
      }
    }
    wrap.addEventListener('pointerdown', function (e) {
      drag = true; moved = 0; lx = e.clientX; target = null;
      wrap.setPointerCapture(e.pointerId); wrap.classList.add('is-drag');
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - lx; lx = e.clientX; moved += Math.abs(dx);
      v = dx * 0.16; a += v;
    });
    ['pointerup', 'pointercancel'].forEach(function (t) {
      wrap.addEventListener(t, function (e) {
        drag = false; wrap.classList.remove('is-drag');
        if (t !== 'pointerup' || moved > 6) return;
        // A click: bring the card under the pointer to the front.
        var hit = document.elementsFromPoint(e.clientX, e.clientY).filter(function (n) { return n.classList && n.classList.contains('card'); })[0];
        var i = cards.indexOf(hit);
        if (i < 0) return;
        var want = -i * STEP;
        target = want + Math.round((a - want) / 360) * 360;
      });
    });
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      var k = Math.round(-(target != null ? target : a) / STEP) + (e.key === 'ArrowRight' ? -1 : 1);
      target = -k * STEP;
    });
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------ wipe
  // Real/sim compare: follows the mouse, or drag on touch. Sweeps once
  // on first view so it reads as interactive.
  function wipe(el) {
    var on = false, touched = false;
    function setP(p) {
      p = Math.min(100, Math.max(0, p));
      el.style.setProperty('--p', p + '%');
      el.setAttribute('aria-valuenow', Math.round(p));
    }
    function set(e) {
      var b = el.getBoundingClientRect();
      el.classList.remove('is-auto');   // a CSS-swept wipe hands over to the user
      setP((e.clientX - b.left) / b.width * 100);
    }
    el.addEventListener('pointerdown', function (e) { on = touched = true; el.setPointerCapture(e.pointerId); set(e); });
    el.addEventListener('pointermove', function (e) { if (on || e.pointerType === 'mouse') { touched = true; set(e); } });
    ['pointerup', 'pointercancel'].forEach(function (t) { el.addEventListener(t, function () { on = false; }); });
    el.addEventListener('keydown', function (e) {
      var p = parseFloat(getComputedStyle(el).getPropertyValue('--p')) || 50;
      if (e.key === 'ArrowLeft') p -= 5; else if (e.key === 'ArrowRight') p += 5; else return;
      e.preventDefault(); touched = true;
      setP(p);
    });
    if (REDUCED || el.classList.contains('is-auto')) return;
    onVisible(el, function () {
      var t0 = null;
      (function sweep(t) {
        if (!t0) t0 = t;
        var p = (t - t0) / 2200;
        if (touched || p > 1) return;
        setP(50 + Math.sin(p * Math.PI * 2) * 32);
        requestAnimationFrame(sweep);
      })(performance.now());
    }, { threshold: 0.55 });
  }

  // ------------------------------------------------------------ reveal
  function reveals() {
    var els = $$('[data-reveal]');
    if (REDUCED || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) {
      $$('[data-stagger]', e).forEach(function (c, i) { c.style.transitionDelay = (i * 80) + 'ms'; });
      io.observe(e);
    });
  }

  // [data-count="20"] counts up when it comes into view; data-dec for decimals.
  function counters() {
    $$('[data-count]').forEach(function (el) {
      var to = +el.dataset.count, dec = +(el.dataset.dec || 0);
      if (REDUCED) { el.textContent = to.toFixed(dec); return; }
      el.textContent = (0).toFixed(dec);
      onVisible(el, function () {
        var t0 = null;
        (function f(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / 1400, 1);
          el.textContent = (to * (1 - Math.pow(1 - p, 4))).toFixed(dec);
          if (p < 1) requestAnimationFrame(f);
        })(performance.now());
      }, { threshold: 0.6 });
    });
  }

  // The leaderboard preview (project page) and podium (leaderboard/) are
  // drawn asynchronously; start their animation once drawn and on screen.
  function leaderboard() {
    ['#lb-preview', '#lb-podium'].forEach(function (sel) {
      var el = $(sel);
      if (!el) return;
      onVisible(el, function () {
        function go() { requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('is-in'); }); }); }
        if (el.children.length) return go();
        var mo = new MutationObserver(function () { if (el.children.length) { mo.disconnect(); go(); } });
        mo.observe(el, { childList: true });
      }, { threshold: 0.2 });
    });
  }

  // ------------------------------------------------------------ pipeline
  // Real-to-sim pipeline: a step rail and one view per step. While on
  // screen it advances by itself (a progress bar on the current step);
  // the first click hands control to the reader.
  function pipeline(root) {
    var btns = $$('[data-step]', root), views = $$('[data-view]', root);
    var cur = -1, timer = 0, manual = REDUCED, visible = false;
    var dur = function (i) { return +(btns[i].dataset.dur || 6500); };
    function show(i) {
      cur = i;
      btns.forEach(function (b, j) {
        b.classList.toggle('is-on', j === i);
        b.classList.toggle('is-seen', j < i);
        b.setAttribute('aria-selected', j === i ? 'true' : 'false');
        var prog = $('.pipe-prog', b);   // restart the bar
        prog.style.animation = 'none'; void prog.offsetWidth; prog.style.animation = '';
      });
      root.style.setProperty('--dur', dur(i) + 'ms');
      views.forEach(function (v, j) {
        v.classList.toggle('is-on', j === i);
        var subs = $('[data-subs]', v);
        if (subs) { if (j === i && visible) subs._show(0); else subs._stop(); return; }
        $$('video', v).forEach(function (vd) { if (j === i && visible) vd.play().catch(function () {}); else vd.pause(); });
      });
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      root.classList.toggle('is-auto', !manual);
      if (manual || !visible) return;
      timer = setTimeout(function () { show((cur + 1) % btns.length); }, dur(cur));
    }
    // A view with sub-clips plays them in turn, each from the start; the
    // tabs over the frame jump between them.
    $$('[data-subs]', root).forEach(function (box) {
      var panes = $$('[data-pane]', box), tabs = $$('[data-sub]', box), at = 0;
      box._show = function (k) {
        at = k;
        panes.forEach(function (p, j) {
          var vd = $('video', p);
          p.classList.toggle('is-on', j === k);
          tabs[j].classList.toggle('is-on', j === k);
          tabs[j].setAttribute('aria-selected', j === k ? 'true' : 'false');
          if (j === k) { vd.currentTime = 0; vd.play().catch(function () {}); } else vd.pause();
        });
      };
      box._stop = function () { panes.forEach(function (p) { $('video', p).pause(); }); };
      panes.forEach(function (p, j) {
        $('video', p).addEventListener('ended', function () { if (j === at) box._show((at + 1) % panes.length); });
      });
      tabs.forEach(function (t, j) { t.addEventListener('click', function () { manual = true; schedule(); box._show(j); }); });
    });
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { manual = true; show(i); });
    });
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (cur < 0) show(0); else show(cur);
    }, { threshold: 0.4 }).observe(root);
  }

  // Evaluator diagram: the instruction types itself in once the diagram
  // is on screen (the cards' own entrance is CSS, on .is-in).
  function evald(root) {
    var q = $('[data-type]', root);
    if (!q || REDUCED) return;
    var text = '\u201c' + q.dataset.type + '\u201d';
    q.textContent = '';
    onVisible(root, function () {
      var i = 0;
      q.classList.add('is-typing');
      setTimeout(function tick() {
        q.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 38);
        else setTimeout(function () { q.classList.remove('is-typing'); }, 1200);
      }, 500);
    }, { threshold: 0.3 });
  }

  // Results figures draw themselves in the first time they are seen:
  // bars grow from the axis, lines trace left to right, points and key
  // frames pop in. figures.js may redraw on resize; later redraws are
  // left static.
  function drawIn(box) {
    if (REDUCED || !Element.prototype.animate) return;
    var done = false;
    function run() {
      var svg = $('svg', box);
      if (done || !svg) return;
      done = true;
      var W = svg.viewBox.baseVal.width || 1;
      function delay(node) {
        try { var b = node.getBBox(); return 120 + (b.x / W) * 700; } catch (e) { return 120; }
      }
      var ease = 'cubic-bezier(.2,.8,.2,1)';
      $$('path.pf-hot', svg).forEach(function (n) {
        n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 100%';
        n.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 900, delay: delay(n), easing: ease, fill: 'backwards' });
      });
      $$('polyline, path:not(.pf-hot)', svg).forEach(function (n) {
        var fill = n.getAttribute('fill');
        if (fill && fill !== 'none') return;
        var L = n.getTotalLength ? n.getTotalLength() : 0;
        if (!L) return;
        n.style.strokeDasharray = L;
        n.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: 1500, delay: 200, easing: ease, fill: 'backwards' })
          .onfinish = function () { n.style.strokeDasharray = ''; };
      });
      $$('circle, image', svg).forEach(function (n) {
        n.style.transformBox = 'fill-box'; n.style.transformOrigin = '50% 50%';
        n.animate([{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'none' }], { duration: 600, delay: 300 + delay(n), easing: 'cubic-bezier(.2,.9,.3,1.4)', fill: 'backwards' });
      });
      $$('rect', svg).forEach(function (n) {
        if (n.getAttribute('fill') === 'none' || n.classList.contains('pf-trace-hit')) return;
        n.style.transformBox = 'fill-box'; n.style.transformOrigin = '0 50%';
        n.animate([{ opacity: 0, transform: 'scaleX(0)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: delay(n), easing: ease, fill: 'backwards' });
      });
    }
    onVisible(box, function () {
      if ($('svg', box)) return run();
      var mo = new MutationObserver(function () { if ($('svg', box)) { mo.disconnect(); run(); } });
      mo.observe(box, { childList: true });
    }, { threshold: 0.25 });
  }

  // ------------------------------------------------------------ misc
  function lightbox() {
    var lb = $('[data-lightbox]');
    if (!lb) return;
    var img = $('img', lb);
    $$('[data-zoom]').forEach(function (f) {
      f.addEventListener('click', function () {
        var src = $('img', f);
        img.src = src.src; img.alt = src.alt;
        lb.classList.add('is-on');
      });
    });
    $$('[data-zoom-src]').forEach(function (b) {
      b.addEventListener('click', function () {
        img.src = b.dataset.zoomSrc; img.alt = b.dataset.zoomAlt || '';
        lb.classList.add('is-on');
      });
    });
    lb.addEventListener('click', function () { lb.classList.remove('is-on'); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') lb.classList.remove('is-on'); });
  }

  function copyButtons() {
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var text = $(b.dataset.copy).textContent;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(text).then(function () {
          b.textContent = 'Copied';
          setTimeout(function () { b.textContent = 'Copy'; }, 1600);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $$('[data-split]').forEach(splitTitle);
    topBar();
    hero();
    lazyVideos();
    film();
    $$('[data-ring]').forEach(ring);
    $$('[data-wipe]').forEach(wipe);
    reveals();
    counters();
    leaderboard();
    lightbox();
    copyButtons();
    $$('[data-pipeline]').forEach(pipeline);
    $$('[data-evald]').forEach(evald);
    $$('.paper-fig[data-figure]').forEach(drawIn);
  });
})();
