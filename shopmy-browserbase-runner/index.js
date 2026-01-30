/**
 * ShopMy Browserbase runner – HTTP server for n8n.
 * POST /run with body: { creatorId, creatorEmail, shopmyEmail, shopmyPassword }
 * Returns: { csvData?, creatorId, creatorEmail, error? }
 *
 * Env: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, PORT (default 3333)
 */

import express from "express";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const app = express();
app.use(express.json({ limit: "1mb" }));

const apiKey = process.env.BROWSERBASE_API_KEY;
const projectId = process.env.BROWSERBASE_PROJECT_ID;
const PORT = Number(process.env.PORT) || 3333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!apiKey || !projectId) {
  console.error("Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID");
  process.exit(1);
}

const SHOPMY_PAGES = [
  { url: "https://shopmy.us/links", source: "links" },
  { url: "https://shopmy.us/links/domains", source: "domains" },
  { url: "https://shopmy.us/links/creator-orders", source: "creator-orders" },
];

async function getCsvFromPage(page, sourceLabel) {
  const fs = await import("fs");
  // Let SPA load tables/buttons (Links, Domains, Creator Orders)
  await sleep(5000);
  // Scroll to trigger lazy content and reveal toolbar buttons
  await page.evaluate(() => window.scrollTo(0, 300));
  await sleep(800);
  await page.evaluate(() => window.scrollTo(0, 0));

  const tryDownload = async (locator) => {
    if ((await locator.count()) === 0) return null;
    const el = locator.first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }).catch(() => null),
      el.click(),
    ]);
    if (download) {
      const path = await download.path();
      return fs.readFileSync(path, "utf8");
    }
    return null;
  };

  // Broad set of selectors (SPA/React common patterns)
  const exportSelectors = [
    'button:has-text("Export")',
    'button:has-text("Download")',
    'button:has-text("CSV")',
    'a:has-text("Export")',
    'a:has-text("Download")',
    'a:has-text("CSV")',
    '[role="button"]:has-text("Export")',
    '[role="button"]:has-text("Download")',
    '[role="menuitem"]:has-text("Export")',
    '[role="menuitem"]:has-text("Download")',
    '[role="menuitem"]:has-text("CSV")',
    '[data-action="export"]',
    '[data-testid*="export" i]',
    '[data-testid*="download" i]',
    '[aria-label*="export" i]',
    '[aria-label*="download" i]',
    '[title*="export" i]',
    '[title*="download" i]',
    '[class*="export" i]',
    '[class*="download" i]',
    'button[class*="export" i]',
    'a[class*="export" i]',
    'button[class*="download" i]',
    'a[class*="download" i]',
  ];

  for (const sel of exportSelectors) {
    try {
      const raw = await tryDownload(page.locator(sel));
      if (raw) return raw;
    } catch (_) {}
  }

  // Open "Actions" / "More" / "⋮" menu then look for Export/Download
  const menuTriggers = [
    'button:has-text("Actions")',
    'button:has-text("More")',
    '[aria-label="More"]',
    '[aria-haspopup="menu"]',
    'button:has(svg)',
  ];
  for (const menuSel of menuTriggers) {
    const menuBtn = page.locator(menuSel).first();
    if ((await menuBtn.count()) > 0) {
      await menuBtn.click();
      await sleep(1000);
      const raw = await tryDownload(page.getByRole("menuitem", { name: /export|download|csv/i }));
      if (raw) return raw;
      await page.keyboard.press("Escape");
      await sleep(500);
    }
  }

  // Fallback: scrape first data table as CSV
  const table = page.locator("table").first();
  if ((await table.count()) > 0) {
    const rows = await table.locator("tr").allTextContents();
    if (rows.length > 0) {
      return rows.map((r) => r.trim().replace(/\t/g, ",")).join("\n");
    }
  }

  return null;
}

/** Return a short HTML snippet for debugging when export not found (no PII). */
async function getPageDebugSnippet(page, maxLen = 4000) {
  try {
    const html = await page.evaluate(() => document.body?.innerHTML ?? "");
    const snippet = html.replace(/\s+/g, " ").trim().slice(0, maxLen);
    return snippet;
  } catch {
    return "";
  }
}

