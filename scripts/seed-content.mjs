#!/usr/bin/env node
/**
 * Elara demo content seeder.
 *
 * Creates editorial fashion demo content in a Shopify store via the Admin
 * GraphQL API:
 *   - 1 metafield definition: elara.complete_look (List of products) on Product
 *   - 6 products with placeholder images, prices, vendor, type, tags
 *   - 3 collections (Latest arrivals, Wardrobe essentials, The Edit)
 *   - 5 pages (About, Lookbook, Size guide, Contact, Concierge)
 *   - 1 blog (Journal) with 3 articles
 *
 * Usage:
 *   ADMIN_TOKEN=shpat_xxx STORE=ots-store1 node scripts/seed-content.mjs
 *
 * Or via CLI flags:
 *   node scripts/seed-content.mjs --token=shpat_xxx --store=ots-store1
 *
 * Required Custom App scopes:
 *   write_products, write_publications, write_inventory, write_files,
 *   write_content, write_metaobject_definitions
 *
 * Safe to re-run: every operation checks for existing handles first and
 * skips creates that would duplicate.
 */

import process from 'node:process';

// --------- argv parsing ---------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.length ? rest.join('=') : true];
  })
);
const TOKEN = args.token || process.env.ADMIN_TOKEN;
const STORE = args.store || process.env.STORE || 'ots-store1';
const DRY = args.dry === true || args.dry === 'true';

if (!TOKEN) {
  console.error('ERROR: missing admin API token.');
  console.error('Pass via --token=shpat_xxx or set ADMIN_TOKEN env var.');
  process.exit(1);
}

const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/2025-01/graphql.json`;

// --------- thin GraphQL client ---------
async function gql(query, variables = {}) {
  if (DRY) {
    console.log('[DRY-RUN]', query.trim().split('\n')[0].slice(0, 80));
    return { data: {} };
  }
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(`GraphQL request failed: ${json.errors[0]?.message || 'unknown'}`);
  }
  return json;
}

// Pretty step logger.
const step = (msg) => console.log(`\n→ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const skip = (msg) => console.log(`  · ${msg} (skipped, already exists)`);
const warn = (msg) => console.log(`  ! ${msg}`);

// =====================================================================
// 1. Metafield definition: elara.complete_look (Product → list of products)
// =====================================================================
async function ensureCompleteLookMetafield() {
  step('Metafield definition: elara.complete_look');

  // Check if it already exists
  const check = await gql(
    `
    query checkDef {
      metafieldDefinitions(first: 5, ownerType: PRODUCT, namespace: "elara", key: "complete_look") {
        edges { node { id name } }
      }
    }
  `
  );

  if (check.data.metafieldDefinitions.edges.length > 0) {
    skip('elara.complete_look definition');
    return check.data.metafieldDefinitions.edges[0].node.id;
  }

  const result = await gql(
    `
    mutation createDef($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id name }
        userErrors { field message }
      }
    }
  `,
    {
      definition: {
        namespace: 'elara',
        key: 'complete_look',
        name: 'Complete the look',
        description: 'Products that complete this product as a styled look.',
        type: 'list.product_reference',
        ownerType: 'PRODUCT',
        pin: true,
      },
    }
  );

  const errors = result.data.metafieldDefinitionCreate.userErrors;
  if (errors.length) {
    warn(`metafield create returned: ${errors.map((e) => e.message).join(', ')}`);
    return null;
  }
  ok('elara.complete_look created and pinned');
  return result.data.metafieldDefinitionCreate.createdDefinition.id;
}

