/**
 * <elara-tabbed-carousel> — accessible tab/tabpanel pattern.
 *
 * Behavior:
 *   - Implements WAI-ARIA Authoring Practices tab pattern with roving tabindex:
 *     ArrowLeft / ArrowRight move focus between tabs, Home / End jump to the
 *     first / last tab, Enter / Space activate the focused tab.
 *   - Updates the sliding underline indicator (.elara-tabs__indicator) by
 *     measuring the active tab's offsetLeft and width and writing CSS custom
 *     properties --tab-indicator-left and --tab-indicator-width on the
 *     tablist.
 *   - Re-measures on resize via ResizeObserver to keep the indicator aligned
 *     when type loads or fonts swap.
 */
if (!customElements.get('elara-tabbed-carousel')) {
  class ElaraTabbedCarousel extends HTMLElement {
    constructor() {
      super();
      this.tabs = [];
      this.panels = [];
      this.tablist = null;
      this.activeIndex = 0;
      this.resizeObserver = null;
      this.handleTabClick = this.handleTabClick.bind(this);
      this.handleTabKeydown = this.handleTabKeydown.bind(this);
    }

    connectedCallback() {
      this.tablist = this.querySelector('[role="tablist"]');
      this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
      this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
      if (!this.tabs.length || !this.panels.length) return;

      this.tabs.forEach((tab) => {
        tab.addEventListener('click', this.handleTabClick);
        tab.addEventListener('keydown', this.handleTabKeydown);
      });

      this.activeIndex = this.tabs.findIndex((tab) => tab.classList.contains('elara-tabs__tab--active'));
      if (this.activeIndex < 0) this.activeIndex = 0;

      this.updateIndicator();

      if (typeof ResizeObserver === 'function') {
        this.resizeObserver = new ResizeObserver(() => this.updateIndicator());
        this.resizeObserver.observe(this.tablist);
      }
    }

    disconnectedCallback() {
      this.tabs.forEach((tab) => {
        tab.removeEventListener('click', this.handleTabClick);
        tab.removeEventListener('keydown', this.handleTabKeydown);
      });
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    handleTabClick(event) {
      const tab = event.currentTarget;
      const index = this.tabs.indexOf(tab);
      if (index !== -1) this.activate(index, { focus: false });
    }

    handleTabKeydown(event) {
      let target = this.activeIndex;
      switch (event.key) {
        case 'ArrowRight':
          target = (this.activeIndex + 1) % this.tabs.length;
          break;
        case 'ArrowLeft':
          target = (this.activeIndex - 1 + this.tabs.length) % this.tabs.length;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = this.tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          target = this.tabs.indexOf(event.currentTarget);
          break;
        default:
          return;
      }
      event.preventDefault();
      this.activate(target, { focus: true });
    }

    activate(index, { focus }) {
      if (index === this.activeIndex || index < 0 || index >= this.tabs.length) {
        if (focus) this.tabs[index]?.focus();
        return;
      }
      this.tabs.forEach((tab, i) => {
        const isActive = i === index;
        tab.setAttribute('aria-selected', String(isActive));
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
        tab.classList.toggle('elara-tabs__tab--active', isActive);
      });
      this.panels.forEach((panel, i) => {
        const isActive = i === index;
        panel.hidden = !isActive;
        panel.classList.toggle('elara-tabs__panel--active', isActive);
      });
      this.activeIndex = index;
      if (focus) this.tabs[index].focus();
      this.updateIndicator();
    }

    updateIndicator() {
      if (!this.tablist) return;
      const activeTab = this.tabs[this.activeIndex];
      if (!activeTab) return;
      const tabRect = activeTab.getBoundingClientRect();
      const listRect = this.tablist.getBoundingClientRect();
      const left = tabRect.left - listRect.left;
      this.tablist.style.setProperty('--tab-indicator-left', `${left}px`);
      this.tablist.style.setProperty('--tab-indicator-width', `${tabRect.width}px`);
    }
  }

  customElements.define('elara-tabbed-carousel', ElaraTabbedCarousel);
}
