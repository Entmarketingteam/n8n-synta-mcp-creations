/**
 * ShopMy Browserbase runner – single run (for CLI or cron).
 * Usage: BROWSERBASE_API_KEY=... BROWSERBASE_PROJECT_ID=... node run-one.js
 * Expects stdin JSON: { creatorId, creatorEmail, shopmyEmail, shopmyPassword }
 * Outputs JSON to stdout: { csvData?, creatorId, creatorEmail, error? }
 */

import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const apiKey = process.env.BROWSERBASE_API_KEY;
const projectId = process.env.BROWSERBASE_PROJECT_ID;

if (!apiKey || !projectId) {
  console.error(JSON.stringify({ error: "BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID required" }));
  process.exit(1);
}

const input = await new Promise((resolve, reject) => {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (c) => (buf += c));
  process.stdin.on("end", () => {
    try {
      resolve(JSON.parse(buf || "{}"));
    } catch (e) {
      reject(e);
    }
  });
}).catch((e) => {
  console.error(JSON.stringify({ error: "Invalid JSON stdin: " + e.message }));
  process.exit(1);
});

const { creatorId = "unknown", creatorEmail = "", shopmyEmail, shopmyPassword } = input;
if (!shopmyEmail || !shopmyPassword) {
  console.error(JSON.stringify({ error: "shopmyEmail and shopmyPassword required", creatorId, creatorEmail }));
  process.exit(1);
}

const bb = new Browserbase({ apiKey });
let session;

try {
  session = await bb.sessions.create({ projectId });
} catch (e) {
  console.error(JSON.stringify({ error: "Browserbase session create failed: " + e.message, creatorId, creatorEmail }));
  process.exit(1);
}

const browser = await chromium.connectOverCDP(session.connectUrl);
const defaultContext = browser.contexts()[0];
const page = defaultContext.pages()[0] || (await defaultContext.newPage());

let csvData = null;
let error = null;

try {
  // ShopMy: adjust URLs and selectors after inspecting the live site
  const baseUrl = "https://shopmy.us";
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Look for login link or form (customize selectors)
  const loginLink = await page.locator('a[href*="login"], a:has-text("Log in"), [data-testid="login"]').first();
  if (await loginLink.count()) {
    await loginLink.click();
    await page.waitForLoadState("domcontentloaded");
  }

  // Fill credentials (customize selectors for ShopMy)
  await page.getByRole("textbox", { name: /email|login/i }).fill(shopmyEmail);
  await page.getByLabel(/password/i).fill(shopmyPassword);
  await page.getByRole("button", { name: /log in|sign in|submit/i }).click();
  await page.waitForLoadState("networkidle").catch(() => {});

  // Navigate to Links or Earnings tab to export (customize path)
  const linksOrEarnings = await page.locator('a[href*="links"], a[href*="earnings"], [data-tab="links"]').first();
  if (await linksOrEarnings.count()) {
    await linksOrEarnings.click();
    await page.waitForLoadState("domcontentloaded");
  }

  // Look for Export / Download CSV (customize selector)
  const exportBtn = await page.locator('button:has-text("Export"), button:has-text("Download"), a:has-text("CSV"), [data-action="export"]').first();
  if (await exportBtn.count()) {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15000 }).catch(() => null),
      exportBtn.click(),
    ]);
    if (download) {
      const path = await download.path();
      const fs = await import("fs");
      csvData = fs.readFileSync(path, "utf8");
    }
  }

  // Fallback: if no download, try to get table text as CSV-like content
  if (!csvData) {
    const table = await page.locator("table").first();
    if (await table.count()) {
      const rows = await table.locator("tr").allTextContents();
      csvData = rows.map((r) => r.trim().replace(/\t/g, ",")).join("\n");
    }
  }

  if (!csvData) {
    error = "Could not find export or table on ShopMy; update selectors in run-one.js";
  }
} catch (e) {
  error = e.message || String(e);
} finally {
  await browser.close();
}

const out = { creatorId, creatorEmail };
if (error) out.error = error;
else out.csvData = csvData;
console.log(JSON.stringify(out));
