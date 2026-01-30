#!/usr/bin/env node
/**
 * Import workflow JSON files into n8n via API.
 *
 * Requires:
 *   - N8N_API_KEY (Settings → n8n API in n8n)
 *   - N8N_BASE_URL (optional, default: https://entagency.app.n8n.cloud)
 *
 * Run from project root: node scripts/import-workflows-to-n8n.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://entagency.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY;

const WORKFLOWS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'content-repurposing-downloader-agent.json',
      'content-repurposing-uploader-agent.json',
      'advanced-content-creator-agent.json',
    ];

const workflowsDir = path.join(__dirname, '..', 'workflows');

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
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.path,
      method: options.method || 'POST',
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

// n8n API accepts only these top-level properties (no additional properties).
const ALLOWED_TOP_LEVEL = ['name', 'nodes', 'connections', 'settings'];

function prepareWorkflow(workflow) {
  const out = {};
  for (const key of ALLOWED_TOP_LEVEL) {
    if (workflow[key] !== undefined) {
      out[key] = workflow[key];
    }
  }
  if (!out.settings) out.settings = { executionOrder: 'v1' };
  return out;
}

async function main() {
  if (!N8N_API_KEY) {
    console.error('Missing N8N_API_KEY. Set it in your environment or use the n8n UI to import from file.');
    console.error('See docs/SETUP-N8N-WORKFLOWS.md for UI import steps.');
    process.exit(1);
  }

  const base = N8N_BASE_URL.replace(/\/$/, '');
  const apiUrl = `${base}/api/v1/workflows`;

  console.log(`Importing workflows to ${base} ...\n`);

  for (const file of WORKFLOWS) {
    const filePath = path.join(workflowsDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`Skip (not found): ${file}`);
      continue;
    }
    let workflow;
    try {
      workflow = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error(`Error reading ${file}:`, e.message);
      continue;
    }
    const payload = prepareWorkflow(workflow);
    try {
      const result = await request({ url: apiUrl, method: 'POST' }, payload);
      console.log(`Imported: ${workflow.name || file} (id: ${result.id || result.data?.id || '—'})`);
    } catch (e) {
      console.error(`Failed ${file}:`, e.message);
    }
  }

  console.log('\nDone. Open n8n and reconnect credentials for each workflow.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
