# Elara

An editorial-luxury Shopify theme. Built on Dawn 15.4.0, rebuilt for fashion
and beauty brands that want their storefront to read like a magazine.

> **Status:** v1.0.0 — feature-complete editorial theme. Theme Store
> submission-ready pending demo store population and screenshots.

---

## What's different from Dawn

Elara is "substantively different" from Dawn in ten visible ways. Each is
verifiable in under 30 seconds on the demo store:

1. **New homepage default** — slow-zoom hero → kinetic marquee → editorial
   story → lookbook with shop-the-look pins → curated grids.
2. **Image-rich mega-menu** — link lists on the left, an editorial promo
   card per parent menu item on the right.
3. **Transparent-on-hero header** with scroll-state inversion.
4. **Sticky-gallery product page** with scrolling info column.
5. **Six new section types** that Dawn doesn't have:
   - `lookbook-hotspot` — image with positioned product pins, hover/click
     popovers, mobile carousel fallback.
   - `editorial-story` — split image + narrative; image-left, image-right,
     or image-overlay layouts.
   - `marquee` — kinetic text/logo strip; pauses on hover and reduced motion.
   - `sticky-scroll-story` — sticky media column that crossfades as the
     reader scrolls through paired text steps.
   - `press-strip` — monochrome social-proof logos with optional pull quote.
   - `collection-tabs` — tabbed product carousels with WAI-ARIA tab pattern
     and sliding underline indicator.
6. **Editorial product blocks** — `accordion_group` (single stacked
   `<details>` group with up to six panels), `complete_look` (horizontal
   scroller from `product.metafields.elara.complete_look`), `size_guide_drawer`.
7. **Collection grid overhaul** — density toggle (3/4/6 cols), pill-style
   facets, hover crossfade to secondary image, optional infinite scroll.
8. **Premium cart drawer** — free-shipping progress bar, gift-note accordion
   bound to a cart attribute, suggested products, larger thumbnails, luxury
   easing curve.
9. **Magazine blog & article** — hero post spans 2×2 in the editorial blog
   grid; article gets serif display headline, meta row with reading time,
   drop-cap on the first paragraph.
10. **Five new templates** — `page.lookbook`, `page.about`, `page.size-guide`,
    `product.fragrance`, `collection.editorial`, plus alternate homepage
    presets (`index.editorial`, `index.minimal`).

## Design system

- **Tokens** in `assets/elara-tokens.css` — semantic color, spacing (8pt),
  radius, motion, shadow tokens derived from Dawn's primitives so merchant
  color schemes and font pickers continue to drive everything.
- **Typography** — additive `.elara-display-xl/lg`, `.elara-h1`–`.elara-h6`,
  `.elara-eyebrow`, `.elara-body/-lg/-sm`, `.elara-caption`, `.elara-dropcap`
  utility classes. Default font pairing: **Playfair Display + Inter**
  (Shopify-hosted, Theme Store safe).
- **Color schemes** — five editorial defaults: Ivory & Ink, Champagne,
  Bone & Charcoal, Editorial Black, Bordeaux.
