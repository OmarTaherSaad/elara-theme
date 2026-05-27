/**
 * <elara-info-drawer> — generic right-edge drawer with focus trap, escape
 * close, outside-click close, and optional Section Rendering API fetch.
 *
 * Trigger pattern:
 *   <button type="button" data-info-drawer-open="DrawerId">Open</button>
 *   <elara-info-drawer id="DrawerId" hidden ...> ... </elara-info-drawer>
 *
 * Behavior:
 *   - The element listens at document level for clicks on
 *     [data-info-drawer-open="<id>"] and opens itself when its id matches.
 *   - Close triggers: [data-info-drawer-close] (overlay + close button), the
 *     Escape key, or a click outside the panel.
 *   - When data-fetch-url is set, the drawer fetches that URL with the
 *     section_id query parameter on first open, replaces the body markup
 *     with the returned section HTML, and caches it so subsequent opens are
 *     instant. Network errors leave the loader visible with a fallback note.
 *   - Focus trap: tab cycling is constrained to focusable elements inside
 *     the panel. The previously focused element is restored on close.
 *
 * Pub/sub: dispatches 'elara:info-drawer:open' and 'elara:info-drawer:close'
 * events on the element for external listeners.
 */
if (!customElements.get('elara-info-drawer')) {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  class ElaraInfoDrawer extends HTMLElement {
    constructor() {
      super();
      this.panel = null;
      this.body = null;
      this.loader = null;
      this.triggerEl = null;
      this.previouslyFocused = null;
      this.isOpen = false;
      this.fetchedOnce = false;
      this.handleDocumentClick = this.handleDocumentClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
      this.handleInternalClick = this.handleInternalClick.bind(this);
    }

    connectedCallback() {
      this.panel = this.querySelector('.elara-info-drawer__panel');
      this.body = this.querySelector('[data-info-drawer-body]');
      this.loader = this.querySelector('[data-info-drawer-loader]');
      document.addEventListener('click', this.handleDocumentClick);
      this.addEventListener('click', this.handleInternalClick);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.handleDocumentClick);
      this.removeEventListener('click', this.handleInternalClick);
      document.removeEventListener('keydown', this.handleKeydown);
    }

    handleDocumentClick(event) {
      const trigger = event.target.closest('[data-info-drawer-open]');
      if (!trigger) return;
      if (trigger.getAttribute('data-info-drawer-open') !== this.id) return;
      event.preventDefault();
      this.triggerEl = trigger;
      this.open();
    }

    handleInternalClick(event) {
      if (event.target.closest('[data-info-drawer-close]')) {
        event.preventDefault();
        this.close();
      }
    }

    async open() {
      if (this.isOpen) return;
      this.isOpen = true;
      this.previouslyFocused = document.activeElement;
      this.hidden = false;
      // Force layout, then add the open class so the CSS transition fires.
      requestAnimationFrame(() => this.classList.add('elara-info-drawer--open'));
      document.documentElement.classList.add('elara-info-drawer-open');
      document.addEventListener('keydown', this.handleKeydown);

      if (this.dataset.fetchUrl && !this.fetchedOnce) {
        await this.fetchContent();
      }

      // Focus the first focusable element inside the panel; fall back to the panel itself.
      window.setTimeout(() => {
        const firstFocusable = this.panel.querySelector(FOCUSABLE);
        (firstFocusable || this.panel).focus({ preventScroll: true });
      }, 50);

      this.dispatchEvent(new CustomEvent('elara:info-drawer:open', { bubbles: true }));
    }

    close() {
      if (!this.isOpen) return;
      this.isOpen = false;
      this.classList.remove('elara-info-drawer--open');
      document.documentElement.classList.remove('elara-info-drawer-open');
      document.removeEventListener('keydown', this.handleKeydown);

      const restore = () => {
        this.hidden = true;
        this.removeEventListener('transitionend', restore);
        if (this.previouslyFocused && typeof this.previouslyFocused.focus === 'function') {
          this.previouslyFocused.focus({ preventScroll: true });
        }
      };
      this.addEventListener('transitionend', restore);
      // Fallback for browsers that don't fire the transition (or reduced motion).
      window.setTimeout(restore, 500);

      this.dispatchEvent(new CustomEvent('elara:info-drawer:close', { bubbles: true }));
    }

    handleKeydown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(this.panel.querySelectorAll(FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1'
      );
      if (!focusable.length) {
        event.preventDefault();
        this.panel.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    async fetchContent() {
      const url = this.dataset.fetchUrl;
      const sectionId = this.dataset.fetchSectionId;
      if (!url) return;

      try {
        const params = new URLSearchParams();
        if (sectionId) params.set('section_id', sectionId);
        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}${params.toString()}`;
        const response = await fetch(fetchUrl, { headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error(`Section fetch failed: ${response.status}`);
        const html = await response.text();
        // The Section Rendering API returns the section HTML directly (a
        // <section> or a wrapper). Insert and let the body grow.
        if (this.body) {
          this.body.innerHTML = html;
        }
        this.fetchedOnce = true;
      } catch (error) {
        if (this.loader) {
          this.loader.innerHTML = `<p class="elara-info-drawer__error">Couldn't load content. Please try again.</p>`;
        }
        // Don't set fetchedOnce so the user can retry by closing and reopening.
        console.warn('[elara-info-drawer]', error);
      }
    }
  }

  customElements.define('elara-info-drawer', ElaraInfoDrawer);
}
