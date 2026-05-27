/**
 * Elara magnetic + cursor-aware interactions.
 *
 * Activated by `data-elara-magnetic` attribute on any interactive
 * element (button, link, image). The element gently translates toward
 * the pointer position on hover, then snaps back when the pointer
 * leaves. Strength can be tuned via data-elara-magnetic-strength
 * (default 14, expressed in px).
 *
 * Also exposes pointer-relative CSS custom properties (--mx, --my)
 * on elements with `data-elara-pointer-aware` so CSS can react
 * (e.g. spotlight effects, tilt). Set on pointermove relative to
 * the element's bounding box.
 *
 * No effect unless `(hover: hover) and (pointer: fine)` matches and
 * prefers-reduced-motion is no-preference. Silent on touch devices.
 */
(function () {
  if (window.__elaraMagneticReady) return;
  window.__elaraMagneticReady = true;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canHover || reduceMotion) return;

  // -------- Magnetic translation on hover --------
  function bindMagnetic(el) {
    if (el.__elaraMagnetic) return;
    el.__elaraMagnetic = true;
    const strength = Number(el.dataset.elaraMagneticStrength) || 14;

    let rect = null;
    let rafId = 0;

    const update = (x, y) => {
      const dx = ((x - (rect.left + rect.width / 2)) / rect.width) * strength;
      const dy = ((y - (rect.top + rect.height / 2)) / rect.height) * strength;
      el.style.setProperty('--magnet-x', `${dx.toFixed(2)}px`);
      el.style.setProperty('--magnet-y', `${dy.toFixed(2)}px`);
    };

    el.addEventListener('pointerenter', () => {
      rect = el.getBoundingClientRect();
      el.style.willChange = 'transform';
    });

    el.addEventListener('pointermove', (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => update(e.clientX, e.clientY));
    });

    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(rafId);
      el.style.setProperty('--magnet-x', '0px');
      el.style.setProperty('--magnet-y', '0px');
      el.style.willChange = '';
      rect = null;
    });
  }

  // -------- Pointer-aware custom properties --------
  function bindPointerAware(el) {
    if (el.__elaraPointerAware) return;
    el.__elaraPointerAware = true;

    let rect = null;
    let rafId = 0;

    el.addEventListener('pointerenter', () => {
      rect = el.getBoundingClientRect();
    });

    el.addEventListener('pointermove', (e) => {
      if (!rect) rect = el.getBoundingClientRect();
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--mx', `${x.toFixed(1)}%`);
        el.style.setProperty('--my', `${y.toFixed(1)}%`);
      });
    });

    el.addEventListener('pointerleave', () => {
      cancelAnimationFrame(rafId);
      el.style.setProperty('--mx', '50%');
      el.style.setProperty('--my', '50%');
      rect = null;
    });
  }

  function init(root) {
    (root || document).querySelectorAll('[data-elara-magnetic]').forEach(bindMagnetic);
    (root || document).querySelectorAll('[data-elara-pointer-aware]').forEach(bindPointerAware);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  // Watch for new nodes (section editor live-reload, cart drawer re-render).
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('[data-elara-magnetic]')) bindMagnetic(n);
        if (n.matches?.('[data-elara-pointer-aware]')) bindPointerAware(n);
        init(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
