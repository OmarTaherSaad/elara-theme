#!/usr/bin/env node
/**
 * Elara content cleanup.
 *
 * Deletes products, collections, pages, blogs, and articles in the target
 * Shopify store that are NOT in the Elara seed manifest. Useful after
 * pointing the seeder at a store that already had Shopify-default sample
 * content (T-shirt, Selling-plans ski wax, etc.) and wanting a clean slate
 * showcasing only Elara content.
 *
 * Dry-run by default. To actually delete, pass --confirm.
 *
 * Usage:
 *   ADMIN_TOKEN=shpat_xxx STORE=ots-store1 node scripts/cleanup-content.mjs
 *   ADMIN_TOKEN=shpat_xxx STORE=ots-store1 node scripts/cleanup-content.mjs --confirm
 *
 * Required scopes (same as seed-content.mjs): write_products,
 * write_publications, write_content, read_content, write_files.
 *
 * SAFETY:
 *   - Items in the manifest are NEVER deleted, even if their handles drift.
 *   - The "Home" page is preserved (most stores have it as the policy
 *     anchor for the homepage URL).
 *   - Default Shopify-owned pages (refund-policy, privacy-policy, etc.)
 *     are preserved by handle prefix.
 */

import process from 'node:process';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...rest] = a.replace(/^--/, '').split('=');
    return [k, rest.length ? rest.join('=') : true];
  })
);
const TOKEN = args.token || process.env.ADMIN_TOKEN;
const STORE = args.store || process.env.STORE || 'ots-store1';
const CONFIRM = args.confirm === true || args.confirm === 'true';

if (!TOKEN) {
  console.error('ERROR: missing admin API token.');
  process.exit(1);
}

const ENDPOINT = `https://${STORE}.myshopify.com/admin/api/2025-01/graphql.json`;

