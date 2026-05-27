/**
 * <elara-progress-shipping-bar> — animates a free-shipping progress bar in
 * response to cart updates.
 *
 * Subscribes to Dawn's existing PUB_SUB_EVENTS.cartUpdate (defined in
 * pubsub.js). When fired, recomputes the fraction current/threshold,
 * updates the --progress custom property, and rewrites the human-readable
 * label.
 *
 * If pubsub is unavailable (e.g. cart drawer hasn't loaded yet), the element
 * polls cart.js once on connect by fetching /cart.js. This guarantees the
 * bar is correct on first render even if the section was server-rendered
 * with a stale cart total (e.g. a logged-in shopper whose cart was updated
 * in another tab).
 */
if (!customElements.get('elara-progress-shipping-bar')) {
  class ElaraProgressShippingBar extends HTMLElement {
    constructor() {
      super();
      this.unsubscribe = null;
      this.fillEl = null;
      this.labelEl = null;
    }

    connectedCallback() {
      this.threshold = parseInt(this.dataset.threshold || '0', 10);
      this.fillEl = this.querySelector('[data-free-shipping-fill]');
      this.labelEl = this.querySelector('[data-free-shipping-label]');
      if (!this.threshold || this.threshold <= 0) return;

      this.subscribe();
      this.refreshFromServer();
    }

    disconnectedCallback() {
      if (typeof this.unsubscribe === 'function') this.unsubscribe();
    }

    subscribe() {
      if (typeof window.subscribe === 'function' && window.PUB_SUB_EVENTS) {
        const events = [window.PUB_SUB_EVENTS.cartUpdate, window.PUB_SUB_EVENTS.cartError];
        const unsubscribes = events
          .filter(Boolean)
          .map((event) => window.subscribe(event, () => this.refreshFromServer()));
        this.unsubscribe = () => unsubscribes.forEach((u) => typeof u === 'function' && u());
      }
    }

    async refreshFromServer() {
      try {
        const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart.js`, {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const cart = await response.json();
        this.update(cart.total_price || 0);
      } catch (e) {
        // Silent fail — leave the server-rendered values in place.
      }
    }

    update(currentTotal) {
      const pct = Math.min(100, (currentTotal / this.threshold) * 100);
      if (this.fillEl) this.fillEl.style.setProperty('--progress', `${pct}%`);

      this.setAttribute('aria-valuenow', String(Math.round(pct)));
      const track = this.querySelector('[role="progressbar"]');
      if (track) track.setAttribute('aria-valuenow', String(Math.round(pct)));

      if (!this.labelEl) return;
      if (pct >= 100) {
        const key = this.dataset.labelQualifiedKey || 'sections.elara.cart.free_shipping_qualified';
        this.labelEl.textContent = this.translate(key);
      } else {
        const remaining = Math.max(0, this.threshold - currentTotal);
        const key = this.dataset.labelRemainingKey || 'sections.elara.cart.free_shipping_remaining';
        this.labelEl.textContent = this.translate(key, { amount: this.formatMoney(remaining) });
      }
    }

    translate(key, replacements = {}) {
      // Theme strings exposed via window.elaraI18n if set by the layout. As a
      // fallback we surface the key prefix so the visible result is at least
      // intelligible (e.g. "free_shipping_remaining: $4.00 to free shipping").
      const dict = window.elaraI18n || {};
      let value = key.split('.').reduce((acc, segment) => (acc ? acc[segment] : null), dict) || key;
      Object.entries(replacements).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, 'g'), v);
      });
      return value;
    }

    formatMoney(cents) {
      const fmt = window.Shopify?.formatMoney;
      if (typeof fmt === 'function') return fmt(cents);
      // Cheap fallback — assumes whole-currency separator. Real i18n flows
      // through Dawn's existing Shopify.formatMoney once loaded.
      return `${(cents / 100).toFixed(2)}`;
    }
  }

  customElements.define('elara-progress-shipping-bar', ElaraProgressShippingBar);
}