// =====================================================================
// 2. Sample products
// =====================================================================
// Image URLs use Unsplash's public photo IDs. They're free for commercial
// use under the Unsplash License. We pass two per product (primary +
// secondary) so the editorial card's hover crossfade works.
const PRODUCTS = [
  {
    handle: 'oversized-wool-coat',
    title: 'Oversized wool coat',
    vendor: 'Atelier 02',
    productType: 'Outerwear',
    tags: ['New', 'Outerwear', 'Wool'],
    price: 695,
    description:
      '<p>A relaxed, oversized silhouette in 100% Italian wool. Drop-shouldered, single-breasted, with hand-stitched horn buttons.</p><p>Cut in a small atelier in Lisbon and pre-conditioned to drape from the first wear.</p>',
    images: [
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1600&q=85',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1600&q=85',
    ],
  },
  {
    handle: 'wide-leg-trouser',
    title: 'Wide-leg trouser',
    vendor: 'Atelier 02',
    productType: 'Bottoms',
    tags: ['Essentials', 'Trousers'],
    price: 290,
    description:
      '<p>A studio staple. High-rise wide-leg in heavy linen, side-pocketed, with a tonal grosgrain inner waistband.</p>',
    images: [
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=1600&q=85',
      'https://images.unsplash.com/photo-1604176354204-9268737828e4?w=1600&q=85',
    ],
  },
  {
    handle: 'merino-roll-neck',
    title: 'Merino roll-neck',
    vendor: 'Atelier 02',
    productType: 'Knitwear',
    tags: ['Essentials', 'Knitwear'],
    price: 245,
    description:
      '<p>The studio roll-neck. Extra-fine 19.5-micron merino, fully-fashioned, in a fit that sits close without binding.</p>',
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=1600&q=85',
      'https://images.unsplash.com/photo-1601762603339-fd61e28b698a?w=1600&q=85',
    ],
  },
  {
    handle: 'leather-tote-no-04',
    title: 'Leather tote No. 04',
    vendor: 'Atelier 02',
    productType: 'Accessories',
    tags: ['New', 'Leather', 'Accessories'],
    price: 595,
    description:
      '<p>Cut from a single full-grain hide, hand-stitched at the seam, lined in soft suede. The bag we use every day.</p>',
    images: [
      'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=1600&q=85',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=1600&q=85',
    ],
  },
  {
    handle: 'silk-slip-dress',
    title: 'Silk slip dress',
    vendor: 'Atelier 02',
    productType: 'Dresses',
    tags: ['Dresses', 'Silk'],
    price: 425,
    description:
      '<p>22-momme silk satin, bias-cut, with adjustable straps and a hidden side slit. Designed to be worn as easily over a knit as on its own.</p>',
    images: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85',
      'https://images.unsplash.com/photo-1518049362265-d5b2a6467637?w=1600&q=85',
    ],
  },
  {
    handle: 'fragrance-vetiver-no-02',
    title: 'Vetiver No. 02',
    vendor: 'Atelier 02 Beauté',
    productType: 'Fragrance',
    tags: ['Fragrance', 'Beauté'],
    price: 165,
    description:
      '<p>A unisex eau de parfum built around Haitian vetiver, smoked tea leaves, and a late-base of warm amber.</p>',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&q=85',
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1600&q=85',
    ],
  },
];

async function attachImages(productId, urls) {
  if (!urls || !urls.length) return;
  const media = urls.map((u) => ({
    originalSource: u,
    mediaContentType: 'IMAGE',
  }));
  const result = await gql(
    `
    mutation addMedia($media: [CreateMediaInput!]!, $productId: ID!) {
      productCreateMedia(media: $media, productId: $productId) {
        media { mediaContentType status }
        mediaUserErrors { field message }
      }
    }
  `,
    { media, productId }
  );
  const errs = result.data.productCreateMedia.mediaUserErrors;
  if (errs.length) {
    warn(`  media: ${errs.map((e) => e.message).join(', ')}`);
  } else {
    ok(`  attached ${urls.length} image(s)`);
  }
}

async function productHasImages(productId) {
  const r = await gql(
    `query img($id: ID!) {
      product(id: $id) {
        media(first: 1) { edges { node { id } } }
      }
    }`,
    { id: productId }
  );
  return r.data.product.media.edges.length > 0;
}

