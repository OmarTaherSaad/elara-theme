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
  },
];

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
    if (existing.has(p.handle)) {
      const id = check.data.products.edges.find((e) => e.node.handle === p.handle).node.id;
      ids[p.handle] = id;
      skip(`${p.title}`);
      continue;
    }

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
    ids[p.handle] = created.id;
    ok(`${created.title}`);

    // Set price on the default variant
    const variantsRes = await gql(
      `query v($id: ID!) {
        product(id: $id) {
          variants(first: 1) { edges { node { id } } }
        }
      }`,
      { id: created.id }
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
          productId: created.id,
          variants: [{ id: variantId, price: String(p.price) }],
        }
      );
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
const PAGES = [
  {
    handle: 'about',
    title: 'About',
    body:
      '<p>Elara began as a single tailor’s bench and a refusal to compromise on cloth. Replace this with the story of your founder.</p>',
  },
  {
    handle: 'lookbook',
    title: 'Lookbook',
    body: '<p>This page uses the Elara <em>Lookbook</em> template. Edit it in the Theme editor to populate the hotspots.</p>',
  },
  {
    handle: 'size-guide',
    title: 'Size guide',
    body: '<p>This page uses the Elara <em>Size guide</em> template.</p>',
  },
  {
    handle: 'contact',
    title: 'Contact',
    body: '<p>Email us at hello@example.com or fill in the form below.</p>',
  },
  {
    handle: 'concierge',
    title: 'Concierge',
    body:
      '<p>Personal styling, alterations, and gift wrapping by request. Reach out via the concierge link in the footer.</p>',
  },
];

async function createPages() {
  step(`Pages: creating ${PAGES.length}`);

  for (const p of PAGES) {
    // Page lookup by handle
    const existing = await gql(
      `query existing($handle: String!) {
        pages(first: 1, query: $handle) { edges { node { id handle title } } }
      }`,
      { handle: `handle:${p.handle}` }
    );

    const found = existing.data.pages.edges.find((e) => e.node.handle === p.handle);
    if (found) {
      skip(p.title);
      continue;
    }

    const result = await gql(
      `
      mutation pageCreate($page: PageCreateInput!) {
        pageCreate(page: $page) {
          page { id handle title }
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
        },
      }
    );

    const errs = result.data.pageCreate.userErrors;
    if (errs.length) {
      warn(`${p.handle}: ${errs.map((e) => e.message).join(', ')}`);
      continue;
    }
    ok(p.title);
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
  },
  {
    handle: 'on-natural-fibres',
    title: 'On natural fibres',
    summary: 'Why we work mostly in wool, linen, silk, and very little else.',
    body:
      '<p>The shorter the supply chain, the more honest the finished piece. Replace this with your own perspective on materials.</p><h2>Wool</h2><p>Italian merino, fully-fashioned, woven slowly.</p><h2>Linen</h2><p>Belgian flax, washed twice before cut.</p>',
    tags: ['Materials'],
  },
  {
    handle: 'the-quiet-edit',
    title: 'The quiet edit',
    summary: 'A short note on building a wardrobe slowly.',
    body:
      '<p>The pieces you return to are the ones that survive the loud seasons. This is a placeholder article — replace with your own.</p>',
    tags: ['Wardrobe'],
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

    const result = await gql(
      `
      mutation art($article: ArticleCreateInput!) {
        articleCreate(article: $article) {
          article { id handle title }
          userErrors { field message }
        }
      }
    `,
      {
        article: {
          blogId,
          handle: a.handle,
          title: a.title,
          body: a.body,
          summary: a.summary,
          tags: a.tags,
          isPublished: true,
        },
      }
    );

    const errs = result.data.articleCreate.userErrors;
    if (errs.length) {
      warn(`${a.handle}: ${errs.map((e) => e.message).join(', ')}`);
      continue;
    }
    ok(a.title);
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

  console.log('\n✓ Done. Next steps:');
  console.log('  1. Upload product images via the admin (or extend this script with productCreateMedia).');
  console.log('  2. Set page templates in admin: pages/about → page.about, pages/lookbook → page.lookbook,');
  console.log('     pages/size-guide → page.size-guide. (Set via page → Online Store template picker.)');
  console.log('  3. Populate the elara.complete_look metafield on a product to test the Complete-the-look block.');
}

main().catch((err) => {
  console.error('\n✘ Seeder failed:', err.message);
  process.exit(1);
});
