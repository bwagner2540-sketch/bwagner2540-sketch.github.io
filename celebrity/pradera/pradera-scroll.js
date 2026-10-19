/* Pradera section motion: original one-section stops + controlled desktop easing.
   Mobile keeps native touch momentum and mandatory CSS snapping. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var root = document.documentElement;
  var animation = 0;
  var animating = false;
  var ignoreUntil = 0;
  var lastWheel = 0;
  var accumulated = 0;

  function sections() {
    return Array.from(document.querySelectorAll('#top > section.sec.paper'));
  }

  function findSection(items) {
    var focusY = window.scrollY + window.innerHeight * 0.37;
    var best = 0;
    var distance = Infinity;
    items.forEach(function (section, i) {
      var top = section.getBoundingClientRect().top + window.scrollY;
      var bottom = top + section.offsetHeight;
      var gap = focusY < top ? top - focusY : focusY > bottom ? focusY - bottom : 0;
      if (gap < distance) {
        distance = gap;
        best = i;
      }
    });
    return best;
  }

  function animateTo(y) {
    var start = window.scrollY;
    var delta = y - start;
    if (Math.abs(delta) < 2) return;

    var initialSnap = root.style.scrollSnapType;
    var initialBehavior = root.style.scrollBehavior;
    root.style.scrollSnapType = 'none';
    root.style.scrollBehavior = 'auto';
    animating = true;

    var began = performance.now();
    var duration = Math.min(820, Math.max(620, 630 + Math.abs(delta) * 0.13));

    function frame(now) {
      var t = Math.min(1, (now - began) / duration);
      /* Gentle arrival: visibly decelerates onto each section. */
      var eased = 1 - Math.pow(1 - t, 3);
      window.scrollTo(0, start + delta * eased);
      if (t < 1 && !reduceMotion.matches) {
        animation = requestAnimationFrame(frame);
      } else {
        window.scrollTo(0, y);
        root.style.scrollSnapType = initialSnap;
        root.style.scrollBehavior = initialBehavior;
        animating = false;
        ignoreUntil = performance.now() + 210;
        accumulated = 0;
        animation = 0;
      }
    }
    animation = requestAnimationFrame(frame);
  }

  window.addEventListener('wheel', function (event) {
    /* Touch scrolling, reduced motion, text zoom, keyboard navigation,
       dialogs, fields and oversized sections retain native behavior. */
    if (reduceMotion.matches || !desktopPointer.matches || window.innerWidth < 1001) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.target instanceof Element && event.target.closest(
      'dialog[open], input, textarea, select, [contenteditable="true"], [data-native-scroll]'
    )) return;

    var items = sections();
    if (items.length < 2) return;
    var current = findSection(items);

    /* An oversized section (especially Final Allowances) must remain
       readable and must not skip its inner content. */
    if (items[current].getBoundingClientRect().height > window.innerHeight + 3) return;

    var amount = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (Math.abs(amount) < 1) return;
    event.preventDefault();

    var now = performance.now();
    if (animating || now < ignoreUntil) {
      ignoreUntil = Math.max(ignoreUntil, now + 155);
      return;
    }

    if (now - lastWheel > 190 || accumulated * amount < 0) accumulated = 0;
    lastWheel = now;
    accumulated += amount;
    if (Math.abs(accumulated) < 40) return;

    var next = Math.max(0, Math.min(items.length - 1, current + (accumulated > 0 ? 1 : -1)));
    accumulated = 0;
    if (next === current) return;

    animateTo(items[next].getBoundingClientRect().top + window.scrollY);
  }, { passive: false });

  window.addEventListener('pagehide', function () {
    if (animation) cancelAnimationFrame(animation);
    root.style.scrollSnapType = '';
    root.style.scrollBehavior = '';
  });
})();