- **Motion** — editorial fade-up keyframes, 120ms cascade delay (slower
  than Dawn's 75ms), `prefers-reduced-motion` guards on every animated
  surface.
- **Custom elements (vanilla JS)** — `<elara-marquee>`, `<elara-lookbook-hotspot>`,
  `<elara-sticky-scroller>`, `<elara-tabbed-carousel>`, `<elara-info-drawer>`,
  `<elara-recently-viewed>`, `<elara-density-toggle>`,
  `<elara-collection-infinite-scroll>`, `<elara-progress-shipping-bar>`.
  All defer-loaded, no external dependencies, integrate with Dawn's
  existing `pubsub.js` events.

## Getting started

### Local development

```bash
# Shopify CLI required
shopify theme dev --store=<your-dev-store>
```

The CLI watches every file and live-reloads the editor. All theme settings
are exposed through the merchant editor — no code changes needed for
day-to-day customization.

### Installing on a store

Upload as an unpublished theme:

```bash
shopify theme push --unpublished
```

Or download the zip from the GitHub Releases page and upload via
**Online Store → Themes → Add theme**.

### Pulling Dawn updates

Elara is layered on top of Dawn's primitives — Dawn updates can be pulled in
without breaking Elara's design layer:

```bash
git remote add upstream https://github.com/Shopify/dawn.git
git fetch upstream
git merge upstream/main
```

You may need to resolve conflicts in `layout/theme.liquid`, `assets/base.css`,
and `sections/main-product.liquid` — the three files Elara modifies most.

## Theme customization

### Editorial settings panel

In the merchant editor under **Theme settings → Editorial**:

- **Motion intensity** — subtle / balanced / rich
- **Animated image reveal on scroll** — toggle clip-path reveal
- **Page transitions** — toggle the View Transitions API
- **Typography pairing preset** — Playfair + Inter, Cormorant + Montserrat,
  Libre Caslon + Work Sans, or Custom
- **Section spacing density** — editorial (most whitespace) / balanced /
  compact
- **Accent color** — used for highlights, badges, and link hover

### Cart enhancements

Under **Theme settings → Cart**:

- **Free shipping threshold** (in cents — e.g. `10000` for $100.00)
- **Show gift-note accordion** in cart drawer
- **Show suggested products** in cart drawer (pairs with the existing
  Cart drawer collection setting)

### Per-section settings

Each editorial section ships with presets and merchant-editable settings.
Notable per-section toggles:

- **Header** — `transparent_on_hero` overlay mode with scroll inversion;
  `promo_card` blocks render in the mega-menu under the parent menu item
  whose title matches `parent_menu_item`.
- **Collection grid** — `elara_card_style` (default | editorial),
  `elara_density_toggle` (3/4/6 col), `elara_pagination_mode` (paginate |
  infinite).
- **Product page** — `elara_sticky_media` (default on) pins gallery while
  info scrolls.
- **Blog list** — `elara_editorial_layout` makes the first post a 2×2
  hero card.
- **Article** — `elara_editorial_layout` adds eyebrow, serif display
  headline, meta row with reading time, drop-cap.

### Recommended metafields

For the **Complete the look** product block, define a metafield:

- **Namespace and key:** `elara.complete_look`
- **Type:** Product (list)
- **Pin to product page:** yes

The block renders the linked products in a horizontal-scroll editorial
card carousel. Falls back to a section-level collection if the metafield
is empty.

## Architecture principles

- **Layered, not replaced.** Dawn's tokens, components, and JS plumbing are
  intact. Elara adds a semantic `--elara-*` token layer on top so merchant
  color/font/spacing settings still drive everything.
- **Vanilla everywhere.** No bundler, no framework, no external CDN
  scripts. All custom elements are classic-script `customElements.define`
  blocks behind feature checks.
- **HTML-first, JS as enhancement.** Sections render meaningful content
  server-side; custom elements upgrade them on connect. Pagination,
  drawer triggers, and recently-viewed all degrade gracefully without JS.
- **Section Rendering API.** Cart updates, recently-viewed cards, info
  drawer content, and infinite scroll all use Shopify's section rendering
  endpoint — no API calls, no JSON marshalling outside of cart.js.
- **`prefers-reduced-motion` honored** on every animated surface.

## Browser support

Modern evergreen browsers per Dawn's contract: Chrome, Firefox, Safari, Edge
on current and previous major versions. Progressive enhancement for newer
features:

- **View Transitions API** — used when available, falls back silently
- **`:has()` pseudo-class** — used in facet pill styles; falls back to less
  refined visuals in older Safari
- **`aspect-ratio` CSS** — used widely; very wide browser support, no
  fallback needed

## License

Elara is a fork of [Shopify Dawn](https://github.com/Shopify/dawn).
The Dawn portions remain under their original license (see `LICENSE.md`).
Elara additions are © 2026 Omar Taher Saad; all rights reserved.

## Contributing & support

This is a private theme under active development. Issues and feature
requests are tracked in the GitHub repository.

For client implementations and customization work, contact the author
through GitHub.
