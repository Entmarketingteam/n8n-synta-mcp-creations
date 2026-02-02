/**
 * LTK Browserbase runner – painless auth and data extraction for n8n.
 *
 * When LTK won't whitelist n8n's OAuth callback:
 * - One-time: POST /auth/ltk or /run-ltk with { email, password } → browser logs in, tokens captured automatically.
 * - After that: POST /run-ltk with { refresh_token } → refresh via HTTP, no browser. No DevTools, no manual copy-paste.
 *
 * POST /refresh-ltk { refresh_token } → returns { access_token, refresh_token?, ... } (no browser).
 * POST /auth/ltk { email, password } → browser login, returns { access_token, refresh_token }.
 * POST /run-ltk { refresh_token } | { email, password } → returns { user_info, commissions, performance_summary, refresh_token? }.
 *
 * Env: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, PORT (default 3334)
 */

import express from "express";
import { chromium } from "playwright-core";
import Browserbase from "@browserbasehq/sdk";

const app = express();
app.use(express.json({ limit: "512kb" }));

const apiKey = process.env.BROWSERBASE_API_KEY;
const projectId = process.env.BROWSERBASE_PROJECT_ID;
const PORT = Number(process.env.PORT) || 3334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LTK_TOKEN_URL = "https://creator-auth.shopltk.com/oauth/token";
const LTK_CLIENT_ID = "iKyQz7GfBMBPqUqCbbKSNBUlM2VpNWUT";
const LTK_REDIRECT_URI = "https://creator.shopltk.com/login/callback";
const LTK_API_BASE = "https://api-gateway.rewardstyle.com";

if (!apiKey || !projectId) {
  console.error("Set BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID");
  process.exit(1);
}