async function runShopMyScrape({ creatorId = "unknown", creatorEmail = "", shopmyEmail, shopmyPassword }) {
  if (!shopmyEmail || !shopmyPassword) {
    return { creatorId, creatorEmail, error: "shopmyEmail and shopmyPassword required" };
  }

  const bb = new Browserbase({ apiKey });
  let session;
  try {
    session = await bb.sessions.create({ projectId });
  } catch (e) {
    return { creatorId, creatorEmail, error: "Browserbase session failed: " + e.message };
  }

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0] || (await defaultContext.newPage());

  let csvData = null;
  let error = null;
  let debugHtmlSnippet = null;

  try {
    // Login: shopmy.us/home – login is a POP-UP modal (no URL change). Open it, then fill only inside the modal.
    await page.goto("https://shopmy.us/home", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);

    // Open the login pop-up by clicking "Log In" on the page (modal does not change the URL)
    const openLogin = page.locator('a:has-text("Log In"), a:has-text("Log in"), button:has-text("Log In")').first();
    await openLogin.click();
    await sleep(1500);

    // Wait for the pop-up modal (title "Log in to continue." / "Login to continue") – no URL change
    await page.getByText(/log\s*in\s*to\s*continue/i).first().waitFor({ state: "visible", timeout: 10000 });
    const dialog = page.getByRole("dialog").first();
    const scope = (await dialog.count()) > 0 ? dialog : page;

    // Email: first visible text-type input in the modal (pop-up doesn't redirect; we must target modal only)
    const emailInput = scope.locator("input[type='email'], input[type='text']").first();
    await emailInput.waitFor({ state: "visible", timeout: 8000 });
    await emailInput.clear();
    await emailInput.fill(shopmyEmail);

    const passwordInput = scope.locator("input[type='password']").first();
    await passwordInput.waitFor({ state: "visible", timeout: 5000 });
    await passwordInput.fill(shopmyPassword);

    // Click the LOG IN button *inside* the pop-up (not the nav "Log In")
    const loginBtn = scope.locator('input[type="submit"], input[value="LOG IN"], button:has-text("Log In"), [class*="login-btn"]').first();
    await loginBtn.click();
    // Pop-up does not redirect URL; wait for modal to close or for content to update
    await sleep(5000);

    // Download CSV from each page; combine with "Source" column (one header, all rows)
    let headerLine = null;
    const allRows = [];
    for (const { url, source } of SHOPMY_PAGES) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
      const raw = await getCsvFromPage(page, source);
      if (raw) {
        const lines = raw.trim().split("\n").filter((l) => l.trim());
        const header = lines[0] || "";
        if (!headerLine) headerLine = "Source," + (header.startsWith("Source,") ? header.replace(/^Source,/, "") : header);
        const rows = lines.slice(1).map((line) => `"${source}",${line}`);
        allRows.push(...rows);
      }
    }
    if (headerLine && allRows.length > 0) csvData = headerLine + "\n" + allRows.join("\n");
    else if (allRows.length > 0) csvData = "Source\n" + allRows.join("\n");
    else {
      // Login succeeded; export/table not found – include DOM snippet so you can search for export/download
      const afterLoginUrl = page.url();
      if (process.env.DEBUG_HTML) debugHtmlSnippet = await getPageDebugSnippet(page);
      error = "Login OK. No CSV or table found on links/domains/creator-orders. Check Browserbase session replay for export button/link and update getCsvFromPage in index.js. Last URL: " + afterLoginUrl;
    }
  } catch (e) {
    error = e.message || String(e);
  } finally {
    await browser.close();
  }

  const out = { creatorId, creatorEmail };
  if (error) out.error = error;
  else out.csvData = csvData;
  if (debugHtmlSnippet) out.debugHtmlSnippet = debugHtmlSnippet;
  return out;
}

app.post("/run", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await runShopMyScrape({
      creatorId: body.creatorId ?? body.creator_id,
      creatorEmail: body.creatorEmail ?? body.creator_email ?? "",
      shopmyEmail: body.shopmyEmail ?? body.shopmy_email,
      shopmyPassword: body.shopmyPassword ?? body.shopmy_password,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

/** One-off test for Nicki Entenmann – uses env NICKI_SHOPMY_EMAIL, NICKI_SHOPMY_PASSWORD (set in Railway, never in code). */
async function runNicki(req, res) {
  const email = process.env.NICKI_SHOPMY_EMAIL;
  const password = process.env.NICKI_SHOPMY_PASSWORD;
  if (!email || !password) {
    return res.status(400).json({
      error: "Set NICKI_SHOPMY_EMAIL and NICKI_SHOPMY_PASSWORD in Railway (or .env) and redeploy",
      creatorId: "nicki-entenmann",
      creatorEmail: "",
    });
  }
  try {
    const result = await runShopMyScrape({
      creatorId: "nicki-entenmann",
      creatorEmail: "Nicki Entenmann",
      shopmyEmail: email,
      shopmyPassword: password,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e), creatorId: "nicki-entenmann", creatorEmail: "Nicki Entenmann" });
  }
}
app.post("/run-nicki", runNicki);
app.get("/run-nicki", runNicki);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log("ShopMy Browserbase runner listening on port", PORT);
});
