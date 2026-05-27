/**
 * <elara-lookbook-hotspot> — interactive shop-the-look image with positioned
 * product pins and accessible popovers.
 *
 * Behavior:
 *   - Reveal mode "click": pin acts as toggle (default).
 *   - Reveal mode "hover": pin shows popover on pointerenter / focus, hides on
 *     pointerleave (with a small grace delay so users can move to the popover).
 *   - Escape key closes any open popover and returns focus to the originating
 *     pin. Outside-click closes too.
 *   - Only one popover open at a time.
 *   - Popovers are positioned relative to their pin; flips to the opposite
 *     side if it would overflow the stage.
 *   - Below 750px viewport, pins still toggle popovers but the popover is
 *     constrained to bottom of the stage; the mobile product list below also
 *     functions as a primary entry point.
 */
if (!customElements.get('elara-lookbook-hotspot')) {
  class ElaraLookbookHotspot extends HTMLElement {
    constructor() {
      super();
      this.stage = null;
      this.pins = [];
      this.openPin = null;
      this.openPopover = null;
      this.hoverTimer = null;
      this.handleDocumentClick = this.handleDocumentClick.bind(this);
      this.handleKeydown = this.handleKeydown.bind(this);
    }

    connectedCallback() {
      this.stage = this.querySelector('.elara-lookbook__stage');
      this.pins = Array.from(this.querySelectorAll('.elara-lookbook__pin'));
      if (!this.stage || !this.pins.length) return;

      this.revealMode = this.dataset.revealMode || 'click';

      this.pins.forEach((pin) => this.bindPin(pin));
      this.querySelectorAll('.elara-lookbook__popover-close').forEach((btn) => {
        btn.addEventListener('click', () => this.closeOpen({ restoreFocus: true }));
      });

      document.addEventListener('click', this.handleDocumentClick);
      document.addEventListener('keydown', this.handleKeydown);
    }

    disconnectedCallback() {
      document.removeEventListener('click', this.handleDocumentClick);
      document.removeEventListener('keydown', this.handleKeydown);
      this.clearHoverTimer();
    }

    bindPin(pin) {
      const popover = this.getPopoverFor(pin);
      if (!popover) return;

      pin.addEventListener('click', (event) => {
        event.stopPropagation();
        if (this.openPin === pin) {
          this.closeOpen({ restoreFocus: false });
        } else {
          this.openFor(pin);
        }
      });

      if (this.revealMode === 'hover' && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        pin.addEventListener('pointerenter', () => {
          this.clearHoverTimer();
          this.openFor(pin);
        });
        pin.addEventListener('pointerleave', () => this.scheduleClose());
        popover.addEventListener('pointerenter', () => this.clearHoverTimer());
        popover.addEventListener('pointerleave', () => this.scheduleClose());
      }

      pin.addEventListener('focus', () => this.openFor(pin));
    }

    getPopoverFor(pin) {
      const id = pin.getAttribute('aria-controls');
      return id ? this.querySelector('#' + CSS.escape(id)) : null;
    }

    openFor(pin) {
      if (this.openPin === pin) return;
      this.closeOpen({ restoreFocus: false });
      const popover = this.getPopoverFor(pin);
      if (!popover) return;

      pin.setAttribute('aria-expanded', 'true');
      pin.classList.add('elara-lookbook__pin--active');
      popover.hidden = false;
      popover.classList.add('elara-lookbook__popover--open');
      this.positionPopover(pin, popover);
      this.openPin = pin;
      this.openPopover = popover;
    }

    closeOpen({ restoreFocus }) {
      if (!this.openPin) return;
      this.openPin.setAttribute('aria-expanded', 'false');
      this.openPin.classList.remove('elara-lookbook__pin--active');
      this.openPopover.hidden = true;
      this.openPopover.classList.remove('elara-lookbook__popover--open');
      const pinToFocus = this.openPin;
      this.openPin = null;
      this.openPopover = null;
      if (restoreFocus) pinToFocus.focus();
    }

    positionPopover(pin, popover) {
      const stageRect = this.stage.getBoundingClientRect();
      const pinRect = pin.getBoundingClientRect();
      const relX = pinRect.left - stageRect.left + pinRect.width / 2;
      const relY = pinRect.top - stageRect.top + pinRect.height / 2;
      const stageWidth = stageRect.width;

      popover.style.left = `${relX}px`;
      popover.style.top = `${relY}px`;

      popover.classList.remove(
        'elara-lookbook__popover--right',
        'elara-lookbook__popover--left',
        'elara-lookbook__popover--up',
        'elara-lookbook__popover--down'
      );

      const popoverWidth = popover.offsetWidth;
      const popoverHeight = popover.offsetHeight;

      const horizontalSide = relX + popoverWidth + 24 > stageWidth ? 'left' : 'right';
      const verticalSide = relY + popoverHeight + 24 > stageRect.height ? 'up' : 'down';
      popover.classList.add(`elara-lookbook__popover--${horizontalSide}`);
      popover.classList.add(`elara-lookbook__popover--${verticalSide}`);
    }

    scheduleClose() {
      this.clearHoverTimer();
      this.hoverTimer = window.setTimeout(() => {
        this.closeOpen({ restoreFocus: false });
      }, 180);
    }

    clearHoverTimer() {
      if (this.hoverTimer) {
        window.clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    }

    handleDocumentClick(event) {
      if (!this.openPin) return;
      if (this.contains(event.target)) return;
      this.closeOpen({ restoreFocus: false });
    }

    handleKeydown(event) {
      if (event.key !== 'Escape') return;
      if (!this.openPin) return;
      this.closeOpen({ restoreFocus: true });
    }
  }

  customElements.define('elara-lookbook-hotspot', ElaraLookbookHotspot);
}
