#!/usr/bin/env node
/**
 * One-time setup: ensure LTK_Credentials table exists in Airtable and add one row (Creator + Refresh_Token).
 *
 * Required env:
 *   AIRTABLE_API_KEY  - Personal access token (scopes: data.records:read/write, schema.bases:read, schema.bases:write if creating table)
 *   BASE_ID           - Base ID (default: appQnKyfyRyhHX44h)
 *   LTK_REFRESH_TOKEN - Refresh token from browser (Local Storage auth._refresh_token.auth0)
 *
 * Optional env:
 *   TABLE_ID          - If table already exists, use its ID (tblXXX). Otherwise script will try to find/create by name.
 *   CREATOR_NAME      - Display name (default: Nicki Entenmann)
 *   CREATE_TABLE      - Set to 1 to try creating table if missing (requires schema.bases:write)
 *
 * Run: AIRTABLE_API_KEY=xxx LTK_REFRESH_TOKEN=xxx node ltk-refresh-token-sync/scripts/setup-airtable.js
 */

const BASE_ID = process.env.BASE_ID || 'appQnKyfyRyhHX44h';
const TABLE_NAME = 'LTK_Credentials';
const API_KEY = process.env.AIRTABLE_API_KEY;
const REFRESH_TOKEN = process.env.LTK_REFRESH_TOKEN;
const CREATOR_NAME = process.env.CREATOR_NAME || 'Nicki Entenmann';
const TABLE_ID_ENV = process.env.TABLE_ID;
const CREATE_TABLE = process.env.CREATE_TABLE === '1';

if (!API_KEY || !REFRESH_TOKEN) {
  console.error('Set AIRTABLE_API_KEY and LTK_REFRESH_TOKEN');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

async function getBaseSchema() {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, { headers });
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function createTable() {
  const body = {
    name: TABLE_NAME,
    description: 'LTK refresh tokens for self-healing sync',
    fields: [
      { name: 'Creator', type: 'singleLineText', description: 'Display name' },
      { name: 'Refresh_Token', type: 'multilineText', description: 'From browser Local Storage' },
      { name: 'Access_Token', type: 'multilineText', description: 'Filled by workflow' },
      { name: 'ID_Token', type: 'multilineText', description: 'Filled by workflow' },
    ],
  };
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create table ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.id; // table id
}

async function addRecord(tableId) {
  const url = `https://api.airtable.com/v0/${BASE_ID}/${tableId}`;
  const body = {
    records: [{ fields: { Creator: CREATOR_NAME, Refresh_Token: REFRESH_TOKEN } }],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Add record ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.records[0].id;
}

async function main() {
  let tableId = TABLE_ID_ENV;

  if (!tableId) {
    const schema = await getBaseSchema();
    const tables = schema.tables || [];
    const found = tables.find((t) => t.name === TABLE_NAME);
    if (found) {
      tableId = found.id;
      console.log(`Found table "${TABLE_NAME}" (${tableId})`);
    } else if (CREATE_TABLE) {
      console.log(`Creating table "${TABLE_NAME}"...`);
      tableId = await createTable();
      console.log(`Created table ${tableId}`);
    } else {
      console.error(
        `Table "${TABLE_NAME}" not found in base ${BASE_ID}. Create it in Airtable (see AIRTABLE-SCHEMA.md) or set CREATE_TABLE=1 to try creating via API.`
      );
      process.exit(1);
    }
  }

  const recordId = await addRecord(tableId);
  console.log('Added record:', recordId);
  console.log('');
  console.log('Next: In n8n open workflow "LTK Self-Healing Token Sync" and set:');
  console.log('  - Airtable Get Creators + Airtable Update Tokens → Table =', tableId);
  console.log('  - Store to Sheets → your doc + sheet');
  console.log('Then run with Manual Trigger.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
