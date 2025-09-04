const { chromium } = require("@playwright/test");
const fs = require("fs");

(async () => {
  const base = process.env.STORE_URL.replace(/\/$/, "");
  const p = `?preview_theme_id=${process.env.PREVIEW_ID}`;
  const urls = [
    `${base}/${p}`,
    `${base}/collections/all${p}`,
    `${base}/products/sample-product${p}`,
    `${base}/cart${p}`,
  ];

  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // unlock password if set
  try {
    await page.goto(`${base}/password`, { waitUntil: "domcontentloaded" });
    if (process.env.STORE_PASSWORD) {
      await page.fill('input[type="password"]', process.env.STORE_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForLoadState("networkidle");
    }
  } catch {}

  for (const u of urls) {
    await page.goto(u, { waitUntil: "networkidle" });
    const name = u.split("?")[0].split("/").filter(Boolean).pop() || "home";
    await page.screenshot({ path: `artifacts/${name}.png`, fullPage: true });
  }
  await browser.close();
})();
