/**
 * <elara-marquee> — custom element for kinetic text/logo marquees.
 *
 * Behavior:
 *   - On connect, measures the track and the viewport. If the track is shorter
 *     than 2x the viewport, duplicates its <li>s until it's at least that wide
 *     so the CSS keyframe (translate -50%) loops seamlessly.
 *   - Respects prefers-reduced-motion by pausing the animation entirely.
 *   - Optionally pauses on pointerenter / resumes on pointerleave when the
 *     data-pause-on-hover attribute is "true".
 *   - Re-measures on resize via ResizeObserver.
 *
 * CSS responsibilities (section-marquee.css):
 *   - Defines @keyframes elaraMarquee.
 *   - Drives speed via --elara-marquee-duration custom property.
 *   - Toggles animation-play-state via the .elara-marquee--paused class.
 */
if (!customElements.get('elara-marquee')) {
  class ElaraMarquee extends HTMLElement {
    constructor() {
      super();
      this.track = null;
      this.duplicate = null;
      this.resizeObserver = null;
      this.prefersReducedMotion = false;
      this.handlePointerEnter = this.handlePointerEnter.bind(this);
      this.handlePointerLeave = this.handlePointerLeave.bind(this);
    }

    connectedCallback() {
      this.track = this.querySelector('.elara-marquee__track');
      this.duplicate = this.querySelector('.elara-marquee__duplicate');
      if (!this.track) return;

      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.prefersReducedMotion) {
        this.classList.add('elara-marquee--paused');
        return;
      }

      this.fillTrack();

      if (this.dataset.pauseOnHover === 'true') {
        this.addEventListener('pointerenter', this.handlePointerEnter);
        this.addEventListener('pointerleave', this.handlePointerLeave);
      }

      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.fillTrack());
        this.resizeObserver.observe(this);
      }
    }

    disconnectedCallback() {
      this.removeEventListener('pointerenter', this.handlePointerEnter);
      this.removeEventListener('pointerleave', this.handlePointerLeave);
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    /**
     * Ensures the marquee track is at least 2× the viewport width so the
     * translate(-50%) animation produces a seamless loop. Liquid already
     * renders one duplicate; we add more clones here at runtime if needed.
     */
    fillTrack() {
      if (!this.track || !this.duplicate) return;
      const viewportWidth = this.offsetWidth;
      if (!viewportWidth) return;

      const items = Array.from(this.track.children).filter(
        (el) => !el.classList.contains('elara-marquee__duplicate')
      );
      if (!items.length) return;

      let trackHalfWidth = items.reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);

      const safety = 16;
      while (trackHalfWidth < viewportWidth + safety) {
        items.forEach((el) => {
          const clone = el.cloneNode(true);
          clone.setAttribute('aria-hidden', 'true');
          this.track.insertBefore(clone, this.duplicate);
          this.duplicate.appendChild(el.cloneNode(true));
        });
        trackHalfWidth = Array.from(this.track.children)
          .filter((el) => !el.classList.contains('elara-marquee__duplicate'))
          .reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
        if (trackHalfWidth > 6000) break;
      }
    }

    handlePointerEnter() {
      this.classList.add('elara-marquee--paused');
    }

    handlePointerLeave() {
      this.classList.remove('elara-marquee--paused');
    }
  }

  customElements.define('elara-marquee', ElaraMarquee);
}
