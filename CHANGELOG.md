# Changelog

All notable changes to Elara are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-05

Initial editorial-luxury release. Forked from Shopify Dawn 15.4.0 and
rebuilt for fashion and beauty brands.

### Foundations

- New `assets/elara-tokens.css` semantic token layer (colors, spacing,
  radius, motion, shadows) layered on top of Dawn's primitives so
  merchant color schemes and font pickers continue to drive everything.
- Editorial keyframes (`elaraFadeUp`, `elaraImageReveal`, `elaraMarquee`,
  `elaraKenBurns`) and overrides for Dawn's `--animation-slide-in` /
  `--animation-fade-in` for slower, more deliberate timing.
- Five editorial color schemes: Ivory & Ink, Champagne, Bone & Charcoal,
  Editorial Black, Bordeaux.
- Default font pairing swapped to Playfair Display + Inter (Shopify-hosted,
  Theme Store safe).
- New "Editorial" settings panel: motion intensity, image reveal toggle,
  view-transitions toggle, type pairing preset, density, accent color.
- Theme metadata renamed to Elara v1.0.0.
- Additive editorial typography classes (`.elara-display-xl/lg`,
  `.elara-h1`–`.elara-h6`, `.elara-eyebrow`, `.elara-body/-lg/-sm`,
  `.elara-caption`, `.elara-dropcap`).
- Button typography restyled (uppercase, 0.18em tracking, 1.2rem, weight
  500). New `.button--link` / `.elara-link` tertiary variant.
- Animation cascade delay 75ms → 120ms.

### Header & footer

- Header: `transparent_on_hero` + `hero_text_color` settings, new
  `promo_card` block type rendering image-rich mega-menu sections.
  `has-hero-template` body class emitted for known hero templates.
- Footer: new `brand_mark`, `concierge`, and `certifications` block types
  with polished CSS. Newsletter heading promoted to 4.8rem display serif.

### New sections

- `marquee` — kinetic text/logo strip; `<elara-marquee>` clones items at
  runtime for seamless looping, pauses on hover and reduced motion.
- `press-strip` — monochrome social-proof logos with optional pull quote.
- `editorial-story` — split image + narrative; image-left / image-right /
  image-overlay layouts; blocks for heading, paragraph, pull_quote, byline,
  link, caption.
- `lookbook-hotspot` — shop-the-look image with positioned product pins.
  `<elara-lookbook-hotspot>` handles popovers with focus return, viewport
  flip, mobile horizontal-scroll fallback.
- `sticky-scroll-story` — sticky media column + scrolling text steps;
  `<elara-sticky-scroller>` uses IntersectionObserver to crossfade media.
- `collection-tabs` — WAI-ARIA tabbed product carousels with roving
  tabindex and sliding underline indicator.
- `recently-viewed` — `<elara-recently-viewed>` reads handles from
  `localStorage`, pushes current handle on product pages, fetches each
  card via Section Rendering API.
- `cart-recommendations` — inline section at the bottom of the cart drawer.

### Product page

- Editorial sticky-gallery layout (`product--elara-sticky-media`) — gallery
  pins, info column scrolls.
- New block types: `accordion_group` (single stacked `<details>` with up
  to six panels), `complete_look` (horizontal scroller of editorial cards
  from `product.metafields.elara.complete_look`), `size_guide_drawer`
  (opens an `<elara-info-drawer>` with a Shopify page's content).
- Editorial swatches: 44px chips, refined hover/selected ring with 4px
  outline-offset, uppercase eyebrow option labels with active-value
  caption.

### Collection page

- Editorial toolbar with live product count + `<elara-density-toggle>` for
  3/4/6 column choice. Persists per visitor via `localStorage` and URL.
- `<elara-collection-infinite-scroll>` — IntersectionObserver sentinel
  fetching next page via Section Rendering API. Pagination snippet stays
  in DOM as no-JS / error fallback.
- Pill-style facet overrides via CSS (existing facets.js untouched).
- Active-filter chips bar restyled.

### Cart drawer

- Free-shipping progress bar (`<elara-progress-shipping-bar>`) subscribes
  to `cartUpdate` pub/sub, refreshes from `/cart.js`, animates width.
- Gift-note `<details>` accordion bound to `attributes[gift_note]` via a
  new `elara-cart-attribute.js` "save on blur" helper.
- Inline suggested products section.
- 480ms / 320ms luxury easing curve, 96px thumbnails (was 70px), serif
  16px line-item titles.

### Blog & article

- Editorial blog list (`elara_editorial_layout`): first article spans
  2×2 in the desktop grid (magazine hero), eyebrow + serif heading.
- Editorial article (`elara_editorial_layout`): eyebrow + serif display
  headline + meta row with date · author · reading-time (computed from
  word count ÷ 200 wpm). 64ch max-width prose, italic blockquote with
  hairline rule, drop-cap on the first paragraph.

### 404

- Full rewrite for editorial tone: eyebrow + serif display headline +
  body copy + dual CTAs.

### Templates

- New: `templates/page.lookbook.json`, `page.about.json`,
  `page.size-guide.json`, `product.fragrance.json`,
  `collection.editorial.json`, `index.editorial.json`, `index.minimal.json`.
- Updated: `templates/index.json` — new default editorial homepage
  composition.

### Shared snippets

- `editorial-eyebrow.liquid` — unified eyebrow caption with optional rule.
- `section-header.liquid` — eyebrow + heading + description + link cluster.
- `responsive-image.liquid` — img with srcset, sizes, explicit dimensions,
  configurable loading/fetchpriority.
- `card-product-editorial.liquid` — leaner card with portrait crop,
  vendor eyebrow, hover crossfade, right-aligned price.
- `info-drawer.liquid` — generic right-edge drawer with optional fetch.
- `free-shipping-bar.liquid` — progress bar markup.
- `lookbook-hotspot.liquid` — single positioned pin.
- `marquee-track.liquid` — seamless-loop track.

### Localisation

- New `sections.elara.*` namespace with strings for lookbook, sticky
  story, tabs, mega menu, product (complete-the-look heading, size guide
  label), recently_viewed, collection (density labels), cart (free
  shipping, gift note), article (reading time).
- `accessibility.drawer` key added.
- Refreshed 404 copy with eyebrow and "Return home" CTA.

### Accessibility

- `:focus-visible` outlines with 4px offset on every new interactive
  element (pins, tabs, swatches, density toggle, drawer close).
- ARIA tab pattern on collection-tabs with roving tabindex and
  arrow/Home/End navigation.
- ARIA `aria-pressed` on density toggle.
- Focus trap and focus restoration in `<elara-info-drawer>`.
- ESC closes any open lookbook popover, info drawer, or modal.
- `prefers-reduced-motion` honored across every animated surface.

### Performance

- All new images: explicit `width`/`height`, `srcset`, `sizes` attribute,
  lazy-loaded except above-fold hero.
- All new scripts: `defer` attribute, no inline JS.
- Cart drawer: free-shipping bar only loaded when threshold > 0.
- View Transitions: feature-detected, falls back silently.
- `prefers-reduced-motion`: all keyframes guarded.

### Docs

- Rewritten `README.md` for Elara branding and customization guide.
- New `docs/THEME_STORE_SUBMISSION.md` checklist.
- This changelog.
