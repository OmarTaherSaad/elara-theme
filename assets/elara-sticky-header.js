/**
 * Elara sticky-header class mirror.
 *
 * Dawn's StickyHeader custom element adds these classes to the section
 * wrapper `.section-header` (not to <body>):
 *   - .shopify-section-header-sticky   (when sticky)
 *   - .scrolled-past-header            (once user has scrolled past the header)
 *   - .shopify-section-header-hidden   (on-scroll-up mode, mid-hide)
 *
 * The Elara theme's CSS targets `body.scrolled-past-header …` so the
 * floating pill, transparent-on-hero inversion, and cursor-color
 * swapping rules all activate from a single root signal. This script
 * watches the `.section-header` element with a MutationObserver and
 * mirrors its sticky-related classes onto <body>.
 *
 * Also defensively clears the legacy `elara-header-hidden` body class
 * from earlier versions of this file.
 */
(function () {
  if (window.__elaraStickyHeaderReady) return;
  window.__elaraStickyHeaderReady = true;

  const MIRROR_CLASSES = [
    'shopify-section-header-sticky',
    'scrolled-past-header',
    'shopify-section-header-hidden',
  ];

  function syncBody(sectionHeader) {
    for (const cls of MIRROR_CLASSES) {
      const has = sectionHeader.classList.contains(cls);
      document.body.classList.toggle(cls, has);
    }
    // Legacy cleanup
    document.body.classList.remove('elara-header-hidden');
  }

  function bind() {
    const sectionHeader = document.querySelector('.section-header');
    if (!sectionHeader) return;
    syncBody(sectionHeader);
    const mo = new MutationObserver(() => syncBody(sectionHeader));
    mo.observe(sectionHeader, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', () => syncBody(sectionHeader));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();
