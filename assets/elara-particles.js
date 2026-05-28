/**
 * Elara particle network background.
 *
 * Renders a canvas of softly-drifting dots connected by lines that
 * brighten when the cursor approaches. Used as an ambient hero
 * background or section accent.
 *
 * Markup:
 *   <div data-elara-particles
 *        data-elara-particles-density="50"    (optional, dots count)
 *        data-elara-particles-color="#ffffff" (optional, defaults to theme foreground)
 *        data-elara-particles-link-distance="140"
 *        data-elara-particles-speed="0.18">
 *   </div>
 *
 * The element should be sized via CSS (the canvas fills it). The script
 * inserts a <canvas> child and starts animating on connect.
 *
 * - Off on touch / coarse pointer when no cursor influence makes sense
 *   (the dots still drift but the cursor-attraction is disabled).
 * - Off when prefers-reduced-motion is set.
 * - Pauses when the host element scrolls out of viewport (IntersectionObserver).
 * - Pauses when the page is hidden (visibilitychange).
 */
(function () {
  if (window.__elaraParticlesReady) return;
  window.__elaraParticlesReady = true;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  class ParticleNetwork {
    constructor(host) {
      this.host = host;
      this.density = parseInt(host.dataset.elaraParticlesDensity, 10) || 60;
      this.color = host.dataset.elaraParticlesColor || null;
      this.linkDistance = parseInt(host.dataset.elaraParticlesLinkDistance, 10) || 140;
      this.speed = parseFloat(host.dataset.elaraParticlesSpeed) || 0.18;
      this.canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

      this.canvas = document.createElement('canvas');
      this.canvas.className = 'elara-particles__canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      this.host.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');

      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = 0;
      this.height = 0;
      this.particles = [];
      this.mouse = { x: -1000, y: -1000 };
      this.running = false;
      this.inView = false;

      this.resolveColor();
      this.resize();
      this.spawn();
      this.bindEvents();
      this.observeIntersection();
    }

    resolveColor() {
      if (this.color) {
        this.resolvedColor = this.color;
        return;
      }
      // Read --color-foreground (which is "r,g,b") off :root
      const root = getComputedStyle(document.documentElement);
      const fg = root.getPropertyValue('--color-foreground').trim();
      this.resolvedColor = fg ? `rgb(${fg})` : 'rgb(20,17,14)';
    }

    bindEvents() {
      this.handleResize = () => this.resize();
      window.addEventListener('resize', this.handleResize);

      if (this.canHover) {
        this.handleMove = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          this.mouse.x = (e.clientX - rect.left) * this.dpr;
          this.mouse.y = (e.clientY - rect.top) * this.dpr;
        };
        this.handleLeave = () => {
          this.mouse.x = -1000;
          this.mouse.y = -1000;
        };
        this.host.addEventListener('pointermove', this.handleMove);
        this.host.addEventListener('pointerleave', this.handleLeave);
      }

      this.handleVisibility = () => {
        if (document.hidden) this.stop();
        else if (this.inView) this.start();
      };
      document.addEventListener('visibilitychange', this.handleVisibility);
    }

    observeIntersection() {
      this.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          this.inView = entry.isIntersecting;
          if (entry.isIntersecting && !document.hidden) this.start();
          else this.stop();
        }
      });
      this.observer.observe(this.host);
    }

    resize() {
      const rect = this.host.getBoundingClientRect();
      this.width = Math.max(1, Math.floor(rect.width * this.dpr));
      this.height = Math.max(1, Math.floor(rect.height * this.dpr));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
      this.linkDistanceScaled = this.linkDistance * this.dpr;
    }

    spawn() {
      this.particles = [];
      // Scale particle count to viewport area so small sections don't get
      // overwhelmed and large ones still feel populated.
      const area = (this.width * this.height) / (this.dpr * this.dpr);
      const targetCount = Math.min(120, Math.max(20, Math.round((area / 18000) * (this.density / 60))));
      for (let i = 0; i < targetCount; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          vx: (Math.random() - 0.5) * this.speed * this.dpr,
          vy: (Math.random() - 0.5) * this.speed * this.dpr,
          r: (Math.random() * 1.6 + 0.6) * this.dpr,
        });
      }
    }

    start() {
      if (this.running || reduceMotion) {
        if (reduceMotion) this.drawStatic();
        return;
      }
      this.running = true;
      this.tick();
    }

    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    drawStatic() {
      // Reduced-motion: render once without animation.
      this.draw();
    }

    tick() {
      if (!this.running) return;
      this.step();
      this.draw();
      this.rafId = requestAnimationFrame(() => this.tick());
    }

    step() {
      for (const p of this.particles) {
        // Cursor influence: subtle attraction within link distance
        if (this.canHover) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const dist2 = dx * dx + dy * dy;
          const r2 = this.linkDistanceScaled * this.linkDistanceScaled * 4;
          if (dist2 < r2) {
            const f = (1 - dist2 / r2) * 0.02;
            p.vx += dx * f * 0.01;
            p.vy += dy * f * 0.01;
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // Soft velocity damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        // Floor velocity so dots don't entirely freeze
        const speedSq = p.vx * p.vx + p.vy * p.vy;
        const minSpeed = this.speed * 0.5 * this.dpr;
        if (speedSq < minSpeed * minSpeed) {
          p.vx += (Math.random() - 0.5) * this.speed * 0.5 * this.dpr;
          p.vy += (Math.random() - 0.5) * this.speed * 0.5 * this.dpr;
        }

        // Wrap-around edges
        if (p.x < -10) p.x = this.width + 10;
        if (p.x > this.width + 10) p.x = -10;
        if (p.y < -10) p.y = this.height + 10;
        if (p.y > this.height + 10) p.y = -10;
      }
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      // Draw connecting lines
      for (let i = 0; i < this.particles.length; i++) {
        const a = this.particles[i];
        for (let j = i + 1; j < this.particles.length; j++) {
          const b = this.particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > this.linkDistanceScaled) continue;
          const opacity = (1 - dist / this.linkDistanceScaled) * 0.35;
          ctx.strokeStyle = this.colorWithAlpha(opacity);
          ctx.lineWidth = 0.5 * this.dpr;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        // Cursor-to-particle line
        if (this.canHover) {
          const dxm = this.mouse.x - a.x;
          const dym = this.mouse.y - a.y;
          const dm = Math.sqrt(dxm * dxm + dym * dym);
          if (dm < this.linkDistanceScaled * 1.4) {
            const opacity = (1 - dm / (this.linkDistanceScaled * 1.4)) * 0.55;
            ctx.strokeStyle = this.colorWithAlpha(opacity);
            ctx.lineWidth = 0.7 * this.dpr;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(this.mouse.x, this.mouse.y);
            ctx.stroke();
          }
        }
      }

      // Draw dots
      ctx.fillStyle = this.colorWithAlpha(0.7);
      for (const p of this.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    colorWithAlpha(alpha) {
      // Accepts both rgb(r,g,b) and #rrggbb
      const c = this.resolvedColor;
      if (c.startsWith('rgb(')) {
        return c.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
      }
      if (c[0] === '#') {
        const hex = c.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
      }
      return c;
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this.handleResize);
      if (this.handleMove) this.host.removeEventListener('pointermove', this.handleMove);
      if (this.handleLeave) this.host.removeEventListener('pointerleave', this.handleLeave);
      document.removeEventListener('visibilitychange', this.handleVisibility);
      if (this.observer) this.observer.disconnect();
      this.canvas.remove();
    }
  }

  function init(root) {
    (root || document).querySelectorAll('[data-elara-particles]').forEach((el) => {
      if (el.__elaraParticles) return;
      el.__elaraParticles = new ParticleNetwork(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  const mo = new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return;
        if (n.matches?.('[data-elara-particles]')) init(n.parentNode);
        else init(n);
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
