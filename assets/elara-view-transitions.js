/**
 * Elara View Transitions hookup.
 *
 * Intercepts internal-link clicks and wraps the navigation in
 * `document.startViewTransition` so the browser produces a smooth
 * cross-page fade — and, where view-transition-name is set on
 * matching elements (product card image, product page hero), a
 * morph animation between source and destination.
 *
 * Feature-detected. Falls back to default navigation in browsers
 * without the View Transitions API (Safari, Firefox until they ship).
 * Skipped when the link opens a new tab, has a download attribute,
 * uses target=_blank, or modifier keys are held.
 *
 * Skipped when elara_view_transitions setting is off (the host page
 * sets window.__elaraViewTransitions=false in that case).
 */
(function () {
  if (window.__elaraViewTransitionsBound) return;
  window.__elaraViewTransitionsBound = true;

  if (typeof document.startViewTransition !== 'function') return;
  if (window.__elaraViewTransitions === false) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  function shouldHandle(event, anchor) {
    if (!anchor || !anchor.href) return false;
    if (anchor.target && anchor.target !== '_self') return false;
    if (anchor.hasAttribute('download')) return false;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
    if (event.button !== undefined && event.button !== 0) return false;
    // Same origin only
    try {
      const url = new URL(anchor.href, document.baseURI);
      if (url.origin !== window.location.origin) return false;
      // Don't intercept hash-only links on the same page
      if (url.pathname === window.location.pathname && url.hash) return false;
      // Skip cart / checkout / customer auth flows (Shopify handles them)
      if (
        url.pathname.startsWith('/cart') ||
        url.pathname.startsWith('/checkout') ||
        url.pathname.startsWith('/account') ||
        url.pathname.includes('/oauth') ||
        url.pathname.includes('/admin')
      ) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function setViewTransitionName(anchor) {
    // If the click is on a product card image, name it `vt-product-{handle}`
    // so the destination product hero with the same name morphs in.
    const img = anchor.querySelector('img');
    const productHandle = anchor.dataset.elaraProductHandle ||
                          anchor.getAttribute('href')?.match(/\/products\/([\w-]+)/)?.[1];
    if (img && productHandle) {
      img.style.viewTransitionName = `vt-product-${productHandle}`;
    }
  }

  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!shouldHandle(e, anchor)) return;

    e.preventDefault();
    setViewTransitionName(anchor);

    document.startViewTransition(async () => {
      // Standard navigation — the browser performs the page load,
      // then captures the after-snapshot for the transition.
      window.location.assign(anchor.href);
      // Promise never resolves because the page reloads, which is fine —
      // the View Transitions API handles this case gracefully.
      return new Promise(() => {});
    });
  });
})();