async function createProducts() {
  step(`Products: creating ${PRODUCTS.length} demo items`);

  // Look up existing handles in batch
  const existing = new Set();
  const handleQuery = PRODUCTS.map((p) => `handle:${p.handle}`).join(' OR ');
  const check = await gql(
    `query existing($q: String!) {
      products(first: 50, query: $q) { edges { node { id handle } } }
    }`,
    { q: handleQuery }
  );
  check.data.products?.edges?.forEach((e) => existing.add(e.node.handle));

  const ids = {};

  for (const p of PRODUCTS) {
    let productId;

    if (existing.has(p.handle)) {
      productId = check.data.products.edges.find((e) => e.node.handle === p.handle).node.id;
      ids[p.handle] = productId;
      skip(`${p.title}`);
    } else {
      const result = await gql(
        `
        mutation prodCreate($product: ProductCreateInput!) {
          productCreate(product: $product) {
            product { id handle title }
            userErrors { field message }
          }
        }
      `,
        {
          product: {
            handle: p.handle,
            title: p.title,
            descriptionHtml: p.description,
            vendor: p.vendor,
            productType: p.productType,
            tags: p.tags,
            status: 'ACTIVE',
          },
        }
      );

      const errs = result.data.productCreate.userErrors;
      if (errs.length) {
        warn(`${p.handle}: ${errs.map((e) => e.message).join(', ')}`);
        continue;
      }
      const created = result.data.productCreate.product;
      productId = created.id;
      ids[p.handle] = productId;
      ok(`${created.title}`);

      // Set price on the default variant
      const variantsRes = await gql(
        `query v($id: ID!) {
          product(id: $id) {
            variants(first: 1) { edges { node { id } } }
          }
        }`,
        { id: productId }
      );
      const variantId = variantsRes.data.product.variants.edges[0]?.node.id;
      if (variantId) {
        await gql(
          `
          mutation setPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
            productVariantsBulkUpdate(productId: $productId, variants: $variants) {
              userErrors { field message }
            }
          }
        `,
          {
            productId,
            variants: [{ id: variantId, price: String(p.price) }],
          }
        );
      }
    }

    // Attach images if the product has none yet (idempotent for re-runs)
    if (p.images && p.images.length) {
      const hasImages = await productHasImages(productId);
      if (hasImages) {
        skip(`  images for ${p.handle}`);
      } else {
        await attachImages(productId, p.images);
      }
    }
  }

  return ids;
}

// =====================================================================
// 3. Collections
// =====================================================================
const COLLECTIONS = [
  {
    handle: 'latest-arrivals',
    title: 'Latest arrivals',
    description: 'The newest pieces from the atelier. Restocks land Thursdays.',
    productHandles: ['oversized-wool-coat', 'leather-tote-no-04', 'fragrance-vetiver-no-02'],
  },
  {
    handle: 'wardrobe-essentials',
    title: 'Wardrobe essentials',
    description: 'The studied staples. Pieces designed to return to every season.',
    productHandles: ['wide-leg-trouser', 'merino-roll-neck', 'silk-slip-dress'],
  },
  {
    handle: 'the-edit',
    title: 'The edit',
    description: 'Curated by the studio this week.',
    productHandles: ['oversized-wool-coat', 'wide-leg-trouser', 'silk-slip-dress', 'leather-tote-no-04'],
  },
];

