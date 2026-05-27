/**
 * <elara-recently-viewed> — client-side "you recently viewed" carousel.
 *
 * Behavior:
 *   - On connect, reads an array of product handles from localStorage
 *     (key from data-storage-key) and fetches a card for each via
 *     /products/{handle}?section_id={data-card-section} using the Section
 *     Rendering API. Cards stream in as they resolve, in order.
 *   - If data-current-handle is set (i.e. we're rendering on a product page),
 *     unshifts the current handle to the front of the array and trims to
 *     max-items, then writes back to localStorage.
 *   - The current product is filtered out of the rendered list so users
 *     don't see the product they're already on.
 *   - The section is hidden by default; the element unhides it once at least
 *     one card has resolved successfully. Empty state shows a friendly note.
 *   - Fetch errors are swallowed silently — if a product has been deleted
 *     since the user viewed it, we just skip it.
 */
if (!customElements.get('elara-recently-viewed')) {
  class ElaraRecentlyViewed extends HTMLElement {
    constructor() {
      super();
      this.track = null;
      this.empty = null;
      this.sectionWrapper = null;
    }

    connectedCallback() {
      this.track = this.querySelector('[data-recently-viewed-track]');
      this.empty = this.querySelector('[data-recently-viewed-empty]');
      this.sectionWrapper = this.closest('[data-recently-viewed-section]');
      if (!this.track) return;

      this.storageKey = this.dataset.storageKey || 'elara:recently-viewed';
      this.maxItems = parseInt(this.dataset.maxItems || '8', 10);
      this.cardSection = this.dataset.cardSection || 'recently-viewed-card';
      this.currentHandle = this.dataset.currentHandle || '';

      const handles = this.recordVisit();
      this.render(handles);
    }

    recordVisit() {
      let handles = this.readHandles();
      if (this.currentHandle) {
        handles = handles.filter((h) => h !== this.currentHandle);
        handles.unshift(this.currentHandle);
        if (handles.length > this.maxItems) handles = handles.slice(0, this.maxItems);
        this.writeHandles(handles);
      }
      return handles;
    }

    readHandles() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((h) => typeof h === 'string' && h);
      } catch (e) {
        return [];
      }
    }

    writeHandles(handles) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(handles));
      } catch (e) {
        // localStorage may be unavailable in private mode or quota exceeded.
      }
    }

    async render(handles) {
      const toRender = handles.filter((h) => h !== this.currentHandle);
      if (toRender.length === 0) {
        this.showEmpty();
        return;
      }

      // Fetch cards in parallel; preserve original order in the DOM by using a
      // placeholder for each handle that we replace as it resolves.
      const placeholders = toRender.map((handle) => {
        const li = document.createElement('li');
        li.className = 'elara-recently-viewed__item';
        li.dataset.handle = handle;
        this.track.appendChild(li);
        return li;
      });

      let revealed = false;
      const fetches = toRender.map((handle, index) =>
        this.fetchCard(handle)
          .then((html) => {
            if (!html) {
              placeholders[index].remove();
              return;
            }
            placeholders[index].innerHTML = html;
            if (!revealed && this.sectionWrapper) {
              this.sectionWrapper.hidden = false;
              revealed = true;
            }
          })
          .catch(() => placeholders[index].remove())
      );

      await Promise.all(fetches);

      if (!revealed) this.showEmpty();
    }

    async fetchCard(handle) {
      const url = `${window.Shopify?.routes?.root || '/'}products/${encodeURIComponent(handle)}?section_id=${this.cardSection}`;
      const response = await fetch(url, { headers: { Accept: 'text/html' } });
      if (!response.ok) return null;
      return await response.text();
    }

    showEmpty() {
      // Only show the empty state if there's an explicit reason (e.g. handles
      // exist but all 404). On a fresh visitor with no handles, the section
      // simply stays hidden.
      if (this.empty && this.track.children.length === 0 && this.readHandles().length > 0) {
        this.empty.hidden = false;
        if (this.sectionWrapper) this.sectionWrapper.hidden = false;
      }
    }
  }

  customElements.define('elara-recently-viewed', ElaraRecentlyViewed);
}
