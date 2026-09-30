window.HELP_IMPROVE_VIDEOJS = false;

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

// Reconstructed-environment preview: a gallery of real DROID frames, one per
// scene; the selected scene shows a
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
    caption.innerHTML = '<span class="env-caption-label">Task</span>' +
      '<span class="env-caption-text">' + tab.dataset.task + '</span>';

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
});
