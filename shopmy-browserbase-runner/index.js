/**
 * ShopMy Browserbase runner – HTTP server for n8n.
 * POST /run with body: { creatorId, creatorEmail, shopmyEmail, shopmyPassword, cookies? }
 *   - If cookies (array of { name, value, domain, path }) is provided, inject and skip login (reuse auth).
 * Returns: { csvData?, creatorId, creatorEmail, error? }
 * POST /auth/refresh with body: { shopmyEmail, shopmyPassword } → does login, returns { cookies } for storage.
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

const EARNINGS_URL = "https://shopmy.us/payouts";

async function getCsvFromPage(page, sourceLabel) {
  const fs = await import("fs");
  // Let SPA load tables/buttons (Links, Domains, Creator Orders)
  await sleep(10000);
  // Scroll to reveal toolbar (desktop-only DOWNLOAD button)
  await page.evaluate(() => window.scrollTo(0, 300));
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1000);

  const tryDownload = async (locator, options = {}) => {
    if ((await locator.count()) === 0) return null;
    const el = locator.first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const downloadTimeout = options.timeout ?? 25000;
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: downloadTimeout }).catch(() => null),
      el.click({ force: true }),
    ]);
    if (download) {
      const path = await download.path();
      return fs.readFileSync(path, "utf8");
    }
    return null;
  };

  // If click triggers CSV via XHR/fetch instead of browser download, capture response
  const tryDownloadViaResponse = async (locator) => {
    if ((await locator.count()) === 0) return null;
    const el = locator.first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    let csvResponse = null;
    try {
      [csvResponse] = await Promise.all([
        page.waitForResponse(
          (res) => {
            const url = res.url();
            const ct = (res.headers()["content-type"] || "").toLowerCase();
            return (ct.includes("csv") || ct.includes("text/plain") || /export|download|csv/i.test(url)) && res.request().method() === "GET";
          },
          { timeout: 30000 }
        ),
        el.click({ force: true }),
      ]);
    } catch (_) {}
    if (csvResponse) {
      const body = await csvResponse.text();
      if (body && (body.includes(",") || body.includes("\n"))) return body;
    }
    return null;
  };

  // ShopMy: DOWNLOAD button calls apiv3.shopmy.us/api/Pins?downloadAllToCsv=1&... → JSON { downloaded_url: "https://...s3.../csv-xxx.csv" } → fetch that URL for CSV
  const tryDownloadViaPinsApi = async (locator) => {
    if ((await locator.count()) === 0) return null;
    const el = locator.first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    let pinsResponse = null;
    try {
      [pinsResponse] = await Promise.all([
        page.waitForResponse(
          (res) => {
            const url = res.url();
            return /apiv3\.shopmy\.us\/api\/Pins.*downloadAllToCsv=1/i.test(url) && res.request().method() === "GET";
          },
          { timeout: 35000 }
        ),
        el.click({ force: true }),
      ]);
    } catch (_) {}
    if (!pinsResponse) return null;
    let data;
    try {
      data = await pinsResponse.json();
    } catch (_) {
      return null;
    }
    const csvUrl = data?.downloaded_url;
    if (!csvUrl || typeof csvUrl !== "string") return null;
    try {
      const csvRes = await page.request.get(csvUrl, { timeout: 20000 });
      if (!csvRes.ok()) return null;
      const csvText = await csvRes.text();
      if (csvText && (csvText.includes(",") || csvText.includes("\n"))) return csvText;
    } catch (_) {}
    return null;
  };

  // ShopMy: .download-csv-btn inside .link-controls-container (Links, By Website, Creator Orders)
  const exportSelectors = [
    ".link-controls-container .download-csv-btn",
    ".download-csv-btn",
    'div.download-csv-btn:has-text("DOWNLOAD")',
    'div:has-text("DOWNLOAD"):has(svg[data-icon="down-to-line"])',
    'div.desktop-only:has-text("DOWNLOAD")',
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

  const shopmyDownloadSelectors = [".link-controls-container .download-csv-btn", ".download-csv-btn", "div.download-csv-btn:has-text(\"DOWNLOAD\")"];
  for (const sel of exportSelectors) {
    try {
      const loc = page.locator(sel);
      let raw = null;
      if (shopmyDownloadSelectors.some((s) => sel.includes(s) || sel === s)) {
        raw = await tryDownloadViaPinsApi(loc);
      }
      if (!raw) raw = await tryDownload(loc, shopmyDownloadSelectors.some((s) => sel.includes(s) || sel === s) ? { timeout: 35000 } : {});
      if (!raw && shopmyDownloadSelectors.some((s) => sel.includes(s) || sel === s)) raw = await tryDownloadViaResponse(loc);
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

/** Earnings (/payouts): Commissions (POST Payouts/download_commissions → response.url) and Payment report (blob download). Returns [{ source, csvText }, ...]. */
async function getEarningsCsvs(page) {
  const fs = await import("fs");
  const results = [];
  await sleep(6000);
  await page.evaluate(() => window.scrollTo(0, 400));
  await sleep(1500);
  await page.evaluate(() => window.scrollTo(0, 0));

  // Commission download buttons: POST download_commissions → { success, url }
  const commissionButtons = page.locator(".earnings-portal-commissions-outer .earnings-portal-section-button");
  const commissionCount = await commissionButtons.count();
  const commissionSources = ["commissions-normal", "commissions-opportunity"];
  for (let i = 0; i < commissionCount; i++) {
    try {
      const btn = commissionButtons.nth(i);
      const [res] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes("Payouts/download_commissions") && r.request().method() === "POST",
          { timeout: 25000 }
        ),
        btn.click(),
      ]);
      const data = await res.json().catch(() => ({}));
      const csvUrl = data?.url;
      if (csvUrl && typeof csvUrl === "string") {
        const csvRes = await page.request.get(csvUrl, { timeout: 20000 });
        if (csvRes.ok()) {
          const text = await csvRes.text();
          if (text && (text.includes(",") || text.includes("\n")))
            results.push({ source: commissionSources[i] ?? "commissions", csvText: text });
        }
      }
      await sleep(2000);
    } catch (_) {}
  }

  // Payment report: blob download (a[download="shopmy_payment_report.csv"])
  try {
    const paymentLink = page.locator('a[download="shopmy_payment_report.csv"]').first();
    if ((await paymentLink.count()) > 0) {
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
        paymentLink.click(),
      ]);
      if (download) {
        const path = await download.path();
        const csvText = fs.readFileSync(path, "utf8");
        if (csvText && (csvText.includes(",") || csvText.includes("\n")))
          results.push({ source: "payment-report", csvText });
      }
    }
  } catch (_) {}

  return results;
}

