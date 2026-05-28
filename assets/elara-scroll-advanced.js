/**
 * Elara advanced scrolling utilities.
 *
 * 1. Word-split: any element with `.elara-words-reveal` has its text
 *    children split into <span class="elara-word"> with --w-index so
 *    the CSS scroll-driven animation can stagger them.
 *
 * 2. Counter-up: any element with `data-elara-counter-target="N"` is
 *    animated from 0 to N when it enters the viewport, using
 *    IntersectionObserver. Easing: easeOutCubic. Honours
 *    prefers-reduced-motion (snaps directly to final value).
 *
 * 3. Horizontal-scroll pin: `[data-elara-h-scroll]` sections become a
 *    sticky-pinned horizontal scroller on desktop. The inner
 *    .elara-h-scroll__track translates X based on the user's vertical
 *    scroll position within the outer container's range. Mobile falls
 *    back to a normal stack.
 *
 * 4. JS reveal fallback: for browsers without animation-timeline
 *    (Safari, Firefox until support lands), any `.elara-words-reveal`,
 *    `.elara-mask-from-left/right/bottom`, `.elara-letter-tighten`
 *    element gets an IntersectionObserver-driven `.is-in-view` class
 *    that triggers the same end-state via a CSS fallback rule.
 */
(function () {
  if (window.__elaraScrollAdvancedReady) return;
  window.__elaraScrollAdvancedReady = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasViewTimeline = CSS?.supports?.('animation-timeline: view()');

  // -------- Word splitter --------
  function splitWords(el) {
    if (el.__elaraWordsSplit) return;
    el.__elaraWordsSplit = true;
    const text = el.textContent;
    if (!text || !text.trim()) return;
    const words = text.split(/(\s+)/);
    el.textContent = '';
    let idx = 0;
    for (const w of words) {
      if (/^\s+$/.test(w)) {
        el.appendChild(document.createTextNode(w));
      } else {
        const span = document.createElement('span');
        span.className = 'elara-word';
        span.style.setProperty('--w-index', idx++);
        span.textContent = w;
        el.appendChild(span);
      }
    }
  }

  function initWordSplits(root) {
    (root || document).querySelectorAll('.elara-words-reveal').forEach(splitWords);
  }

  // -------- Counter --------
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateCounter(el, target, durationMs) {
    const startTime = performance.now();
    const startValue = 0;
    function tick(now) {
      const t = Math.min(1, (now - startTime) / durationMs);
      const value = Math.round(startValue + (target - startValue) * easeOutCubic(t));
      el.textContent = value.toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function initCounters(root) {
    const counters = (root || document).querySelectorAll('[data-elara-counter-target]');
    if (!counters.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;
          if (el.__elaraCounterRan) continue;
          el.__elaraCounterRan = true;
          const target = parseInt(el.dataset.elaraCounterTarget, 10);
          const duration = parseInt(el.dataset.elaraCounterDuration || '1600', 10);
          if (!Number.isFinite(target)) continue;
          if (reduceMotion) {
            el.textContent = target.toLocaleString();
          } else {
            animateCounter(el, target, duration);
          }
          observer.unobserve(el);
        }
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    counters.forEach((c) => observer.observe(c));
  }

  // -------- Horizontal scroll --------
  function initHScroll() {
    const sections = document.querySelectorAll('[data-elara-h-scroll]');
    if (!sections.length) return;
    if (window.matchMedia('(max-width: 749px)').matches) return;

    sections.forEach((section) => {
      const viewport = section.querySelector('.elara-h-scroll__viewport');
      const track = section.querySelector('.elara-h-scroll__track');
      if (!viewport || !track) return;

      let raf = 0;
      function update() {
        const rect = section.getBoundingClientRect();
        const total = section.offsetHeight - window.innerHeight;
        const progress = Math.min(1, Math.max(0, -rect.top / total));
        const maxX = track.scrollWidth - window.innerWidth;
        track.style.transform = `translate3d(${-progress * maxX}px, 0, 0)`;
        raf = 0;
      }
      function schedule() {
        if (raf) return;
        raf = requestAnimationFrame(update);
      }
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      schedule();
    });
  }

  // -------- View-timeline fallback --------
  function initViewTimelineFallback() {
    if (hasViewTimeline || reduceMotion) return;

    const selectors = [
      '.elara-words-reveal',
      '.elara-mask-from-left',
      '.elara-mask-from-right',
      '.elara-mask-from-bottom',
      '.elara-letter-tighten',
      '.elara-reveal',
      '.elara-reveal-up',
      '.elara-reveal-image',
      '.elara-reveal-scale',
    ];
    const els = document.querySelectorAll(selectors.join(','));
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in-view');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => observer.observe(el));
  }

  function init(root) {
    initWordSplits(root);
    initCounters(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
      initHScroll();
      initViewTimelineFallback();
    });
  } else {
    init();
    initHScroll();
    initViewTimelineFallback();
  }

  // Re-init on dynamic content (cart drawer re-render, section editor reload)
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('.elara-words-reveal')) splitWords(n);
        if (n.querySelectorAll) init(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
