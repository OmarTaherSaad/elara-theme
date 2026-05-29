/**
 * Elara sticky-header companion.
 *
 * Previously this script auto-hid the header on scroll-down and revealed
 * it on scroll-up. That conflicted with the floating-pill navbar (which
 * should stay visible while the user is reading down a long page).
 *
 * The auto-hide behavior is now disabled. The script remains as a place
 * to attach any future scroll-aware header logic, and to defensively
 * remove the legacy `elara-header-hidden` body class if it was set by
 * an older cached version of the file.
 */
(function () {
  if (window.__elaraStickyHeaderReady) return;
  window.__elaraStickyHeaderReady = true;

  // Belt-and-braces: ensure the legacy hide-class isn't lingering from
  // a previously-cached version of this script.
  if (document.body) {
    document.body.classList.remove('elara-header-hidden');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.classList.remove('elara-header-hidden');
    });
  }
})();
