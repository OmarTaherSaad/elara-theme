/**
 * <elara-sticky-scroller> — sticky media column that crossfades to match the
 * currently-in-view text step.
 *
 * Behavior:
 *   - Desktop (>= 750px): one IntersectionObserver per step. When the step
 *     enters the central 50% of the viewport, the matching media item gets the
 *     --active modifier (opacity 1, others 0).
 *   - Mobile: the desktop sticky stack is hidden via CSS; each step renders
 *     its own inline image instead. JS does nothing on small viewports.
 *   - Respects prefers-reduced-motion by relying on CSS to disable
 *     transitions; the active-class swap still happens but without animation.
 */
if (!customElements.get('elara-sticky-scroller')) {
  class ElaraStickyScroller extends HTMLElement {
    constructor() {
      super();
      this.steps = [];
      this.mediaItems = [];
      this.observer = null;
      this.activeIndex = 0;
      this.mql = null;
      this.handleMqlChange = this.handleMqlChange.bind(this);
    }

    connectedCallback() {
      this.steps = Array.from(this.querySelectorAll('[data-step-index]'));
      this.mediaItems = Array.from(this.querySelectorAll('[data-step-media]'));
      if (!this.steps.length || !this.mediaItems.length) return;

      this.mql = window.matchMedia('(min-width: 750px)');
      this.mql.addEventListener('change', this.handleMqlChange);
      if (this.mql.matches) this.attachObserver();
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
      if (this.mql) this.mql.removeEventListener('change', this.handleMqlChange);
    }

    handleMqlChange(event) {
      if (event.matches) {
        this.attachObserver();
      } else {
        this.detachObserver();
      }
    }

    attachObserver() {
      if (this.observer) return;
      const options = {
        rootMargin: '-30% 0px -50% 0px',
        threshold: 0,
      };
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.dataset.stepIndex, 10);
            if (Number.isFinite(index)) this.setActive(index);
          }
        });
      }, options);
      this.steps.forEach((step) => this.observer.observe(step));
    }

    detachObserver() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
    }

    setActive(index) {
      if (index === this.activeIndex) return;
      this.activeIndex = index;
      this.mediaItems.forEach((mediaItem) => {
        const itemIndex = parseInt(mediaItem.dataset.stepMedia, 10);
        if (itemIndex === index) {
          mediaItem.classList.add('elara-sticky-story__media-item--active');
        } else {
          mediaItem.classList.remove('elara-sticky-story__media-item--active');
        }
      });
      this.steps.forEach((step) => {
        const stepIndex = parseInt(step.dataset.stepIndex, 10);
        step.classList.toggle('elara-sticky-story__step--active', stepIndex === index);
      });
    }
  }

  customElements.define('elara-sticky-scroller', ElaraStickyScroller);
}
