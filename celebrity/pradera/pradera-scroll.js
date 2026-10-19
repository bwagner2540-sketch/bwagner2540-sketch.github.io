/* Pradera section navigation.
   Desktop: eased, one-category wheel steps.
   Mobile: one vertical touch gesture = one bounded section step; tall sections remain readable.
   No changes to package selections, floor-plan assets, totals or PDF. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var desktopPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var mobilePointer = window.matchMedia('(pointer: coarse)');
  var root = document.documentElement;
  var animation = 0, animating = false, ignoreUntil = 0;
  var lastWheel = 0, accumulated = 0, gesture = null;

  function sections() {
    return Array.from(document.querySelectorAll('#top > section.sec.paper'));
  }
  function topOf(section) {
    return section.getBoundingClientRect().top + window.scrollY;
  }
  function maxScroll() {
    return Math.max(0, root.scrollHeight - window.innerHeight);
  }
  function activeSection(items, y) {
    // The top of the viewport determines the section, even for tall sections.
    for (var i = items.length - 1; i >= 0; i--) {
      if (topOf(items[i]) <= y + 4) return i;
    }
    return 0;
  }
  function desktopSection(items) {
    var probe = window.scrollY + window.innerHeight * .37;
    var best = 0, distance = Infinity;
    items.forEach(function (section, i) {
      var top = topOf(section), bottom = top + section.offsetHeight;
      var gap = probe < top ? top - probe : probe > bottom ? probe - bottom : 0;
      if (gap < distance) { distance = gap; best = i; }
    });
    return best;
  }
  function animateTo(target, mobile) {
    var start = window.scrollY;
    var y = Math.min(maxScroll(), Math.max(0, Math.round(target)));
    var delta = y - start;
    if (Math.abs(delta) < 2) return;
    if (animation) cancelAnimationFrame(animation);

    var snap = root.style.scrollSnapType;
    var behavior = root.style.scrollBehavior;
    root.style.scrollSnapType = 'none';
    root.style.scrollBehavior = 'auto';
    animating = true;

    var started = performance.now();
    var duration = mobile ? 600 : 680;

    function finish() {
      window.scrollTo(0, y);
      root.style.scrollSnapType = snap;
      root.style.scrollBehavior = behavior;
      animating = false;
      ignoreUntil = performance.now() + (mobile ? 90 : 110);
      accumulated = 0;
      animation = 0;
    }
    function frame(time) {
      var t = Math.min(1, (time - started) / duration);
      var eased = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      window.scrollTo(0, start + delta * eased);
      if (t < 1 && !reduceMotion.matches) {
        animation = requestAnimationFrame(frame);
      } else {
        finish();
      }
    }
    animation = requestAnimationFrame(frame);
  }

  function touchMode() {
    return mobilePointer.matches && !reduceMotion.matches;
  }
  function syncMode() {
    // Disable competing native CSS snap during managed mobile gestures.
    root.classList.toggle('pr-touch-managed', touchMode());
    if (!touchMode()) gesture = null;
  }
  syncMode();
  if (mobilePointer.addEventListener) mobilePointer.addEventListener('change', syncMode);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', syncMode);

  function skipGesture(target) {
    return Boolean(document.querySelector('dialog[open]')) ||
      (target instanceof Element && Boolean(target.closest(
        'input, textarea, select, [contenteditable="true"], ' +
        '[data-native-scroll], [role="slider"]'
      )));
  }

  window.addEventListener('touchstart', function (event) {
    gesture = null;
    if (!touchMode() || event.touches.length !== 1 || skipGesture(event.target)) return;
    var items = sections();
    if (items.length < 2) return;
    var p = event.touches[0];
    gesture = {
      x:p.clientX, y:p.clientY,
      lastX:p.clientX, lastY:p.clientY,
      origin:window.scrollY,
      index:activeSection(items, window.scrollY),
      axis:'',
      locked:animating || performance.now() < ignoreUntil
    };
  }, {passive:true});

  window.addEventListener('touchmove', function (event) {
    if (!touchMode() || !gesture) return;
    if (event.touches.length !== 1) { gesture = null; return; }
    var p = event.touches[0];
    gesture.lastX = p.clientX;
    gesture.lastY = p.clientY;
    var dx = p.clientX - gesture.x;
    var dy = p.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 7) {
      gesture.axis = Math.abs(dy) >= Math.abs(dx) * 1.1 ? 'vertical' : 'horizontal';
    }
    if (gesture.axis === 'vertical' && event.cancelable) {
      // This is the mobile fix: stop native momentum BEFORE it can skip sections.
      event.preventDefault();
    }
  }, {passive:false});

  window.addEventListener('touchend', function (event) {
    if (!touchMode() || !gesture) return;
    var swipe = gesture;
    gesture = null;
    if (event.changedTouches.length) {
      swipe.lastX = event.changedTouches[0].clientX;
      swipe.lastY = event.changedTouches[0].clientY;
    }
    if (swipe.axis !== 'vertical' || swipe.locked ||
        animating || performance.now() < ignoreUntil) return;

    var delta = swipe.y - swipe.lastY;
    if (Math.abs(delta) < 32) {
      if (Math.abs(window.scrollY - swipe.origin) > 4) animateTo(swipe.origin, true);
      return;
    }

    var items = sections();
    var i = Math.min(items.length - 1, swipe.index);
    var item = items[i];
    if (!item) return;
    var top = topOf(item);
    var bottom = Math.max(top, top + item.offsetHeight - window.innerHeight);
    var origin = swipe.origin;
    var destination;

    // Land only on fixed, exact architectural section boundaries:
    // full section top, or its bottom when mobile content exceeds the viewport.
    // Avoid arbitrary 78vh partial scrolling that feels like a missed catch.
    if (delta > 0) {
      if (origin < bottom - 8) {
        destination = bottom;
      } else if (i < items.length - 1) {
        destination = topOf(items[i + 1]);
      } else {
        destination = bottom;
      }
    } else {
      if (origin > top + 8) {
        destination = top;
      } else if (i > 0) {
        destination = topOf(items[i - 1]);
      } else {
        destination = top;
      }
    }
    animateTo(destination, true);
  }, {passive:true});

  window.addEventListener('touchcancel', function () {
    gesture = null;
  }, {passive:true});

  // Existing desktop interaction: one wheel gesture advances at most one category.
  window.addEventListener('wheel', function (event) {
    if (reduceMotion.matches || !desktopPointer.matches || window.innerWidth < 1001) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY) || skipGesture(event.target)) return;
    var items = sections();
    if (items.length < 2) return;
    var index = desktopSection(items);
    if (items[index].getBoundingClientRect().height > window.innerHeight + 3) return;

    var delta = event.deltaY * (event.deltaMode === 1 ? 16 :
      event.deltaMode === 2 ? window.innerHeight : 1);
    if (Math.abs(delta) < 1) return;
    event.preventDefault();

    var time = performance.now();
    if (animating || time < ignoreUntil) {
      return;
    }
    if (time - lastWheel > 190 || accumulated * delta < 0) accumulated = 0;
    lastWheel = time;
    accumulated += delta;
    if (Math.abs(accumulated) < 28) return;
    var next = Math.max(0, Math.min(items.length - 1,
      index + (accumulated > 0 ? 1 : -1)));
    accumulated = 0;
    if (next !== index) animateTo(topOf(items[next]), false);
  }, {passive:false});

  window.addEventListener('pagehide', function () {
    if (animation) cancelAnimationFrame(animation);
    root.style.scrollSnapType = '';
    root.style.scrollBehavior = '';
    root.classList.remove('pr-touch-managed');
  });
})();