async function createCollections(productIds) {
  step(`Collections: creating ${COLLECTIONS.length}`);

  const handleQuery = COLLECTIONS.map((c) => `handle:${c.handle}`).join(' OR ');
  const check = await gql(
    `query existing($q: String!) {
      collections(first: 20, query: $q) { edges { node { id handle } } }
    }`,
    { q: handleQuery }
  );
  const existing = new Map(check.data.collections.edges.map((e) => [e.node.handle, e.node.id]));

  for (const c of COLLECTIONS) {
    let id = existing.get(c.handle);
    if (id) {
      skip(c.title);
    } else {
      const result = await gql(
        `
        mutation collCreate($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection { id handle title }
            userErrors { field message }
          }
        }
      `,
        {
          input: {
            handle: c.handle,
            title: c.title,
            descriptionHtml: `<p>${c.description}</p>`,
          },
        }
      );
      const errs = result.data.collectionCreate.userErrors;
      if (errs.length) {
        warn(`${c.handle}: ${errs.map((e) => e.message).join(', ')}`);
        continue;
      }
      id = result.data.collectionCreate.collection.id;
      ok(c.title);
    }

    // Add products to the collection
    const pids = c.productHandles.map((h) => productIds[h]).filter(Boolean);
    if (pids.length) {
      await gql(
        `
        mutation addProds($id: ID!, $productIds: [ID!]!) {
          collectionAddProducts(id: $id, productIds: $productIds) {
            userErrors { field message }
          }
        }
      `,
        { id, productIds: pids }
      );
      ok(`  added ${pids.length} products to ${c.handle}`);
    }
  }
}

// =====================================================================
// 4. Pages
// =====================================================================
// templateSuffix maps to the part after "page." in templates/page.<suffix>.json
// e.g. page.about.json → templateSuffix: "about". Empty string = default page.
const PAGES = [
  {
    handle: 'about',
    title: 'About',
    body:
      '<p>Elara began as a single tailor’s bench and a refusal to compromise on cloth. Replace this with the story of your founder.</p>',
    templateSuffix: 'about',
  },
  {
    handle: 'lookbook',
    title: 'Lookbook',
    body: '<p>This page uses the Elara <em>Lookbook</em> template. Edit it in the Theme editor to populate the hotspots.</p>',
    templateSuffix: 'lookbook',
  },
  {
    handle: 'size-guide',
    title: 'Size guide',
    body: '<p>This page uses the Elara <em>Size guide</em> template.</p>',
    templateSuffix: 'size-guide',
  },
  {
    handle: 'contact',
    title: 'Contact',
    body: '<p>Email us at hello@example.com or fill in the form below.</p>',
    templateSuffix: 'contact',
  },
  {
    handle: 'concierge',
    title: 'Concierge',
    body:
      '<p>Personal styling, alterations, and gift wrapping by request. Reach out via the concierge link in the footer.</p>',
    templateSuffix: '',
  },
];

async function createPages() {
  step(`Pages: creating ${PAGES.length}`);

  for (const p of PAGES) {
    // Page lookup by handle
    const existing = await gql(
      `query existing($handle: String!) {
        pages(first: 1, query: $handle) { edges { node { id handle title templateSuffix } } }
      }`,
      { handle: `handle:${p.handle}` }
    );

    const found = existing.data.pages.edges.find((e) => e.node.handle === p.handle);
    let pageId;

    if (found) {
      pageId = found.node.id;
      // Update the template suffix if it doesn't already match (idempotent)
      if (found.node.templateSuffix !== p.templateSuffix && p.templateSuffix) {
        const upd = await gql(
          `
          mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
            pageUpdate(id: $id, page: $page) {
              page { id templateSuffix }
              userErrors { field message }
            }
          }
        `,
          { id: pageId, page: { templateSuffix: p.templateSuffix } }
        );
        const errs = upd.data.pageUpdate.userErrors;
        if (errs.length) {
          warn(`${p.handle} template: ${errs.map((e) => e.message).join(', ')}`);
        } else {
          ok(`${p.title} (template → page.${p.templateSuffix})`);
        }
      } else {
        skip(p.title);
      }
      continue;
    }

    const result = await gql(
      `
      mutation pageCreate($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id handle title templateSuffix }
          userErrors { field message }
        }
      }
    `,
      {
        page: {
          handle: p.handle,
          title: p.title,
          body: p.body,
          isPublished: true,
          templateSuffix: p.templateSuffix || null,
        },
      }
    );

    const errs = result.data.pageCreate.userErrors;
    if (errs.length) {
      warn(`${p.handle}: ${errs.map((e) => e.message).join(', ')}`);
      continue;
    }
    const suffix = result.data.pageCreate.page.templateSuffix;
    ok(`${p.title}${suffix ? ` (template → page.${suffix})` : ''}`);
  }
}

