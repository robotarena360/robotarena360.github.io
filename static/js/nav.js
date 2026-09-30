/* ---------------------------------------------------------------
   Phone-width menu. A [data-nav] element with a [data-nav-toggle]
   button opens its links as a drop-down panel (the section rail on
   the project page, the top bar on leaderboard/). The CSS only shows
   the button below 769px; above that the links are always visible.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  function init() {
    document.querySelectorAll('[data-nav-toggle]').forEach(function (btn) {
      var nav = btn.closest('[data-nav]');

      function set(open) {
        nav.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }

      btn.addEventListener('click', function () { set(!nav.classList.contains('is-open')); });
      nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
      document.addEventListener('click', function (e) { if (!nav.contains(e.target)) set(false); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); btn.focus(); }
      });
      window.matchMedia('(min-width: 769px)').addEventListener('change', function () { set(false); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
