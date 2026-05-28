/**
 * Elara advanced hover behaviors.
 *
 * 1. Custom cursor: a single .elara-cursor element follows the pointer
 *    and morphs when hovering certain element types:
 *      - link → expands
 *      - product card image → "View" pill
 *      - text input / contenteditable → I-beam style
 *      - magnetic / interactive → smaller dot
 *    Disabled on touch / reduced motion / below 990px viewport.
 *
 * 2. Directional clip-path reveal: product card images get the
 *    `data-enter-side` attribute set to 0..3 (right, left, bottom, top)
 *    based on which edge the pointer crossed first.
 *
 * 3. Drag-to-scroll on .elara-tabs__panel, recently-viewed, complete-look
 *    horizontal scrollers — clicking and dragging scrolls horizontally
 *    on desktop where touch scroll isn't natural.
 *
 * 4. Number scrambler (data-elara-scramble) — text characters shuffle
 *    through random glyphs before settling on the real text on first
 *    visibility.
 *
 * All behaviors gated on hover/pointer capability and prefers-reduced-motion.
 */
(function () {
  if (window.__elaraHoverReady) return;
  window.__elaraHoverReady = true;

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.matchMedia('(min-width: 990px)').matches;

  // ============================================================
  // 1. Custom cursor
  // ============================================================
  function initCustomCursor() {
    if (!canHover || reduceMotion || !isDesktop) return;

    const cursor = document.createElement('div');
    cursor.className = 'elara-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    document.body.classList.add('elara-custom-cursor-active');

    let x = 0, y = 0;
    let tx = 0, ty = 0;

    document.addEventListener('pointermove', (e) => {
      x = e.clientX;
      y = e.clientY;
      cursor.classList.add('is-visible');
    });
    document.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('pointerdown', () => cursor.classList.add('is-clicking'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-clicking'));

    function tick() {
      // Smooth follow (lerp)
      tx += (x - tx) * 0.22;
      ty += (y - ty) * 0.22;
      cursor.style.transform = `translate3d(${tx - cursor.offsetWidth / 2}px, ${ty - cursor.offsetHeight / 2}px, 0)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    // Hover-aware class swaps
    document.addEventListener('pointerover', (e) => {
      const t = e.target;
      cursor.classList.remove('is-hovering-link', 'is-hovering-image', 'is-hovering-text');

      if (t.closest('input, textarea, [contenteditable="true"]')) {
        cursor.classList.add('is-hovering-text');
        return;
      }
      if (t.closest('.elara-card__media-link, .lookbook__pin, [data-elara-cursor="image"]')) {
        cursor.classList.add('is-hovering-image');
        return;
      }
      if (t.closest('a, button, [role="button"], summary, label, [data-elara-magnetic]')) {
        cursor.classList.add('is-hovering-link');
      }
    });
  }

  // ============================================================
  // 2. Directional clip-path reveal
  // ============================================================
  function initDirectionalReveal() {
    if (!canHover || reduceMotion) return;

    function side(rect, x, y) {
      // 0: right, 1: left, 2: bottom, 3: top — based on closest edge
      const dRight  = rect.right  - x;
      const dLeft   = x - rect.left;
      const dBottom = rect.bottom - y;
      const dTop    = y - rect.top;
      const m = Math.min(dRight, dLeft, dBottom, dTop);
      if (m === dRight)  return 0;
      if (m === dLeft)   return 1;
      if (m === dBottom) return 2;
      return 3;
    }

    document.addEventListener('pointerenter', (e) => {
      const t = e.target.closest?.('.elara-card__media--has-secondary');
      if (!t) return;
      const rect = t.getBoundingClientRect();
      t.dataset.enterSide = String(side(rect, e.clientX, e.clientY));
    }, true);
  }

  // ============================================================
  // 3. Drag-to-scroll on horizontal carousels (desktop only)
  // ============================================================
  function initDragScroll() {
    if (!canHover || !isDesktop) return;

    const scrollers = document.querySelectorAll(
      '.elara-tabs__panel, .elara-recently-viewed__track, .elara-product__complete-look-track, .elara-cart-drawer__recommendations-track, .elara-lookbook__mobile-list'
    );

    scrollers.forEach((el) => {
      if (el.__elaraDragScroll) return;
      el.__elaraDragScroll = true;

      let isDown = false;
      let startX = 0;
      let scrollStart = 0;

      el.addEventListener('pointerdown', (e) => {
        // Only with primary button and not on an anchor (let links work)
        if (e.button !== 0) return;
        if (e.target.closest('a[href]:not(.elara-card__media-link), button:not([data-info-drawer-close])')) return;
        isDown = true;
        startX = e.clientX;
        scrollStart = el.scrollLeft;
        el.setPointerCapture(e.pointerId);
        el.style.scrollSnapType = 'none';
      });

      el.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const dx = e.clientX - startX;
        el.scrollLeft = scrollStart - dx;
      });

      function release(e) {
        if (!isDown) return;
        isDown = false;
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        el.style.scrollSnapType = '';
      }
      el.addEventListener('pointerup', release);
      el.addEventListener('pointercancel', release);
      el.addEventListener('pointerleave', release);
    });
  }

  // ============================================================
  // 4. Number scrambler
  // ============================================================
  const SCRAMBLE_CHARS = '!<>-_\\/[]{}—=+*^?#________';

  function scramble(el) {
    if (el.__elaraScrambled) return;
    el.__elaraScrambled = true;
    const target = el.textContent;
    const len = target.length;
    let frame = 0;
    const totalFrames = 30;

    function tick() {
      let out = '';
      for (let i = 0; i < len; i++) {
        const reveal = frame / totalFrames > i / len + 0.15;
        if (reveal) {
          out += target[i];
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = out;
      if (frame < totalFrames) {
        frame++;
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }
    requestAnimationFrame(tick);
  }

  function initScramble() {
    if (reduceMotion) return;
    const els = document.querySelectorAll('[data-elara-scramble]');
    if (!els.length) return;
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          scramble(e.target);
          observer.unobserve(e.target);
        }
      }
    });
    els.forEach((el) => observer.observe(el));
  }

  // ============================================================
  // Init
  // ============================================================
  function init() {
    initCustomCursor();
    initDirectionalReveal();
    initDragScroll();
    initScramble();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-init scrollers / scramblers on dynamic content
  const mo = new MutationObserver(() => {
    initDragScroll();
    initScramble();
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