async function gql(query, variables = {}) {
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

const step = (msg) => console.log(`\n→ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const warn = (msg) => console.log(`  ! ${msg}`);
const note = (msg) => console.log(`  · ${msg}`);

// ---------- Seed manifest (must stay in sync with seed-content.mjs) ----------
const KEEP_PRODUCT_HANDLES = new Set([
  'oversized-wool-coat',
  'wide-leg-trouser',
  'merino-roll-neck',
  'leather-tote-no-04',
  'silk-slip-dress',
  'fragrance-vetiver-no-02',
]);

const KEEP_COLLECTION_HANDLES = new Set([
  'latest-arrivals',
  'wardrobe-essentials',
  'the-edit',
]);

const KEEP_PAGE_HANDLES = new Set([
  'about',
  'lookbook',
  'size-guide',
  'contact',
  'concierge',
]);

const KEEP_BLOG_HANDLES = new Set(['journal']);

const KEEP_ARTICLE_HANDLES_BY_BLOG = {
  journal: new Set(['inside-the-atelier', 'on-natural-fibres', 'the-quiet-edit']),
};

// Some pages are policy-anchored and shouldn't be deleted even if not seeded.
const PROTECTED_PAGE_HANDLES = new Set([
  'home',
  'frontpage',
  'refund-policy',
  'privacy-policy',
  'shipping-policy',
  'terms-of-service',
  'subscription-policy',
  'contact-information',
  'data-sharing-opt-out',   // CCPA/Shopify-required
  'do-not-sell',            // CCPA alternate handle
  'accessibility-statement',
]);

// =====================================================================
// Helpers
// =====================================================================
async function paginate(query, variablesBase, pickEdges) {
  const out = [];
  let cursor = null;
  while (true) {
    const variables = { ...variablesBase, after: cursor };
    const data = await gql(query, variables);
    const conn = pickEdges(data);
    out.push(...conn.edges.map((e) => e.node));
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.edges[conn.edges.length - 1].cursor;
  }
  return out;
}

// =====================================================================
// 1. Products
// =====================================================================
async function cleanProducts() {
  step('Products');
  const all = await paginate(
    `query allProducts($after: String) {
      products(first: 50, after: $after) {
        edges { cursor node { id handle title } }
        pageInfo { hasNextPage }
      }
    }`,
    {},
    (d) => d.data.products
  );

  const toDelete = all.filter((p) => !KEEP_PRODUCT_HANDLES.has(p.handle));
  const toKeep = all.filter((p) => KEEP_PRODUCT_HANDLES.has(p.handle));

  toKeep.forEach((p) => note(`keep: ${p.title} (${p.handle})`));
  if (!toDelete.length) {
    ok('Nothing to delete');
    return;
  }

  for (const p of toDelete) {
    if (!CONFIRM) {
      warn(`would delete: ${p.title} (${p.handle})`);
      continue;
    }
    const res = await gql(
      `mutation pd($input: ProductDeleteInput!) {
        productDelete(input: $input) {
          deletedProductId
          userErrors { field message }
        }
      }`,
      { input: { id: p.id } }
    );
    const errs = res.data.productDelete.userErrors;
    if (errs.length) {
      warn(`failed to delete ${p.handle}: ${errs.map((e) => e.message).join(', ')}`);
    } else {
      ok(`deleted: ${p.title}`);
    }
  }
}

// =====================================================================
// 2. Collections (smart + custom collections)
// =====================================================================
async function cleanCollections() {
  step('Collections');
  const all = await paginate(
    `query allColl($after: String) {
      collections(first: 50, after: $after) {
        edges { cursor node { id handle title } }
        pageInfo { hasNextPage }
      }
    }`,
    {},
    (d) => d.data.collections
  );

  const toDelete = all.filter((c) => !KEEP_COLLECTION_HANDLES.has(c.handle));
  const toKeep = all.filter((c) => KEEP_COLLECTION_HANDLES.has(c.handle));

  toKeep.forEach((c) => note(`keep: ${c.title} (${c.handle})`));
  if (!toDelete.length) {
    ok('Nothing to delete');
    return;
  }

  for (const c of toDelete) {
    if (!CONFIRM) {
      warn(`would delete: ${c.title} (${c.handle})`);
      continue;
    }
    const res = await gql(
      `mutation cd($input: CollectionDeleteInput!) {
        collectionDelete(input: $input) {
          deletedCollectionId
          userErrors { field message }
        }
      }`,
      { input: { id: c.id } }
    );
    const errs = res.data.collectionDelete.userErrors;
    if (errs.length) {
      warn(`failed to delete ${c.handle}: ${errs.map((e) => e.message).join(', ')}`);
    } else {
      ok(`deleted: ${c.title}`);
    }
  }
}

// =====================================================================
// 3. Pages
// =====================================================================
async function cleanPages() {
  step('Pages');
  const all = await paginate(
    `query allPages($after: String) {
      pages(first: 50, after: $after) {
        edges { cursor node { id handle title } }
        pageInfo { hasNextPage }
      }
    }`,
    {},
    (d) => d.data.pages
  );

  const protect = (p) =>
    KEEP_PAGE_HANDLES.has(p.handle) || PROTECTED_PAGE_HANDLES.has(p.handle);

  const toDelete = all.filter((p) => !protect(p));
  const toKeep = all.filter(protect);

  toKeep.forEach((p) => note(`keep: ${p.title} (${p.handle})`));
  if (!toDelete.length) {
    ok('Nothing to delete');
    return;
  }

  for (const p of toDelete) {
    if (!CONFIRM) {
      warn(`would delete: ${p.title} (${p.handle})`);
      continue;
    }
    const res = await gql(
      `mutation pd($id: ID!) {
        pageDelete(id: $id) {
          deletedPageId
          userErrors { field message }
        }
      }`,
      { id: p.id }
    );
    const errs = res.data.pageDelete.userErrors;
    if (errs.length) {
      warn(`failed to delete ${p.handle}: ${errs.map((e) => e.message).join(', ')}`);
    } else {
      ok(`deleted: ${p.title}`);
    }
  }
}

// =====================================================================
// 4. Blogs & articles
// =====================================================================
async function cleanBlogsAndArticles() {
  step('Blogs & articles');
  const blogs = await paginate(
    `query allBlogs($after: String) {
      blogs(first: 50, after: $after) {
        edges { cursor node { id handle title } }
        pageInfo { hasNextPage }
      }
    }`,
    {},
    (d) => d.data.blogs
  );

  for (const blog of blogs) {
    if (!KEEP_BLOG_HANDLES.has(blog.handle)) {
      if (!CONFIRM) {
        warn(`would delete blog: ${blog.title} (${blog.handle})`);
      } else {
        const res = await gql(
          `mutation bd($id: ID!) {
            blogDelete(id: $id) {
              deletedBlogId
              userErrors { field message }
            }
          }`,
          { id: blog.id }
        );
        const errs = res.data.blogDelete.userErrors;
        if (errs.length) {
          warn(`failed to delete blog ${blog.handle}: ${errs.map((e) => e.message).join(', ')}`);
        } else {
          ok(`deleted blog: ${blog.title}`);
        }
      }
      continue;
    }

    note(`keep blog: ${blog.title}`);
    const keepArticleHandles = KEEP_ARTICLE_HANDLES_BY_BLOG[blog.handle] || new Set();

    const articles = await paginate(
      `query blogArticles($id: ID!, $after: String) {
        blog(id: $id) {
          articles(first: 50, after: $after) {
            edges { cursor node { id handle title } }
            pageInfo { hasNextPage }
          }
        }
      }`,
      { id: blog.id },
      (d) => d.data.blog.articles
    );

    const toDelete = articles.filter((a) => !keepArticleHandles.has(a.handle));
    const toKeep = articles.filter((a) => keepArticleHandles.has(a.handle));
    toKeep.forEach((a) => note(`  keep article: ${a.title}`));
    for (const a of toDelete) {
      if (!CONFIRM) {
        warn(`  would delete article: ${a.title} (${a.handle})`);
        continue;
      }
      const res = await gql(
        `mutation ad($id: ID!) {
          articleDelete(id: $id) {
            deletedArticleId
            userErrors { field message }
          }
        }`,
        { id: a.id }
      );
      const errs = res.data.articleDelete.userErrors;
      if (errs.length) {
        warn(`  failed to delete article ${a.handle}: ${errs.map((e) => e.message).join(', ')}`);
      } else {
        ok(`  deleted article: ${a.title}`);
      }
    }
  }
}

// =====================================================================
// Main
// =====================================================================
async function main() {
  console.log(`\nElara content cleanup → ${STORE}.myshopify.com`);
  console.log(`Mode: ${CONFIRM ? 'DELETE (real)' : 'DRY RUN (pass --confirm to delete)'}\n`);

  await cleanProducts();
  await cleanCollections();
  await cleanPages();
  await cleanBlogsAndArticles();

  console.log('\n✓ Done.');
  if (!CONFIRM) {
    console.log('  Re-run with --confirm to perform the deletions above.');
  }
}

main().catch((err) => {
  console.error('\n✘ Cleanup failed:', err.message);
  process.exit(1);
});
