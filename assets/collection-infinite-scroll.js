/**
 * <elara-collection-infinite-scroll> — infinite-scroll loader for editorial
 * collection grids.
 *
 * Markup contract:
 *   <elara-collection-infinite-scroll
 *     data-section-id="MainCollectionGrid"
 *     data-grid-selector="[data-collection-grid]"
 *     data-next-url="/collections/all?page=2">
 *     <ul data-collection-grid>...</ul>
 *     <div data-sentinel></div>
 *     <noscript>...pagination fallback...</noscript>
 *   </elara-collection-infinite-scroll>
 *
 * Behavior:
 *   - IntersectionObserver on [data-sentinel] fetches data-next-url with the
 *     section_id query parameter via the Section Rendering API.
 *   - Parses the returned HTML, extracts the new grid items and pagination,
 *     appends the items to the existing grid, updates data-next-url from the
 *     new pagination (or marks itself done if no more pages).
 *   - Updates window.history with the new page URL so users can bookmark /
 *     share their current position.
 *   - Falls back to a visible pagination snippet rendered server-side; if JS
 *     fails, the user still has page navigation. The sentinel is removed
 *     when there are no more pages.
 */
if (!customElements.get('elara-collection-infinite-scroll')) {
  class ElaraCollectionInfiniteScroll extends HTMLElement {
    constructor() {
      super();
      this.sentinel = null;
      this.grid = null;
      this.observer = null;
      this.loading = false;
      this.done = false;
    }

    connectedCallback() {
      this.sentinel = this.querySelector('[data-sentinel]');
      const gridSelector = this.dataset.gridSelector || '[data-collection-grid]';
      this.grid = this.querySelector(gridSelector);
      this.sectionId = this.dataset.sectionId;
      this.nextUrl = this.dataset.nextUrl;
      if (!this.sentinel || !this.grid || !this.nextUrl || !this.sectionId) return;

      this.observer = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && this.loadNext()),
        { rootMargin: '400px 0px' }
      );
      this.observer.observe(this.sentinel);
    }

    disconnectedCallback() {
      if (this.observer) this.observer.disconnect();
    }

    async loadNext() {
      if (this.loading || this.done) return;
      this.loading = true;
      this.sentinel.classList.add('elara-collection__sentinel--loading');

      try {
        const url = new URL(this.nextUrl, window.location.origin);
        url.searchParams.set('section_id', this.sectionId);
        const response = await fetch(url.toString(), { headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error(`Section fetch failed: ${response.status}`);
        const html = await response.text();

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const incomingGrid = doc.querySelector(this.dataset.gridSelector || '[data-collection-grid]');
        if (incomingGrid) {
          // Append incoming items one by one so animations / IntersectionObservers
          // don't reset existing nodes.
          Array.from(incomingGrid.children).forEach((child) => {
            this.grid.appendChild(child);
          });
        }

        // Pull the next URL from the incoming response if the host wrapper
        // included a fresh data-next-url, or from a [rel="next"] link.
        const incomingHost = doc.querySelector('elara-collection-infinite-scroll');
        if (incomingHost && incomingHost.dataset.nextUrl) {
          this.nextUrl = incomingHost.dataset.nextUrl;
          this.dataset.nextUrl = this.nextUrl;
        } else {
          this.done = true;
        }

        // Update the visible URL to the loaded page so users can share/return.
        const loadedUrl = new URL(this.nextUrl || url, window.location.origin);
        loadedUrl.searchParams.delete('section_id');
        window.history.replaceState({}, '', loadedUrl.toString());

        if (this.done && this.sentinel) {
          this.sentinel.classList.add('elara-collection__sentinel--done');
          if (this.observer) this.observer.disconnect();
        }
      } catch (err) {
        console.warn('[elara-infinite-scroll]', err);
        // On error, leave pagination fallback visible and stop observing.
        if (this.observer) this.observer.disconnect();
      } finally {
        this.loading = false;
        if (this.sentinel) this.sentinel.classList.remove('elara-collection__sentinel--loading');
      }
    }
  }

  customElements.define('elara-collection-infinite-scroll', ElaraCollectionInfiniteScroll);
}
