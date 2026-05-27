/**
 * <elara-density-toggle> — column-count toggle for an editorial collection grid.
 *
 * Behavior:
 *   - Reads initial density from (in order): URL ?density=, localStorage,
 *     data-default-density attribute.
 *   - Writes selected density to URL (via history.replaceState) and
 *     localStorage so the choice persists.
 *   - Sets a CSS custom property --grid-cols on the target element specified
 *     by data-target-selector (defaults to the next .elara-grid sibling).
 *   - Buttons use aria-pressed to communicate the active state to screen
 *     readers. Click + Enter/Space activate the button.
 *
 * Markup:
 *   <elara-density-toggle data-target-selector="#CollectionGrid" data-storage-key="elara:density">
 *     <button type="button" data-density="3">3</button>
 *     <button type="button" data-density="4" aria-pressed="true">4</button>
 *     <button type="button" data-density="6">6</button>
 *   </elara-density-toggle>
 */
if (!customElements.get('elara-density-toggle')) {
  class ElaraDensityToggle extends HTMLElement {
    constructor() {
      super();
      this.buttons = [];
      this.target = null;
      this.handleClick = this.handleClick.bind(this);
    }

    connectedCallback() {
      this.buttons = Array.from(this.querySelectorAll('button[data-density]'));
      if (!this.buttons.length) return;
      this.storageKey = this.dataset.storageKey || 'elara:density';
      this.target = this.resolveTarget();

      const initial = this.resolveInitialDensity();
      this.applyDensity(initial, { persist: false });

      this.buttons.forEach((btn) => btn.addEventListener('click', this.handleClick));
    }

    disconnectedCallback() {
      this.buttons.forEach((btn) => btn.removeEventListener('click', this.handleClick));
    }

    resolveTarget() {
      const selector = this.dataset.targetSelector;
      if (selector) {
        const el = document.querySelector(selector);
        if (el) return el;
      }
      // Fallback: next sibling with the .elara-collection__grid class, or
      // any descendant of the closest section.
      const section = this.closest('section') || this.parentElement;
      return section ? section.querySelector('.elara-collection__grid, [data-density-target]') : null;
    }

    resolveInitialDensity() {
      const fromUrl = new URLSearchParams(window.location.search).get('density');
      if (this.isValidDensity(fromUrl)) return fromUrl;
      try {
        const stored = localStorage.getItem(this.storageKey);
        if (this.isValidDensity(stored)) return stored;
      } catch (e) {
        // localStorage unavailable; fall through to default.
      }
      const fromAttr = this.dataset.defaultDensity;
      if (this.isValidDensity(fromAttr)) return fromAttr;
      const pressed = this.buttons.find((b) => b.getAttribute('aria-pressed') === 'true');
      return pressed ? pressed.dataset.density : this.buttons[0].dataset.density;
    }

    isValidDensity(value) {
      if (!value) return false;
      return this.buttons.some((b) => b.dataset.density === String(value));
    }

    handleClick(event) {
      const density = event.currentTarget.dataset.density;
      if (!density) return;
      this.applyDensity(density, { persist: true });
    }

    applyDensity(density, { persist }) {
      this.buttons.forEach((btn) => {
        const isActive = btn.dataset.density === density;
        btn.setAttribute('aria-pressed', String(isActive));
        btn.classList.toggle('elara-density-toggle__btn--active', isActive);
      });

      if (this.target) {
        this.target.style.setProperty('--grid-cols', density);
        this.target.setAttribute('data-density', density);
      }

      if (persist) {
        try {
          localStorage.setItem(this.storageKey, density);
        } catch (e) {
          // Ignore.
        }
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('density', density);
          window.history.replaceState({}, '', url.toString());
        } catch (e) {
          // history API unavailable.
        }
      }
    }
  }

  customElements.define('elara-density-toggle', ElaraDensityToggle);
}
