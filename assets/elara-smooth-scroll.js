/**
 * Elara section-snap scroll engine.
 *
 * One wheel notch / swipe = one full-height section. Like Apple's
 * product pages or modern editorial fashion sites. Intercepts wheel
 * events, identifies the current major section, and smoothly scrolls
 * to the next or previous one via scrollIntoView.
 *
 * Behaviour:
 *   - DESKTOP wheel / trackpad: snap to next/prev major section.
 *   - TOUCH: untouched (mobile UX expects natural swipe).
 *   - KEYBOARD: untouched (arrows / PgUp/Dn / Space scroll natively).
 *   - prefers-reduced-motion: disabled — native scroll only.
 *   - Inside scrollable descendants (cart drawer, info drawer, modals,
 *     horizontal carousels): wheel passes through, native scroll works.
 *   - Tall sections (> viewport height): when scrolled to a position
 *     where there's more of the current section below the viewport,
 *     allow native scroll within the section before snapping past.
 *   - At the start / end of the page: wheel passes through so the
 *     user can scroll past whatever appears above the first section
 *     or below the last (e.g. announcement bar, footer).
 *
 * Major-section detection:
 *   Top-level `.shopify-section` wrappers whose height is at least
 *   60% of the viewport height are treated as snap points. Recomputed
 *   on resize and after layout-affecting events (image load, section
 *   editor reload).
 *
 * Cooldown: 700ms between snaps. While snapping, further wheel events
 * are absorbed (no chaining). Trackpad burst gestures still produce
 * one snap per intent, not one per wheel-event.
 *
 * Configuration:
 *   - window.__elaraSmoothScroll = false           // global opt-out
 *   - data-elara-smooth-scroll="false" on <html>   // attribute opt-out
 *   - merchant setting `elara_smooth_scroll`       // theme settings
 */
(function () {
  if (window.__elaraSmoothScrollReady) return;
  window.__elaraSmoothScrollReady = true;

  // Feature gates
  if (window.__elaraSmoothScroll === false) return;
  if (document.documentElement.dataset.elaraSmoothScroll === 'false') return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;
  // Touch-primary devices: keep native swipe.
  const isTouchPrimary = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  if (isTouchPrimary) return;

  const COOLDOWN = 700;             // ms between section snaps
  const MIN_HEIGHT_RATIO = 0.6;     // section counts as "major" if >= 60vh
  const HEAD_GUARD = 0.3;           // when current scrollY is within 30vh of a snap point's top, that's the current section
  const MIN_DELTA = 4;              // ignore micro wheel events (touchpad jitter)
  const NEAR_BOTTOM_PX = 24;        // how close to a section's bottom we need to be before snapping forward

  let snapSections = [];
  let lastAction = 0;
  let isAnimating = false;
  let animationTimer = 0;

  /** Find scrollable ancestors so wheel events inside drawers / modals pass through. */
  function findScrollableAncestor(el) {
    while (el && el.nodeType === 1 && el !== document.body && el !== document.documentElement) {
      const style = window.getComputedStyle(el);
      const oy = style.overflowY;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function collectSections() {
    const vh = window.innerHeight;
    const minH = vh * MIN_HEIGHT_RATIO;
    snapSections = Array.from(document.querySelectorAll('main .shopify-section, #MainContent .shopify-section, .shopify-section'))
      .filter((el) => el.offsetParent !== null)            // visible
      .filter((el) => !el.classList.contains('shopify-section-group-header-group'))
      .filter((el) => !el.classList.contains('shopify-section-group-footer-group'))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const top = window.scrollY + rect.top;
        return { el, top, height: el.offsetHeight };
      })
      .filter((s) => s.height >= minH);
  }

  function currentSectionIndex() {
    const sy = window.scrollY + window.innerHeight * HEAD_GUARD;
    let idx = 0;
    for (let i = 0; i < snapSections.length; i++) {
      if (snapSections[i].top <= sy) idx = i;
    }
    return idx;
  }

  function snapTo(idx) {
    if (idx < 0 || idx >= snapSections.length) return false;
    isAnimating = true;
    if (idx === 0) {
      // Always scroll to absolute top for the first section. Avoids
      // scroll-padding-top offsets and ensures Dawn's StickyHeader
      // re-evaluates scrollTop <= headerBounds.top (which clears the
      // `scrolled-past-header` state and restores the hero overlay).
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      snapSections[idx].el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    clearTimeout(animationTimer);
    animationTimer = window.setTimeout(() => {
      isAnimating = false;
    }, 900);
    return true;
  }

  function onWheel(e) {
    if (e.ctrlKey) return;                  // pinch-zoom
    if (e.defaultPrevented) return;
    if (Math.abs(e.deltaY) < MIN_DELTA) return;

    // Wheel inside a scrollable descendant: pass through
    if (findScrollableAncestor(e.target)) return;

    if (!snapSections.length) return;

    // Within snap cooldown — absorb the event so multi-wheel bursts don't queue snaps
    if (isAnimating) { e.preventDefault(); return; }
    const now = performance.now();
    if (now - lastAction < COOLDOWN) { e.preventDefault(); return; }

    const goingDown = e.deltaY > 0;
    const idx = currentSectionIndex();
    const current = snapSections[idx];
    const sy = window.scrollY;
    const vh = window.innerHeight;

    if (goingDown) {
      // If current section is taller than viewport and we haven't reached its bottom yet,
      // let the user scroll through it naturally before snapping past.
      const sectionBottom = current.top + current.height;
      const viewportBottom = sy + vh;
      if (sectionBottom - viewportBottom > NEAR_BOTTOM_PX) {
        return;  // native scroll within tall section
      }
      // Otherwise snap forward to the next section
      const nextIdx = idx + 1;
      if (nextIdx >= snapSections.length) return;  // at end, native scroll past footer etc.
      if (snapTo(nextIdx)) {
        e.preventDefault();
        lastAction = now;
      }
    } else {
      // Going up
      // If the user is below the current section's top by more than viewport height,
      // they're inside a tall section — let them scroll up within it.
      const distanceFromTop = sy - current.top;
      if (distanceFromTop > vh - NEAR_BOTTOM_PX) {
        return;
      }
      const prevIdx = idx - 1;
      if (prevIdx < 0) {
        // At first section. If still scrolled below top, snap to this section's start.
        if (sy > current.top + 4) {
          if (snapTo(0)) {
            e.preventDefault();
            lastAction = now;
          }
        }
        return;
      }
      if (snapTo(prevIdx)) {
        e.preventDefault();
        lastAction = now;
      }
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('resize', collectSections);

  // Re-measure on layout-affecting events
  window.addEventListener('load', collectSections);
  document.addEventListener('shopify:section:load', collectSections);
  document.addEventListener('shopify:section:reorder', collectSections);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', collectSections);
  } else {
    collectSections();
  }
})();
