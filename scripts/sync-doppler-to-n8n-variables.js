#!/usr/bin/env node
/**
 * Sync Doppler secrets to n8n Variables (global) via n8n Public API.
 *
 * Run with Doppler so env vars are injected (never paste secrets in chat):
 *   doppler run -- node scripts/sync-doppler-to-n8n-variables.js
 *
 * Requires in Doppler (or env):
 *   - N8N_API_KEY
 *   - N8N_HOST or N8N_BASE_URL (e.g. https://entagency.app.n8n.cloud)
 *
 * All other keys in VARIABLE_NAMES below are read from process.env and
 * written to n8n as Variables (if set). Workflows use $env.VAR_NAME or
 * $vars.VAR_NAME depending on your n8n plan.
 */

const https = require('https');
const http = require('http');

const N8N_BASE_URL = (process.env.N8N_HOST || process.env.N8N_BASE_URL || 'https://entagency.app.n8n.cloud').replace(/\/$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;

const VARIABLE_NAMES = [
  'N8N_HOST',
  'N8N_API_KEY',
  'GOOGLE_API_KEY',
  'BROWSERBASE_API_KEY',
  'BROWSERBASE_PROJECT_ID',
  'OPENAI_API_KEY',
  'RAILWAY_API_KEY',
  'FIRECRAWL_API_KEY',
  'ANTHROPIC_API_KEY',
  'PINECONE_API_KEY',
  'PINECONE_VIRAL_LTK_KEY',
  'DATAFORSEO_API_KEY',
  'PERPLEXITY_API_KEY',
  'SERPAPI_API_KEY',
  'SUPABASE_API_KEY',
  'HUGGINGFACE_API_KEY',
  'FINDYMAIL_API_KEY',
  'SMARTLEAD_API_KEY',
  'SLACK_ACCESS_TOKEN',
  'SLACK_REFRESH_TOKEN',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'MEILISEARCH_API_KEY',
  'MEILISEARCH_HOST',
  'DEEPGRAM_API_KEY',
  'BLOTATO_API_KEY',
  'AIRTOP_API_KEY',
  'GCP_SERVICE_ACCOUNT_EMAIL',
  'GCP_LTK_SCRAPER_SERVICE_ACCOUNT',
  'APIFY_TOKEN',
  'APIFY_TIKTOK_ACTOR_ID',
  'SHOPMY_GSHEET_URL',
  'SHOPMY_AIRTABLE_BASE',
  'SHOPMY_AIRTABLE_TABLE',
  'SHOPMY_RUNNER_URL',
  'CREATOR_EARNINGS_SHEET_ID',
  'SHOPMY_NICKI_EMAIL',
  'SHOPMY_NICKI_PASSWORD',
  'MAVELY_EMAIL',
  'MAVELY_PASSWORD',
  'AMAZON_CREATORS_API_CLIENT_ID',
  'AMAZON_CREATORS_API_CLIENT_SECRET',
  'MARKITDOWN_API_URL',
  'WEBFLOW_COLLECTION_ID',
  'ELEVENLABS_API_KEY',
  'CREATOMATE_API_KEY',
  'PIAPI_API_KEY',
];

function parseUrl(url) {
  const u = new URL(url);
  return {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: u.pathname + u.search,
  };
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const url = parseUrl(options.url);
    const lib = url.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
        ...options.headers,
      },
    };
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (e) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body != null) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  if (!N8N_API_KEY) {
    console.error('Missing N8N_API_KEY. Run with: doppler run -- node scripts/sync-doppler-to-n8n-variables.js');
    process.exit(1);
  }

  const base = `${N8N_BASE_URL}/api/v1`;

  // Fetch existing variables (n8n API may return { data: [ { id, key, value?, ... } ] })
  let existing = [];
  try {
    const res = await request({ url: `${base}/variables`, method: 'GET' });
    existing = res.data || res.variables || [];
    if (!Array.isArray(existing)) existing = [];
  } catch (e) {
    if (e.message.includes('404') || e.message.includes('403')) {
      console.warn('Variables API not available or no access (e.g. need Pro/Enterprise).', e.message);
      process.exit(1);
    }
    throw e;
  }

  const byKey = {};
  for (const v of existing) {
    const k = v.key || v.name;
    if (k) byKey[k] = v;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const key of VARIABLE_NAMES) {
    const value = process.env[key];
    if (value === undefined || value === '') {
      skipped++;
      continue;
    }

    const body = { key, value };
    if (byKey[key] && byKey[key].id) {
      try {
        await request({ url: `${base}/variables/${byKey[key].id}`, method: 'PUT' }, body);
        updated++;
        console.log('Updated:', key);
      } catch (e) {
        console.error('Failed to update', key, e.message);
      }
    } else {
      try {
        await request({ url: `${base}/variables`, method: 'POST' }, body);
        created++;
        console.log('Created:', key);
      } catch (e) {
        console.error('Failed to create', key, e.message);
      }
    }
  }

  console.log('\nDone. Created:', created, 'Updated:', updated, 'Skipped (no value in env):', skipped);
  console.log('Workflows can use {{ $vars.VAR_NAME }} or $env if your instance maps Variables to env.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