// =====================================================================
// 5. Blog (Journal) + 3 articles
// =====================================================================
const BLOG_HANDLE = 'journal';
const ARTICLES = [
  {
    handle: 'inside-the-atelier',
    title: 'Inside the atelier',
    summary: 'A brief tour of the workroom where every piece begins.',
    body:
      '<p>The studio is on the third floor of a former perfumery in Lisbon. Replace this article with your own brand story.</p><h2>How a piece begins</h2><p>It starts on the table as a swatch, then a half-pattern, then a toile. We don’t rush.</p><p>Replace this body with the founder’s voice.</p>',
    tags: ['Studio', 'Behind the scenes'],
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1600&q=85',
    imageAlt: 'Hands working on a tailored garment at an atelier bench',
  },
  {
    handle: 'on-natural-fibres',
    title: 'On natural fibres',
    summary: 'Why we work mostly in wool, linen, silk, and very little else.',
    body:
      '<p>The shorter the supply chain, the more honest the finished piece. Replace this with your own perspective on materials.</p><h2>Wool</h2><p>Italian merino, fully-fashioned, woven slowly.</p><h2>Linen</h2><p>Belgian flax, washed twice before cut.</p>',
    tags: ['Materials'],
    image: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=1600&q=85',
    imageAlt: 'Folded natural fabric swatches in neutral tones',
  },
  {
    handle: 'the-quiet-edit',
    title: 'The quiet edit',
    summary: 'A short note on building a wardrobe slowly.',
    body:
      '<p>The pieces you return to are the ones that survive the loud seasons. This is a placeholder article — replace with your own.</p>',
    tags: ['Wardrobe'],
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85',
    imageAlt: 'Minimal wardrobe edit on a wooden hanging rail',
  },
];

async function createBlogAndArticles() {
  step(`Blog: ${BLOG_HANDLE} + ${ARTICLES.length} articles`);

  let blogId;
  const blogCheck = await gql(
    `query b($q: String!) {
      blogs(first: 5, query: $q) { edges { node { id handle title } } }
    }`,
    { q: `handle:${BLOG_HANDLE}` }
  );

  const foundBlog = blogCheck.data.blogs.edges.find((e) => e.node.handle === BLOG_HANDLE);
  if (foundBlog) {
    blogId = foundBlog.node.id;
    skip(`Blog "${BLOG_HANDLE}"`);
  } else {
    const create = await gql(
      `
      mutation blogCreate($blog: BlogCreateInput!) {
        blogCreate(blog: $blog) {
          blog { id handle title }
          userErrors { field message }
        }
      }
    `,
      { blog: { handle: BLOG_HANDLE, title: 'Journal' } }
    );
    const errs = create.data.blogCreate.userErrors;
    if (errs.length) {
      warn(`blog: ${errs.map((e) => e.message).join(', ')}`);
      return;
    }
    blogId = create.data.blogCreate.blog.id;
    ok(`Blog "${BLOG_HANDLE}"`);
  }

  for (const a of ARTICLES) {
    // Article lookup by handle within the blog
    const check = await gql(
      `query a($blogId: ID!) {
        blog(id: $blogId) {
          articles(first: 25) { edges { node { id handle title } } }
        }
      }`,
      { blogId }
    );
    if (check.data.blog.articles.edges.find((e) => e.node.handle === a.handle)) {
      skip(a.title);
      continue;
    }

    const articlePayload = {
      blogId,
      handle: a.handle,
      title: a.title,
      body: a.body,
      summary: a.summary,
      tags: a.tags,
      isPublished: true,
      author: { name: a.author || 'The Studio' },
    };
    if (a.image) {
      articlePayload.image = { url: a.image, altText: a.imageAlt || a.title };
    }

    const result = await gql(
      `
      mutation art($article: ArticleCreateInput!) {
        articleCreate(article: $article) {
          article { id handle title }
          userErrors { field message }
        }
      }
    `,
      { article: articlePayload }
    );

    const errs = result.data.articleCreate.userErrors;
    if (errs.length) {
      warn(`${a.handle}: ${errs.map((e) => e.message).join(', ')}`);
      continue;
    }
    ok(a.title);
  }

  // For articles that already existed before we started shipping images,
  // backfill the featured image via articleUpdate.
  await backfillArticleImages(blogId);
}