/** POST /refresh-ltk { refresh_token } – get new access_token (no browser). */
async function refreshLtkTokens(refreshToken) {
  const body = new URLSearchParams({
    client_id: LTK_CLIENT_ID,
    redirect_uri: LTK_REDIRECT_URI,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch(LTK_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LTK refresh failed ${res.status}: ${text}`);
  }
  return res.json();
}

/** Call LTK API with Bearer token. */
async function ltkApiGet(accessToken, path, query = {}) {
  const url = new URL(path, LTK_API_BASE);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`LTK API ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

/** Fetch user_info, commissions_summary, performance_summary. */
async function fetchLtkData(accessToken) {
  const [user_info, commissions, performance_summary] = await Promise.all([
    ltkApiGet(accessToken, "/api/co-api/v1/get_user_info"),
    ltkApiGet(accessToken, "/api/creator-analytics/v1/commissions_summary", { currency: "USD" }),
    ltkApiGet(accessToken, "/api/creator-analytics/v1/performance_summary", {
      start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
      timezone: "UTC",
    }),
  ]);
  return { user_info, commissions, performance_summary };
}

/** Browser login to creator.shopltk.com, capture access_token and refresh_token from network. */
async function authLtkWithBrowser(email, password) {
  const bb = new Browserbase({ apiKey });
  let session;
  try {
    session = await bb.sessions.create({ projectId });
  } catch (e) {
    return { error: "Browserbase session failed: " + e.message };
  }

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.setViewportSize({ width: 1280, height: 720 });

  let access_token = null;
  let refresh_token = null;

  const captureTokenResponse = async (response) => {
    const url = response.url();
    if (!url.includes("creator-auth.shopltk.com/oauth/token")) return;
    if (response.request().method() !== "POST") return;
    try {
      const json = await response.json();
      if (json.access_token) access_token = json.access_token;
      if (json.refresh_token) refresh_token = json.refresh_token;
    } catch (_) {}
  };

  const captureAuthHeader = (request) => {
    if (!request.url().includes("api-gateway.rewardstyle.com")) return;
    const auth = request.headers()["authorization"];
    if (auth && auth.startsWith("Bearer ") && !access_token) access_token = auth.slice(7);
  };

  page.on("response", captureTokenResponse);
  page.on("request", captureAuthHeader);

  try {
    await page.goto("https://creator.shopltk.com/", { waitUntil: "domcontentloaded", timeout: 25000 });
    await sleep(3000);

    const loginUrl = page.url();
    const isLoginPage = loginUrl.includes("creator-auth.shopltk.com") || loginUrl.includes("login");
    if (!isLoginPage) {
      await page.goto("https://creator-auth.shopltk.com/login?client=KSenkBytnHBh35hIVUm1m54WAGpLrtOz&protocol=oauth2&audience=https%3A%2F%2Fcreator-api-gateway.shopltk.com%2Flegacy&scope=openid+profile+email+ltk.publisher&response_type=code&response_mode=query", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      await sleep(2000);
    }

    const emailSel = 'input[type="email"], input[name="username"], input[name="email"], input[autocomplete="username"]';
    const passSel = 'input[type="password"], input[name="password"]';
    const submitSel = 'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), [name="action"][value="default"]';

    const emailEl = page.locator(emailSel).first();
    const passEl = page.locator(passSel).first();
    if ((await emailEl.count()) > 0) await emailEl.fill(email);
    if ((await passEl.count()) > 0) await passEl.fill(password);

    const submit = page.locator(submitSel).first();
    if ((await submit.count()) > 0) {
      await submit.click();
    } else {
      await page.keyboard.press("Enter");
    }

    await page.waitForURL(/creator\.shopltk\.com/, { timeout: 45000 }).catch(() => {});
    await sleep(5000);

    if (!access_token) {
      await page.goto("https://creator.shopltk.com/earnings", { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
      await sleep(6000);
    }

    if (!access_token || !refresh_token) {
      const fromStorage = await page.evaluate(() => {
        const out = { access_token: null, refresh_token: null };
        try {
          for (const storage of [localStorage, sessionStorage]) {
            for (let i = 0; i < storage.length; i++) {
              const key = storage.key(i) || "";
              if (!key.includes("@@auth0spajs@@")) continue;
              const raw = storage.getItem(key);
              if (!raw) continue;
              const parsed = JSON.parse(raw);
              const body = parsed?.body;
              if (body?.access_token) out.access_token = body.access_token;
              if (body?.refresh_token) out.refresh_token = body.refresh_token;
              if (out.access_token && out.refresh_token) return out;
            }
          }
        } catch (_) {}
        return out;
      });
      if (fromStorage.access_token) access_token = access_token || fromStorage.access_token;
      if (fromStorage.refresh_token) refresh_token = refresh_token || fromStorage.refresh_token;
    }

    if (!access_token && !refresh_token) {
      const cookies = await ctx.cookies();
      const refreshCookie = cookies.find((c) => c.name.includes("refresh") || c.name === "auth._refresh_token.auth0");
      if (refreshCookie?.value) refresh_token = refreshCookie.value;
    }
  } catch (e) {
    return { error: "LTK browser login failed: " + e.message };
  } finally {
    await browser.close();
  }

  if (!access_token && !refresh_token) return { error: "Could not capture tokens. Check Browserbase replay; login may have failed or selectors changed." };
  if (!access_token && refresh_token) {
    try {
      const refreshed = await refreshLtkTokens(refresh_token);
      access_token = refreshed.access_token;
      if (refreshed.refresh_token) refresh_token = refreshed.refresh_token;
    } catch (e) {
      return { error: "Got refresh_token but refresh failed: " + e.message };
    }
  }
  return { access_token, refresh_token };
}

// --- Routes ---

app.post("/refresh-ltk", async (req, res) => {
  const { refresh_token: refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: "refresh_token required" });
  }
  try {
    const data = await refreshLtkTokens(refreshToken);
    return res.json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
});

app.post("/auth/ltk", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }
  try {
    const out = await authLtkWithBrowser(email, password);
    if (out.error) return res.status(502).json(out);
    return res.json(out);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
});

app.post("/run-ltk", async (req, res) => {
  const { refresh_token: refreshToken, email, password } = req.body || {};
  let access_token = null;
  let refresh_token = null;

  if (refreshToken) {
    try {
      const data = await refreshLtkTokens(refreshToken);
      access_token = data.access_token;
      refresh_token = data.refresh_token ?? refreshToken;
    } catch (e) {
      return res.status(502).json({ error: "Refresh failed: " + e.message });
    }
  } else if (email && password) {
    const auth = await authLtkWithBrowser(email, password);
    if (auth.error) return res.status(502).json(auth);
    access_token = auth.access_token;
    refresh_token = auth.refresh_token;
  } else {
    return res.status(400).json({ error: "Provide refresh_token or email+password" });
  }

  if (!access_token) {
    return res.status(502).json({ error: "No access_token after auth/refresh" });
  }

  try {
    const data = await fetchLtkData(access_token);
    const out = { ...data };
    if (refresh_token) out.refresh_token = refresh_token;
    return res.json(out);
  } catch (e) {
    return res.status(502).json({ error: "LTK API failed: " + e.message });
  }
});

app.get("/health", (_, res) => res.json({ ok: true, service: "ltk-browserbase-runner" }));

app.listen(PORT, () => console.log("ltk-browserbase-runner listening on", PORT));
