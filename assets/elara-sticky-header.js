/**
 * Elara sticky-header auto-hide behavior.
 *
 * Adds `.elara-header-hidden` to <body> when the user scrolls down past
 * a threshold, removes it when they scroll up. Dawn's existing
 * <sticky-header> element already adds `.scrolled-past-header` once
 * the user has scrolled past the header height; we layer the hide-on-
 * scroll-down behavior on top.
 *
 * Behavior tuning:
 *   - Threshold: ignore the first 200px of scroll so the header doesn't
 *     hide during minor reflows on page load.
 *   - Direction tolerance: 8px deadzone so micro-scrolls don't toggle.
 *   - Hidden when the user is interacting with the cart drawer / info
 *     drawer (those expect the header to stay put).
 */
(function () {
  if (window.__elaraStickyHeaderReady) return;
  window.__elaraStickyHeaderReady = true;

  const THRESHOLD = 200;
  const DEADZONE = 8;
  let lastY = window.scrollY;
  let rafScheduled = false;

  function onScroll() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(check);
  }

  function check() {
    rafScheduled = false;
    const y = window.scrollY;
    const delta = y - lastY;

    // Don't hide near the top
    if (y < THRESHOLD) {
      document.body.classList.remove('elara-header-hidden');
      lastY = y;
      return;
    }

    // Don't toggle if cart drawer / info drawer is open
    if (
      document.documentElement.classList.contains('elara-info-drawer-open') ||
      document.body.classList.contains('overflow-hidden')
    ) {
      lastY = y;
      return;
    }

    if (Math.abs(delta) < DEADZONE) return;

    if (delta > 0) {
      // Scrolling down — hide
      document.body.classList.add('elara-header-hidden');
    } else {
      // Scrolling up — reveal
      document.body.classList.remove('elara-header-hidden');
    }
    lastY = y;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Reveal on focus change (e.g. tabbing to skip-link)
  document.addEventListener('focusin', (e) => {
    if (e.target.closest('sticky-header, .section-header, .header-wrapper')) {
      document.body.classList.remove('elara-header-hidden');
    }
  });
})();