async function runShopMyScrape({ creatorId = "unknown", creatorEmail = "", shopmyEmail, shopmyPassword, cookies: injectedCookies }) {
  const needLogin = !injectedCookies?.length;
  if (needLogin && (!shopmyEmail || !shopmyPassword)) {
    return { creatorId, creatorEmail, error: "shopmyEmail and shopmyPassword required (or provide cookies for reuse)" };
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

  // ShopMy DOWNLOAD button has class "desktop-only" – use desktop viewport so it’s visible
  await page.setViewportSize({ width: 1280, height: 720 });

  let csvData = null;
  let error = null;
  let debugHtmlSnippet = null;

  try {
    if (injectedCookies?.length) {
      // Reuse auth: inject stored cookies then go straight to Links (no login popup)
      await defaultContext.addCookies(injectedCookies);
      await page.goto("https://shopmy.us/links", { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      await sleep(5000);
    } else {
      // Login: try API first (POST apiv3.shopmy.us/api/Auth/session from page so cookies are set), then fallback to popup
      await page.goto("https://shopmy.us/home", { waitUntil: "domcontentloaded", timeout: 30000 });
      await sleep(2000);
      // HAR: Auth/session expects x-apicache-bypass, x-session-id (e.g. timestamp) for parity with real client
      const sessionId = String(Date.now());
      const apiLoginOk = await page.evaluate(
        async ({ username, password, xSessionId }) => {
          try {
            const res = await fetch("https://apiv3.shopmy.us/api/Auth/session", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-apicache-bypass": "true",
                "x-session-id": xSessionId,
              },
              credentials: "include",
              body: JSON.stringify({ username, password }),
            });
            return res.ok;
          } catch {
            return false;
          }
        },
        { username: shopmyEmail, password: shopmyPassword, xSessionId: sessionId }
      );
      if (apiLoginOk) {
        await sleep(3000);
        await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
        await page.locator('a[href="/links"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
        await sleep(3000);
        const linksNav = page.locator('a[href="/links"]').first();
        if ((await linksNav.count()) > 0) {
          await linksNav.click();
          await page.waitForURL(/\/links/, { timeout: 15000 }).catch(() => {});
          await sleep(3000);
        }
      } else {
        // Fallback: login via popup
        const openLogin = page.locator('a:has-text("Log In"), a:has-text("Log in"), button:has-text("Log In")').first();
        await openLogin.click();
        await sleep(1500);
        await page.getByText(/log\s*in\s*to\s*continue/i).first().waitFor({ state: "visible", timeout: 10000 });
        const dialog = page.getByRole("dialog").first();
        const scope = (await dialog.count()) > 0 ? dialog : page;
        await scope.locator("input[type='email'], input[type='text']").first().fill(shopmyEmail);
        await scope.locator("input[type='password']").first().fill(shopmyPassword);
        await scope.locator('input[type="submit"], input[value="LOG IN"], button:has-text("Log In"), [class*="login-btn"]').first().click();
        await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
        await page.locator('a[href="/links"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
        await sleep(5000);
        const linksNav = page.locator('a[href="/links"]').first();
        if ((await linksNav.count()) > 0) {
          await linksNav.click();
          await page.waitForURL(/\/links/, { timeout: 15000 }).catch(() => {});
          await sleep(3000);
        }
      }
    }

    // Download CSV from each page; stay in-app (click nav) to keep session
    let headerLine = null;
    const allRows = [];
    const linksSteps = [
      { click: 'a[href="/links"], a[href="/links/mentions"]', urlMatch: /\/links/, source: "links" },
      { click: 'a[href="/links/domains"]', urlMatch: /\/links\/domains/, source: "domains" },
      { click: 'a[href="/links/creator-orders"]', urlMatch: /\/links\/creator-orders/, source: "creator-orders" },
    ];
    for (const step of linksSteps) {
      const navEl = page.locator(step.click).first();
      if ((await navEl.count()) > 0) {
        await navEl.click();
        await page.waitForURL(step.urlMatch, { timeout: 20000 }).catch(() => {});
      } else {
        await page.goto(SHOPMY_PAGES.find((p) => p.source === step.source).url, { waitUntil: "domcontentloaded", timeout: 25000 });
      }
      await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
      await sleep(5000);
      const raw = await getCsvFromPage(page, step.source);
      if (raw) {
        const lines = raw.trim().split("\n").filter((l) => l.trim());
        const header = lines[0] || "";
        if (!headerLine) headerLine = "Source," + (header.startsWith("Source,") ? header.replace(/^Source,/, "") : header);
        const rows = lines.slice(1).map((line) => `"${step.source}",${line}`);
        allRows.push(...rows);
      }
    }

    // Earnings (/payouts): click nav to avoid full reload
    const earningsNav = page.locator('a[href="/payouts"]').first();
    if ((await earningsNav.count()) > 0) {
      await earningsNav.click();
      await page.waitForURL(/\/payouts/, { timeout: 15000 }).catch(() => {});
    } else {
      await page.goto(EARNINGS_URL, { waitUntil: "domcontentloaded", timeout: 25000 });
    }
    await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 15000 }).catch(() => {});
    const earningsCsvs = await getEarningsCsvs(page);
    for (const { source, csvText } of earningsCsvs) {
      const lines = csvText.trim().split("\n").filter((l) => l.trim());
      const header = lines[0] || "";
      if (!headerLine) headerLine = "Source," + (header.startsWith("Source,") ? header.replace(/^Source,/, "") : header);
      const rows = lines.slice(1).map((line) => `"${source}",${line}`);
      allRows.push(...rows);
    }

    if (headerLine && allRows.length > 0) csvData = headerLine + "\n" + allRows.join("\n");
    else if (allRows.length > 0) csvData = "Source\n" + allRows.join("\n");
    else {
      // Login succeeded; export/table not found – include DOM snippet so you can search for export/download
      const afterLoginUrl = page.url();
      if (process.env.DEBUG_HTML) debugHtmlSnippet = await getPageDebugSnippet(page);
      error = "Login OK. No CSV or table found on links/domains/creator-orders or earnings (Commissions/Payment report). Check Browserbase session replay. Last URL: " + afterLoginUrl;
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

/** Login to ShopMy and return cookies for reuse. Uses Auth/session API first, then fallback to popup. */
async function getShopMyCookiesAfterLogin(shopmyEmail, shopmyPassword) {
  if (!shopmyEmail || !shopmyPassword) return { error: "shopmyEmail and shopmyPassword required" };
  const bb = new Browserbase({ apiKey });
  let session;
  try {
    session = await bb.sessions.create({ projectId });
  } catch (e) {
    return { error: "Browserbase session failed: " + e.message };
  }
  const browser = await chromium.connectOverCDP(session.connectUrl);
  const defaultContext = browser.contexts()[0];
  const page = defaultContext.pages()[0] || (await defaultContext.newPage());
  await page.setViewportSize({ width: 1280, height: 720 });
  try {
    await page.goto("https://shopmy.us/home", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(2000);
    const sessionId = String(Date.now());
    const apiLoginOk = await page.evaluate(
      async ({ username, password, xSessionId }) => {
        try {
          const res = await fetch("https://apiv3.shopmy.us/api/Auth/session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-apicache-bypass": "true",
              "x-session-id": xSessionId,
            },
            credentials: "include",
            body: JSON.stringify({ username, password }),
          });
          return res.ok;
        } catch {
          return false;
        }
      },
      { username: shopmyEmail, password: shopmyPassword, xSessionId: sessionId }
    );
    if (!apiLoginOk) {
      const openLogin = page.locator('a:has-text("Log In"), a:has-text("Log in"), button:has-text("Log In")').first();
      await openLogin.click();
      await sleep(1500);
      await page.getByText(/log\s*in\s*to\s*continue/i).first().waitFor({ state: "visible", timeout: 10000 });
      const dialog = page.getByRole("dialog").first();
      const scope = (await dialog.count()) > 0 ? dialog : page;
      await scope.locator("input[type='email'], input[type='text']").first().fill(shopmyEmail);
      await scope.locator("input[type='password']").first().fill(shopmyPassword);
      await scope.locator('input[type="submit"], input[value="LOG IN"], button:has-text("Log In"), [class*="login-btn"]').first().click();
      await page.locator(".auth-modal-inner-container.login").waitFor({ state: "hidden", timeout: 25000 }).catch(() => {});
    }
    await page.locator('a[href="/links"]').waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
    await sleep(2000);
    const cookies = await defaultContext.cookies();
    await browser.close();
    return { cookies };
  } catch (e) {
    await browser.close().catch(() => {});
    return { error: e.message || String(e) };
  }
}

app.post("/run", async (req, res) => {
  try {
    const body = req.body || {};
    const cookies = body.cookies ?? body.shopmy_cookies;
    const result = await runShopMyScrape({
      creatorId: body.creatorId ?? body.creator_id,
      creatorEmail: body.creatorEmail ?? body.creator_email ?? "",
      shopmyEmail: body.shopmyEmail ?? body.shopmy_email,
      shopmyPassword: body.shopmyPassword ?? body.shopmy_password,
      cookies: Array.isArray(cookies) ? cookies : undefined,
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

/** POST /auth/refresh – body: { shopmyEmail, shopmyPassword }. Logs in and returns { cookies } to store; use cookies in POST /run to skip login. */
app.post("/auth/refresh", async (req, res) => {
  try {
    const body = req.body || {};
    const result = await getShopMyCookiesAfterLogin(body.shopmyEmail ?? body.shopmy_email, body.shopmyPassword ?? body.shopmy_password);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log("ShopMy Browserbase runner listening on port", PORT);
});
