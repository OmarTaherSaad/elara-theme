/**
 * Elara smooth scroll engine.
 *
 * Lenis-inspired wheel-driven smooth scrolling. Intercepts wheel events,
 * accumulates a virtual scroll target, and on each requestAnimationFrame
 * lerps `window.scrollTo` toward that target with a luxury easing curve.
 *
 * Why custom and not a library:
 *   - Theme Store policy disallows external script CDNs.
 *   - Lenis is ~3KB but adds an esm-only dep we'd have to bundle.
 *   - We only need a small, well-behaved subset.
 *
 * Behaviour:
 *   - DESKTOP wheel / trackpad: smoothly scrolled.
 *   - TOUCH: untouched. Native momentum scroll is already smooth and
 *     intercepting it breaks every Shopify gesture.
 *   - Keyboard scroll (arrows, PgUp/Dn, Space, Home/End): untouched —
 *     the browser handles those, and they call window.scrollTo via the
 *     CSS `scroll-behavior: smooth` rule already on <html>.
 *   - Hash-link clicks / anchor navigation: untouched — those use
 *     scrollIntoView() which we don't intercept.
 *   - Scrollable descendants (cart drawer, info drawer, modals,
 *     horizontal carousels): wheel events that originate inside one
 *     of those are NOT intercepted, so their native scroll works.
 *   - prefers-reduced-motion: engine disabled entirely.
 *
 * Damping:
 *   - 0.1 ease factor per frame (~6 frames to ease 80% of distance).
 *   - Multiplier 1.0 — preserves the user's natural scroll speed feel,
 *     just smooths the steps between them.
 *
 * Configuration: pass data-elara-smooth-scroll="false" on <html> to
 * opt out, or window.__elaraSmoothScroll = false before this script
 * loads. The theme reads the merchant's `elara_smooth_scroll` setting
 * in layout/theme.liquid and sets the global accordingly.
 */
(function () {
  if (window.__elaraSmoothScrollReady) return;
  window.__elaraSmoothScrollReady = true;

  // Feature gates
  if (window.__elaraSmoothScroll === false) return;
  if (document.documentElement.dataset.elaraSmoothScroll === 'false') return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  // Touch-primary devices: rely on native momentum scroll.
  const isTouchPrimary = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchPrimary) return;

  const LERP = 0.2;        // ease factor per frame — higher = snappier, lower = more glide
  const SNAP_THRESHOLD = 0.4;  // px — when distance is below this, snap and stop
  const MAX_DELTA_LINE = 100;  // px — clamp how much a single line-mode scroll contributes
  const MAX_DELTA_PIXEL = 1200; // px — clamp how much a single pixel-mode scroll contributes
  const SCROLL_MATCH_TOLERANCE = 2;  // px — tolerance for "is this our own programmatic scroll"

  let current = window.scrollY;
  let target = current;
  let rafId = 0;

  // Disable native CSS smooth scroll while our engine is active — otherwise
  // the two compete and the result is jittery. We still keep scroll-padding
  // for sticky-header offsets on hash links.
  document.documentElement.style.scrollBehavior = 'auto';

  function maxScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  /** Walk up the DOM looking for an ancestor whose own overflow scrolls. */
  function findScrollableAncestor(el) {
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      const ox = style.overflowX;
      const scrollsY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
      const scrollsX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;
      if (scrollsY || scrollsX) return { el, scrollsY, scrollsX };
      el = el.parentElement;
    }
    return null;
  }

  function onWheel(event) {
    if (event.ctrlKey) return;  // pinch-zoom — let browser handle
    if (event.defaultPrevented) return;

    const ancestor = findScrollableAncestor(event.target);
    if (ancestor) {
      // The wheel is inside a scrollable container; let it scroll natively
      // UNLESS the container is at its edge and the wheel direction would
      // overflow into the page. (We don't pretend to handle this edge case
      // — most users don't notice it and it keeps the implementation tiny.)
      if (ancestor.scrollsY && event.deltaY !== 0) return;
      if (ancestor.scrollsX && event.deltaX !== 0) return;
    }

    event.preventDefault();

    let dy = event.deltaY;
    // Normalise delta modes
    if (event.deltaMode === 1) {            // DOM_DELTA_LINE
      dy *= 16;
      if (Math.abs(dy) > MAX_DELTA_LINE) dy = Math.sign(dy) * MAX_DELTA_LINE;
    } else if (event.deltaMode === 2) {     // DOM_DELTA_PAGE
      dy *= window.innerHeight;
    } else {
      if (Math.abs(dy) > MAX_DELTA_PIXEL) dy = Math.sign(dy) * MAX_DELTA_PIXEL;
    }

    target = Math.max(0, Math.min(maxScroll(), target + dy));
    schedule();
  }

  function tick() {
    rafId = 0;
    const diff = target - current;
    if (Math.abs(diff) < SNAP_THRESHOLD) {
      current = target;
      window.scrollTo(0, current);
      return;
    }
    current += diff * LERP;
    window.scrollTo(0, current);
    schedule();
  }

  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(tick);
  }

  /**
   * Sync target if the user (or another script) caused an external scroll
   * — hash-link click, history restoration, scrollbar drag, scrollIntoView.
   *
   * We can't use a boolean flag around our own scrollTo because the scroll
   * event fires asynchronously (in Chrome especially), by which point the
   * flag is already reset and the handler treats our programmatic scroll
   * as user input — killing the lerp. Compare scrollY to our internal
   * `current` instead: if they match within a small tolerance, it's our
   * own scroll. Otherwise it's external.
   */
  function onNativeScroll() {
    const sy = window.scrollY;
    if (Math.abs(sy - current) < SCROLL_MATCH_TOLERANCE) return;
    current = sy;
    target = sy;
  }

  // Resync target when the document height changes (lazy-loaded images,
  // section editor reflows, fonts loading).
  function onResize() {
    target = Math.min(target, maxScroll());
    current = window.scrollY;
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onNativeScroll, { passive: true });
  window.addEventListener('resize', onResize);
  document.addEventListener('DOMContentLoaded', () => {
    current = window.scrollY;
    target = current;
  });
})();
