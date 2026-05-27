# Theme Store submission checklist

Elara is built to the Shopify Theme Store bar. This checklist tracks what
must be true before submission and where Elara currently stands.

## 1. Substantively different from Dawn

> **Theme Store rule:** "Themes submitted to the Theme Store must offer
> functionality or design that is substantively different from Dawn."

**Status:** ✅ Done. Ten reviewer-visible differences from Dawn, each
verifiable in under 30 seconds on the demo store:

1. New homepage default composition (hero → marquee → editorial story →
   lookbook hotspot → ...).
2. Image-rich mega-menu with promo cards.
3. Transparent-on-hero header with scroll inversion.
4. Sticky-gallery product page with scrolling info column.
5. **New section:** `lookbook-hotspot` (shop-the-look pins).
6. **New section:** `editorial-story` (split narrative).
7. **New section:** `marquee` (kinetic strip).
8. **New section:** `sticky-scroll-story` (sticky media + scrolling steps).
9. **New section:** `press-strip` (social proof).
10. Editorial product blocks: `accordion_group`, `complete_look`,
    `size_guide_drawer`. Premium cart drawer with free-shipping bar.

Plus: editorial blog/article layout, density toggle on collection grid,
five new templates.

## 2. Performance

> **Theme Store rule:** Lighthouse performance score ≥ 60 on mobile across
> home, product, collection. SEO ≥ 60. Best practices ≥ 80.

**Status:** ⏳ Run Lighthouse against your dev store. Optimization
guardrails already in place:

- All new images use `responsive-image.liquid` (or equivalent inline
  `image_tag` with `widths`, `sizes`, intrinsic `width`/`height`,
  `loading="lazy"` except hero, `fetchpriority="high"` on hero).
- All new scripts use `defer="defer"`.
- Free-shipping bar JS only loads when threshold > 0.
- View Transitions API behind a feature check.
- No external script CDNs (Dawn's `model-viewer-ui` is the sanctioned
  exception).
- Conditional CSS loading per section.

**Action items before submission:**

- [ ] Run mobile + desktop Lighthouse against your published preview URL
      on the 7 key pages (home, product, collection, cart, search, blog,
      article).
- [ ] Document scores in `docs/lighthouse-baseline.md`.
- [ ] If any score drops below the target, profile the regressing page
      and trim unused CSS/JS.

## 3. Accessibility

> **Theme Store rule:** Lighthouse accessibility ≥ 90. WCAG 2.1 AA
> compliance. Keyboard navigation must work end-to-end.

**Status:** ⏳ Manual axe DevTools sweep required. Compliance guardrails
in place:

- All interactive new elements have `:focus-visible` with 2px outline +
  4px offset using the accent color.
- WAI-ARIA tab pattern on `collection-tabs` (roving tabindex,
  ArrowLeft/Right, Home/End).
- `aria-pressed` on density toggle.
- Focus trap and focus restoration in `<elara-info-drawer>`.
- ESC closes lookbook popovers, info drawers, modals.
- `prefers-reduced-motion` guards on every animated surface.
- All decorative SVGs `aria-hidden="true"`.
- Skip link present (inherited from Dawn).

**Action items before submission:**

- [ ] Run axe DevTools on the 7 key pages. Resolve all critical and
      serious issues.
- [ ] Keyboard-only walkthrough: Tab from skip link → mega-menu → product
      page → cart drawer → checkout button without losing focus or hitting
      a trap.
- [ ] VoiceOver (macOS Safari) smoke test of home + PDP.
- [ ] Contrast audit each of the five color schemes at small + large
      text sizes.

## 4. Internationalisation

> **Theme Store rule:** All visible strings translated. Theme ships with
> the standard locale files Shopify auto-translates at submission.

**Status:** ✅ Done for English. All new storefront strings keyed under
`sections.elara.*` and `accessibility.*` in
`locales/en.default.json`. Schema strings in section files are hardcoded
English — Shopify Theme Store accepts this and runs machine translation
at submission time, but you may pre-translate to `en.default.schema.json`
for better reviewer experience.

**Action items before submission:**

- [ ] Confirm no hardcoded English in `.liquid` storefront markup
      (`grep -rn ">[A-Z]" sections/ snippets/ --include="*.liquid"`).
- [ ] Switch locale to fr, ja, ar and spot-check rendering — no string
      overflow in buttons/cards, RTL flips correctly in Arabic.
- [ ] (Optional) Add Elara strings to `en.default.schema.json` for
      editor-side translation parity.

## 5. External dependencies

> **Theme Store rule:** No external script CDNs except Shopify-sanctioned
> (model-viewer-ui).

**Status:** ✅ Done. All new JS is vanilla `customElements.define` in
`assets/`. No CDN scripts added. Verified by:

```bash
grep -rn "cdn\.\|googleapis\|jsdelivr\|unpkg" sections/ snippets/ assets/ \
  --include="*.liquid" --include="*.js" --include="*.css"
```

Only result: Shopify's own `cdn.shopify.com` (via `image_url`) and
`fonts.shopifycdn.com` (preconnected in `layout/theme.liquid`).

## 6. Settings & demo content

> **Theme Store rule:** A freshly installed theme on a blank store
> should render coherent placeholders.

**Status:** ✅ Mostly done. `config/settings_data.json` ships with
sensible defaults (5 color schemes, fonts, all Elara editorial settings,
cart drawer enabled by default).

**Action items before submission:**

- [ ] Populate a demo store with placeholder products, collections,
      pages, and a journal blog so each template has content.
- [ ] Add real images for image-banner heroes, lookbook hotspots,
      mega-menu promo cards.
- [ ] Capture screenshots:
  - 1280×800 desktop home, collection, product, cart, blog
  - 375×667 mobile home, collection, product
  - Theme settings panel (Editorial section)

## 7. Schema requirements

- [x] Every new section has `presets`.
- [x] Every new section declares `enabled_on` where appropriate (e.g.
      `recently-viewed` enabled on product/collection/index/search).
- [x] `max_blocks` set on sections with block limits.
- [x] Settings have `info` strings where non-obvious.

## 8. Browser support

- [x] Modern evergreen browsers (Chrome, Firefox, Safari, Edge —
      current and previous major).
- [x] Mobile Safari (iOS) and mobile Chrome (Android).
- [x] Progressive enhancement: View Transitions, `:has()`, View Transition
      navigation all behind feature checks.

## 9. Off-brand icons (deferred)

Dawn ships with a set of grocery / food / laundry icons (banana, carrot,
bottle, leaf, dairy, dryer, iron, lipstick, etc.) referenced from the
`collapsible_tab` block icon picker. They're off-brand for an editorial
fashion/beauty theme.

**Current decision:** Keep the files and dropdown options to avoid
breaking merchants who customise around them. Recommend editorial fashion
merchants pick the `none`, `clipboard`, `box`, `truck`, `heart`,
`lock`, `check_mark`, or `chat_bubble` options.

**Future work (v1.1):** Curate a fashion-specific icon picker subset and
expose the wider list behind an advanced toggle.

## 10. Final pre-submission

- [ ] `shopify theme check` passes with 0 errors. Document any intentional
      warnings.
- [ ] `shopify theme push --unpublished` to a clean dev store; walk every
      template in the editor.
- [ ] Lighthouse CI against the unpublished preview URL.
- [ ] Bump version in `config/settings_schema.json` if needed.
- [ ] Tag the release: `git tag v1.0.0 && git push origin v1.0.0`.
- [ ] Submit through the [Shopify Partner Dashboard](https://partners.shopify.com/).
