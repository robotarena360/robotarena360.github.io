/* ---------------------------------------------------------------
   Liquid glass for the web.

   .glass elements get, on Chromium, a real refraction: a per-element
   displacement map (bent at the rounded bezel like a convex lens) fed
   to backdrop-filter through an SVG filter. Safari / Firefox keep the
   frosted CSS fallback from glass.css. Every .glass also gets a
   specular highlight that follows the pointer (--mx / --my).

   Attributes (all optional):
     data-glass-scale   refraction strength in px   (default 46)
     data-glass-bezel   width of the bent rim in px (default ~ min(h/2, 28))
     data-glass-blur    extra blur in px            (default 1.5)

   LiquidGlass.tabs(el) turns a nav into an iOS-style tab bar whose
   glass "droplet" springs between items and stretches as it moves.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var REFRACT = !!window.chrome && !/Firefox/.test(navigator.userAgent);
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var defs, uid = 0;

  if (REFRACT) document.documentElement.classList.add('lg-refract');

  function ensureDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }

  // Signed distance to a rounded rect (negative inside).
  function sdf(x, y, w, h, r) {
    var qx = Math.abs(x - w / 2) - (w / 2 - r);
    var qy = Math.abs(y - h / 2) - (h / 2 - r);
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
  }

  // Displacement map: R/G = 128 is "no shift"; inside the bezel the
  // backdrop is sampled from further in, so edges magnify and bend
  // like the rim of a lens.
  function buildMap(w, h, r, bezel) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4, px = x + 0.5, py = y + 0.5;
        var s = sdf(px, py, w, h, r), dx = 0, dy = 0;
        if (s < 0 && -s < bezel) {
          var gx = sdf(px + 1, py, w, h, r) - sdf(px - 1, py, w, h, r);
          var gy = sdf(px, py + 1, w, h, r) - sdf(px, py - 1, w, h, r);
          var len = Math.hypot(gx, gy) || 1;
          var t = 1 + s / bezel;                    // 1 at the rim, 0 at the bezel's inner edge
          var m = Math.pow(t, 2.2);                 // squircle-ish falloff
          dx = -gx / len * m; dy = -gy / len * m;
        }
        d[i] = 128 + dx * 127; d[i + 1] = 128 + dy * 127; d[i + 2] = 128; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL();
  }

  function radiusOf(el, w, h) {
    var r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    return Math.min(r, w / 2, h / 2);
  }

  function refract(el) {
    var w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
    if (!w || !h) return;
    var key = w + 'x' + h;
    if (el._lgKey === key) return;
    el._lgKey = key;

    var r = radiusOf(el, w, h);
    var bezel = +el.dataset.glassBezel || Math.min(h / 2, w / 2, 28);
    var scale = el.dataset.glassScale != null ? +el.dataset.glassScale : 46;
    var blur = el.dataset.glassBlur != null ? +el.dataset.glassBlur : 1.5;

    var id = el._lgId || (el._lgId = 'lg-' + (++uid));
    var old = document.getElementById(id);
    if (old) old.remove();

    var f = document.createElementNS(NS, 'filter');
    f.id = id;
    f.setAttribute('x', 0); f.setAttribute('y', 0);
    f.setAttribute('width', w); f.setAttribute('height', h);
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    var im = document.createElementNS(NS, 'feImage');
    im.setAttribute('href', buildMap(w, h, r, bezel));
    im.setAttribute('x', 0); im.setAttribute('y', 0);
    im.setAttribute('width', w); im.setAttribute('height', h);
    im.setAttribute('preserveAspectRatio', 'none');
    im.setAttribute('result', 'map');
    var dm = document.createElementNS(NS, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'map');
    dm.setAttribute('scale', scale);
    dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G');
    f.appendChild(im); f.appendChild(dm);
    ensureDefs().appendChild(f);

    var tail = getComputedStyle(el).getPropertyValue('--glass-filter').trim() || 'saturate(1.8)';
    var bf = 'blur(' + blur + 'px) url(#' + id + ') ' + tail;
    el.style.backdropFilter = bf;
  }

  // Pointer-tracked specular highlight.
  function specular(el) {
    el.addEventListener('pointermove', function (e) {
      var b = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
      el.style.setProperty('--my', (e.clientY - b.top) + 'px');
      el.style.setProperty('--glow', '1');
    });
    el.addEventListener('pointerleave', function () { el.style.setProperty('--glow', '0'); });
  }

  var ro = REFRACT && 'ResizeObserver' in window ? new ResizeObserver(function (es) {
    es.forEach(function (e) { refract(e.target); });
  }) : null;

  function attach(el) {
    if (el._lg) return;
    el._lg = true;
    specular(el);
    var flat = el.hasAttribute('data-glass-flat') || el.dataset.glassScale === '0';
    if (REFRACT && !flat) { refract(el); if (ro) ro.observe(el); }
  }

  function scan(root) {
    (root || document).querySelectorAll('.glass').forEach(attach);
  }

  /* --------------------------------------------------- liquid tabs */
  function tabs(nav, opts) {
    opts = opts || {};
    var items = Array.prototype.slice.call(nav.querySelectorAll(opts.items || 'a'));
    var drop = document.createElement('span');
    drop.className = 'lg-drop';
    drop.setAttribute('aria-hidden', 'true');
    nav.insertBefore(drop, nav.firstChild);

    var x = 0, w = 0, vx = 0, vw = 0, tx = 0, tw = 0, raf = 0, shown = false;

    function measure(a) {
      var nb = nav.getBoundingClientRect(), ab = a.getBoundingClientRect();
      tx = ab.left - nb.left; tw = ab.width;
    }
    function paint() {
      var stretch = Math.min(Math.abs(vx) * 0.012, 0.22);
      drop.style.width = w + 'px';
      drop.style.transform = 'translateX(' + x + 'px) scaleY(' + (1 - stretch * 0.5) + ') scaleX(' + (1 + stretch) + ')';
    }
    function step() {
      vx += (tx - x) * 0.16; vx *= 0.68;
      vw += (tw - w) * 0.16; vw *= 0.68;
      x += vx; w += vw;
      paint();
      if (Math.abs(tx - x) + Math.abs(tw - w) + Math.abs(vx) + Math.abs(vw) > 0.2) raf = requestAnimationFrame(step);
      else { x = tx; w = tw; vx = vw = 0; paint(); raf = 0; }
    }
    function go(a) {
      if (!a) {
        drop.style.opacity = '0'; shown = false;
        items.forEach(function (i) { i.classList.remove('is-current'); });
        return;
      }
      measure(a);
      items.forEach(function (i) { i.classList.toggle('is-current', i === a); });
      if (!shown || REDUCED) { x = tx; w = tw; paint(); drop.style.opacity = '1'; shown = true; return; }
      if (!raf) raf = requestAnimationFrame(step);
    }

    // Manual mode (scene pickers): clicking an item selects it.
    if (opts.manual) {
      var sel = items[0];
      items.forEach(function (a) {
        a.addEventListener('pointerenter', function () { go(a); });
        a.addEventListener('click', function (e) {
          e.preventDefault();
          sel = a; go(a);
          if (opts.onSelect) opts.onSelect(a, items.indexOf(a));
        });
      });
      nav.addEventListener('pointerleave', function () { go(sel); });
      window.addEventListener('resize', function () { measure(sel); x = tx; w = tw; paint(); });
      requestAnimationFrame(function () { go(sel); });
      return { go: go, select: function (i) { sel = items[i]; go(sel); } };
    }

    // Scroll-spy drives the droplet; hovering previews where it would go.
    var targets = items.map(function (a) {
      var h = a.getAttribute('href');
      return h && h.charAt(0) === '#' ? document.getElementById(h.slice(1)) : null;
    });
    var current = null;
    function spy() {
      var line = window.innerHeight * 0.35, best = null;
      targets.forEach(function (t, i) { if (t && t.getBoundingClientRect().top <= line) best = items[i]; });
      if (best !== current) { current = best; go(best || (opts.keepFirst ? items[0] : null)); }
    }
    items.forEach(function (a) {
      a.addEventListener('pointerenter', function () { go(a); });
    });
    nav.addEventListener('pointerleave', function () { go(current || (opts.keepFirst ? items[0] : null)); });
    window.addEventListener('scroll', function () { requestAnimationFrame(spy); }, { passive: true });
    window.addEventListener('resize', function () { if (current) { measure(current); x = tx; w = tw; paint(); } });
    spy();
    if (!current && opts.keepFirst) go(items[0]);
    return { go: go };
  }

  window.LiquidGlass = { scan: scan, attach: attach, tabs: tabs, refracts: REFRACT, refresh: function (el) { el._lgKey = null; refract(el); } };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { scan(); });
  else scan();
})();
