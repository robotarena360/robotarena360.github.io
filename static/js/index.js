window.HELP_IMPROVE_VIDEOJS = false;

/* ---------------------------------------------------------------
   Sortable leaderboard
   Click a <th> to sort. Add class="no-sort" to columns that
   shouldn't be sortable, and data-sort="numeric" for numeric ones.
   The rank column is renumbered after every sort.
   --------------------------------------------------------------- */
function makeSortable(table) {
  var headers = table.querySelectorAll('thead th');

  headers.forEach(function (th, index) {
    if (th.classList.contains('no-sort')) return;

    th.addEventListener('click', function () {
      var descending = !th.classList.contains('sort-desc');

      headers.forEach(function (other) {
        other.classList.remove('sort-asc', 'sort-desc');
      });
      th.classList.add(descending ? 'sort-desc' : 'sort-asc');

      var tbody = table.querySelector('tbody');
      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
      var numeric = th.dataset.sort === 'numeric';

      rows.sort(function (a, b) {
        var x = a.children[index].textContent.trim();
        var y = b.children[index].textContent.trim();
        if (numeric) {
          // Treat non-numeric cells (e.g. "—") as worst.
          var nx = parseFloat(x.replace(/[^0-9.\-]/g, ''));
          var ny = parseFloat(y.replace(/[^0-9.\-]/g, ''));
          if (isNaN(nx)) nx = -Infinity;
          if (isNaN(ny)) ny = -Infinity;
          return descending ? ny - nx : nx - ny;
        }
        return descending ? y.localeCompare(x) : x.localeCompare(y);
      });

      rows.forEach(function (row) { tbody.appendChild(row); });
      renumber(table);
    });
  });
}

function renumber(table) {
  var rankCells = table.querySelectorAll('tbody td.rank');
  rankCells.forEach(function (cell, i) { cell.textContent = i + 1; });
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

$(document).ready(function () {
  initScrollSpy();

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

  document.querySelectorAll('table.leaderboard').forEach(function (table) {
    makeSortable(table);
    renumber(table);
  });
});