async function backfillArticleImages(blogId) {
  for (const a of ARTICLES) {
    if (!a.image) continue;
    const r = await gql(
      `query a($blogId: ID!) {
        blog(id: $blogId) {
          articles(first: 50) {
            edges { node { id handle image { url } } }
          }
        }
      }`,
      { blogId }
    );
    const node = r.data.blog.articles.edges.find((e) => e.node.handle === a.handle)?.node;
    if (!node) continue;
    if (node.image && node.image.url) {
      // Already has an image
      continue;
    }
    const upd = await gql(
      `
      mutation au($id: ID!, $article: ArticleUpdateInput!) {
        articleUpdate(id: $id, article: $article) {
          article { id image { url } }
          userErrors { field message }
        }
      }
    `,
      {
        id: node.id,
        article: {
          image: { url: a.image, altText: a.imageAlt || a.title },
        },
      }
    );
    const errs = upd.data.articleUpdate.userErrors;
    if (errs.length) {
      warn(`backfill image ${a.handle}: ${errs.map((e) => e.message).join(', ')}`);
    } else {
      ok(`backfilled image: ${a.title}`);
    }
  }
}

// =====================================================================
// 6. Populate elara.complete_look on sample products
// =====================================================================
const COMPLETE_LOOK_PAIRINGS = [
  { product: 'oversized-wool-coat', pairs_with: ['merino-roll-neck', 'wide-leg-trouser', 'leather-tote-no-04'] },
  { product: 'leather-tote-no-04', pairs_with: ['oversized-wool-coat', 'wide-leg-trouser', 'silk-slip-dress'] },
  { product: 'silk-slip-dress', pairs_with: ['merino-roll-neck', 'leather-tote-no-04', 'fragrance-vetiver-no-02'] },
];

async function populateCompleteLook(productIds) {
  step('Complete-the-look metafield: pairing products');

  for (const pairing of COMPLETE_LOOK_PAIRINGS) {
    const targetId = productIds[pairing.product];
    if (!targetId) {
      warn(`${pairing.product}: product not found`);
      continue;
    }
    const valueIds = pairing.pairs_with.map((h) => productIds[h]).filter(Boolean);
    if (!valueIds.length) continue;

    const result = await gql(
      `
      mutation setMf($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id key namespace }
          userErrors { field message }
        }
      }
    `,
      {
        metafields: [
          {
            ownerId: targetId,
            namespace: 'elara',
            key: 'complete_look',
            type: 'list.product_reference',
            value: JSON.stringify(valueIds),
          },
        ],
      }
    );

    const errs = result.data.metafieldsSet.userErrors;
    if (errs.length) {
      warn(`${pairing.product}: ${errs.map((e) => e.message).join(', ')}`);
    } else {
      ok(`${pairing.product} ← ${valueIds.length} paired products`);
    }
  }
}

// =====================================================================
// Main
// =====================================================================
async function main() {
  console.log(`\nElara content seeder → ${STORE}.myshopify.com${DRY ? ' (dry-run)' : ''}\n`);

  await ensureCompleteLookMetafield();
  const productIds = await createProducts();
  await createCollections(productIds);
  await createPages();
  await createBlogAndArticles();
  await populateCompleteLook(productIds);

  console.log('\n✓ Done.');
  console.log('  Open https://' + STORE + '.myshopify.com/admin to review.');
}

main().catch((err) => {
  console.error('\n✘ Seeder failed:', err.message);
  process.exit(1);
});
