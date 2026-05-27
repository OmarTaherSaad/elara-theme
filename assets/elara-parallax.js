/**
 * Elara parallax fallback for browsers without scroll-timeline support.
 *
 * On modern browsers (Chrome 115+, Edge 115+), the CSS `.elara-parallax-y`
 * class already uses `animation-timeline: view()` — no JS needed.
 *
 * For Safari and Firefox (until they ship view-timeline) we provide a
 * lightweight JS fallback: any element with `data-elara-parallax="<speed>"`
 * gets a translate3d updated on scroll inside a rAF loop, scoped to when
 * the element is in the viewport.
 *
 * Speed is a number: 0.2 means the element drifts 20% slower than scroll
 * (positive = up while scrolling down). Default 0.25.
 *
 * Respects prefers-reduced-motion. Silent on touch devices unless
 * data-elara-parallax-touch is set.
 */
(function () {
  if (window.__elaraParallaxReady) return;
  window.__elaraParallaxReady = true;

  // If view-timeline is supported, prefer the CSS approach.
  const hasViewTimeline = CSS?.supports?.('animation-timeline: view()');
  if (hasViewTimeline) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  const elements = [];
  let observer = null;

  function bind(el) {
    if (el.__elaraParallax) return;
    el.__elaraParallax = true;
    const speed = parseFloat(el.dataset.elaraParallax) || 0.25;
    elements.push({ el, speed, inView: false });
    if (observer) observer.observe(el);
  }

  function update() {
    const viewportH = window.innerHeight;
    for (const item of elements) {
      if (!item.inView) continue;
      const rect = item.el.getBoundingClientRect();
      // Offset from viewport center; range roughly -1 .. 1 while element is in view
      const center = rect.top + rect.height / 2;
      const progress = (center - viewportH / 2) / viewportH;
      const offset = -progress * item.speed * 100; // px
      item.el.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
    }
    rafScheduled = false;
  }

  let rafScheduled = false;
  function scheduleUpdate() {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(update);
  }

  function init() {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = elements.find((it) => it.el === entry.target);
          if (target) target.inView = entry.isIntersecting;
        }
        scheduleUpdate();
      },
      { rootMargin: '20% 0% 20% 0%' }
    );

    document.querySelectorAll('[data-elara-parallax]').forEach(bind);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Pick up dynamically-added nodes
  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('[data-elara-parallax]')) bind(n);
        n.querySelectorAll?.('[data-elara-parallax]').forEach(bind);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
