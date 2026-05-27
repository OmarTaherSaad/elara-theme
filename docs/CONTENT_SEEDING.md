# Seeding demo content via Custom App API

This guide walks through standing up demo content in a Shopify store
using `scripts/seed-content.mjs`.

The script creates:

- **1 metafield definition** — `elara.complete_look` (List of products) on
  Product, pinned to the product page editor.
- **6 demo products** — coats, trousers, knit, tote, dress, fragrance.
- **3 collections** — Latest arrivals, Wardrobe essentials, The edit.
- **5 pages** — About, Lookbook, Size guide, Contact, Concierge.
- **1 blog (Journal)** with 3 placeholder articles.

It's idempotent: re-running won't duplicate handles that already exist.

## 1. Create a Custom App and get an admin API access token

In your store admin (`https://<store>.myshopify.com/admin`):

1. **Settings → Apps and sales channels → Develop apps**.
   - If "Develop apps" isn't visible, click **Allow custom app development**
     and accept the warning.
2. Click **Create an app**, name it `Elara Seeder`, set yourself as the
   developer.
3. **Configuration → Admin API integration → Configure**. Grant these scopes:
   - `write_products`
   - `read_products`
   - `write_publications`
   - `read_publications`
   - `write_inventory`
   - `write_files`
   - `read_files`
   - `write_content` *(for pages, blogs, articles)*
   - `read_content`
   - `write_metaobject_definitions`
   - `read_metaobject_definitions`
4. Save the config. Click **API credentials → Install app → Install**.
5. Reveal the **Admin API access token** (it begins with `shpat_`).
   Copy it. **You can only view this once.**

## 2. Run the seeder

From the repo root:

```bash
# Dry-run first to confirm what would happen
ADMIN_TOKEN=shpat_xxxxx STORE=ots-store1 node scripts/seed-content.mjs --dry

# Then the real run
ADMIN_TOKEN=shpat_xxxxx STORE=ots-store1 node scripts/seed-content.mjs
```

On Windows PowerShell:

```powershell
$env:ADMIN_TOKEN = "shpat_xxxxx"
$env:STORE = "ots-store1"
node scripts/seed-content.mjs
```

You'll see step-by-step output:

```
Elara content seeder → ots-store1.myshopify.com

→ Metafield definition: elara.complete_look
  ✓ elara.complete_look created and pinned

→ Products: creating 6 demo items
  ✓ Oversized wool coat
  ✓ Wide-leg trouser
  ...

→ Collections: creating 3
  ✓ Latest arrivals
  ✓   added 3 products to latest-arrivals
  ...

→ Pages: creating 5
  ✓ About
  ...

→ Blog: journal + 3 articles
  ✓ Blog "journal"
  ✓ Inside the atelier
  ...

✓ Done. Next steps:
  1. Upload product images via the admin...
  2. Set page templates in admin...
  3. Populate the elara.complete_look metafield...
```

## 3. Post-seed manual steps in the admin

The API will create the records but a few things need a manual touch:

### Product images

The seeder doesn't ship binary images. Upload product photography in
**Products → [product] → Media**. Drag in 2-4 images per product, set the
primary one as the featured media. The card-product-editorial hover
reveal needs at least 2 images.

### Page templates

Each new page defaults to the standard `page` template. Assign the
Elara-specific templates:

- `/pages/about` → **Online Store → Template** picker → `page.about`
- `/pages/lookbook` → `page.lookbook`
- `/pages/size-guide` → `page.size-guide`

(`Contact` stays on `page.contact`; `Concierge` stays on `page`.)

### Complete-the-look metafield

On any product, scroll to **Metafields → Elara: Complete the look** and
add 3-4 related products. The product page's `complete_look` block will
populate from this metafield (with a fallback collection if empty).

### Featured-collection setting on homepage

In the **Theme editor**, point each `featured-collection` section at one
of the new collections (Latest arrivals, Wardrobe essentials, The edit).

### Editorial collection variant

Assign a collection to the `collection.editorial` template:
**Collections → [collection] → Online Store → Template** → pick
`collection.editorial`. This unlocks the banner + editorial story + grid
layout.

## 4. Cleanup (optional)

If you need to undo and start over, you can delete by handle through the
admin or extend the seeder with deletion mutations. Test stores are
cheap — usually quicker to spin up a fresh dev store and re-run.

## Troubleshooting

- **`GraphQL request failed: Access denied`** — the token doesn't have
  the required scopes. Go back to the Custom App config, add the
  missing scope, reinstall, and grab a new token.
- **Products created but variant price didn't set** — the seeder
  attempts a follow-up `productVariantsBulkUpdate`. Check the script
  output for warnings.
- **Duplicate handle errors** — the script checks for existing handles
  but Shopify caches can lag. Re-running usually resolves.
- **API version drift** — the script targets `2025-01`. If Shopify
  deprecates fields, bump the version string in `ENDPOINT` and re-test.
