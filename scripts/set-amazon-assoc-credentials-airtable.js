#!/usr/bin/env node
/**
 * One-time: push Amazon Associates login (email + password) from .env into Airtable
 * so you can test the scraper or n8n workflows that read from Airtable.
 *
 * Secrets stay in your local .env — they are never committed.
 *
 * Required in .env (or as env vars):
 *   AIRTABLE_API_KEY   - Airtable Personal Access Token (scopes: data.records:read, data.records:write)
 *   AMAZON_ASSOC_EMAIL - Creator's Amazon Associates login email
 *   AMAZON_ASSOC_PASSWORD - Creator's Amazon Associates login password
 *
 * Optional in .env:
 *   BASE_ID    - Airtable base ID (default: appQnKyfyRyhHX44h)
 *   TABLE_ID   - Table ID (default: tblNovDWyu1iHoJf0)
 *   CREATOR_NAME - Row to update, e.g. "Nicki Entenmann"
 *
 * Airtable table must have columns: Creator, Email, Password
 * (Add "Email" and "Password" to your Creators API table if needed.)
 *
 * Run from repo root:
 *   node scripts/set-amazon-assoc-credentials-airtable.js
 * Or with env vars:
 *   AIRTABLE_API_KEY=patxxx AMAZON_ASSOC_EMAIL=... AMAZON_ASSOC_PASSWORD=... node scripts/set-amazon-assoc-credentials-airtable.js
 */

const fs = require('fs');
const path = require('path');

// Load .env from repo root if it exists (no external dependency)
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');
          else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'");
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
  // Also try amazon-associates-scraper/.env
  const scraperEnv = path.resolve(__dirname, '..', 'amazon-associates-scraper', '.env');
  if (fs.existsSync(scraperEnv)) {
    const content = fs.readFileSync(scraperEnv, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const key = trimmed.slice(0, eq).trim();
          let val = trimmed.slice(eq + 1).trim();
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/\\"/g, '"');
          else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1).replace(/\\'/g, "'");
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const BASE_ID = process.env.BASE_ID || 'appQnKyfyRyhHX44h';
const TABLE_ID = process.env.TABLE_ID || 'tblNovDWyu1iHoJf0';
const CREATOR_NAME = process.env.CREATOR_NAME || 'Nicki Entenmann';
const API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_PAT;
const EMAIL = process.env.AMAZON_ASSOC_EMAIL;
const PASSWORD = process.env.AMAZON_ASSOC_PASSWORD;

if (!API_KEY) {
  console.error('Missing AIRTABLE_API_KEY (or AIRTABLE_PAT). Set in .env or env.');
  process.exit(1);
}
if (!EMAIL || !PASSWORD) {
  console.error('Missing AMAZON_ASSOC_EMAIL or AMAZON_ASSOC_PASSWORD. Set in .env or env.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function findRecord() {
  const formula = encodeURIComponent(`{Creator}="${CREATOR_NAME}"`);
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}?filterByFormula=${formula}&maxRecords=1`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Airtable list ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.records || data.records.length === 0) {
    throw new Error(`No record found where Creator = "${CREATOR_NAME}". Add a row with Creator = "${CREATOR_NAME}" first, or set CREATOR_NAME to match an existing row.`);
  }
  return data.records[0].id;
}

async function patchRecord(recordId) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`;
  const body = {
    fields: {
      Email: EMAIL,
      Password: PASSWORD,
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 422 && text.includes('Unknown field name')) {
      throw new Error('Table missing "Email" or "Password" column. In Airtable add two columns: Email (Single line text), Password (Long text).');
    }
    throw new Error(`Airtable PATCH ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log('Finding record for Creator =', CREATOR_NAME, '...');
  const recordId = await findRecord();
  console.log('Updating record', recordId, 'with Email and Password...');
  await patchRecord(recordId);
  console.log('Done. Airtable row updated. You can test the scraper or n8n workflow that reads from this table.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
