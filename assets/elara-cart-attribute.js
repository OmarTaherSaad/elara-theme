/**
 * Saves arbitrary cart attribute textareas to the cart on blur. Used for the
 * gift-note accordion in the cart drawer but agnostic — any
 * <textarea data-elara-gift-note> (or with a custom data attribute key) is
 * picked up.
 *
 * Behavior:
 *   - On blur, if the textarea's value differs from its initial value,
 *     POSTs to /cart/update.js with the attribute name from the textarea's
 *     name attribute (parsed from "attributes[<key>]" if present).
 *   - Publishes a cartUpdate event so other Elara cart UI (free-shipping
 *     bar, recommendations) can refresh.
 *   - Errors are logged silently; the textarea retains user input either way.
 */
(function () {
  if (window.__elaraCartAttributeReady) return;
  window.__elaraCartAttributeReady = true;

  const SELECTOR = '[data-elara-gift-note], [data-elara-cart-attribute]';

  function parseAttributeName(input) {
    const name = input.getAttribute('name') || '';
    const match = name.match(/^attributes\[(.+)\]$/);
    if (match) return match[1];
    return input.dataset.elaraCartAttribute || input.dataset.elaraGiftNote || null;
  }

  async function saveAttribute(input) {
    const key = parseAttributeName(input);
    if (!key) return;
    const value = input.value || '';
    if (input.dataset.lastSaved === value) return;
    input.dataset.lastSaved = value;

    const body = new FormData();
    body.set(`attributes[${key}]`, value);
    try {
      const response = await fetch(`${window.Shopify?.routes?.root || '/'}cart/update.js`, {
        method: 'POST',
        body,
      });
      if (!response.ok) throw new Error(`cart/update.js ${response.status}`);
      const cart = await response.json();
      if (typeof window.publish === 'function' && window.PUB_SUB_EVENTS?.cartUpdate) {
        window.publish(window.PUB_SUB_EVENTS.cartUpdate, { source: 'elara-cart-attribute', cartData: cart });
      }
    } catch (e) {
      console.warn('[elara-cart-attribute]', e);
    }
  }

  function bind(input) {
    if (input.__elaraBound) return;
    input.__elaraBound = true;
    input.dataset.lastSaved = input.value || '';
    input.addEventListener('blur', () => saveAttribute(input));
  }

  function init() {
    document.querySelectorAll(SELECTOR).forEach(bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Re-bind after cart drawer re-renders.
  document.addEventListener('cart:rerender', init);
  // Watch for new gift-note fields added by section rendering.
  const mo = new MutationObserver(() => init());
  mo.observe(document.body, { childList: true, subtree: true });
})();
