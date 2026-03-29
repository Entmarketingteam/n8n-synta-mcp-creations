#!/usr/bin/env node
/**
 * Deploy the fixed slack-markitdown workflow to n8n and activate it.
 *
 * Reads: scripts/slack-markitdown-fixed.json
 * Target: workflow BaABQXevdM8jJVuH on entagency.app.n8n.cloud
 *
 * Requires: N8N_API_KEY (via Doppler or env)
 * Run:  doppler run -- node scripts/fix-slack-markitdown-workflow.js
 *   or: N8N_API_KEY=xxx node scripts/fix-slack-markitdown-workflow.js
 *
 * Flags:
 *   --dry-run     Print the payload without deploying
 *   --no-activate Deploy but don't activate the workflow
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'https://entagency.app.n8n.cloud').replace(/\/$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'BaABQXevdM8jJVuH';
const WORKFLOW_FILE = path.join(__dirname, 'slack-markitdown-fixed.json');

const DRY_RUN = process.argv.includes('--dry-run');
const NO_ACTIVATE = process.argv.includes('--no-activate');

function request(options, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(options.url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY,
        ...options.headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', (ch) => (data += ch));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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
  // 1. Read the fixed workflow JSON
  if (!fs.existsSync(WORKFLOW_FILE)) {
    console.error('Missing workflow file:', WORKFLOW_FILE);
    process.exit(1);
  }
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));

  if (!workflow.nodes || !workflow.connections) {
    console.error('Invalid workflow file: needs nodes and connections');
    process.exit(1);
  }

  console.log(`Loaded ${workflow.nodes.length} nodes from ${path.basename(WORKFLOW_FILE)}`);

  const payload = {
    name: 'Slack file/URL → MarkItDown → LLM → reply',
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: 'v1' },
  };

  if (DRY_RUN) {
    console.log('\n--dry-run: would PUT to', `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (!N8N_API_KEY) {
    console.error('Missing N8N_API_KEY. Run with: doppler run -- node scripts/fix-slack-markitdown-workflow.js');
    process.exit(1);
  }

  // 2. Deploy: PUT the workflow
  const putUrl = `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}`;
  console.log(`Deploying to ${putUrl} ...`);
  await request({ url: putUrl, method: 'PUT' }, payload);
  console.log('Workflow deployed successfully.');

  // 3. Activate (unless --no-activate)
  if (!NO_ACTIVATE) {
    const activateUrl = `${N8N_BASE_URL}/api/v1/workflows/${WORKFLOW_ID}/activate`;
    console.log('Activating workflow...');
    try {
      await request({ url: activateUrl, method: 'POST' });
      console.log('Workflow activated.');
    } catch (e) {
      // Some n8n versions use PATCH on the workflow with active: true
      console.log('Activate endpoint failed, trying PATCH...');
      await request({ url: putUrl, method: 'PATCH' }, { active: true });
      console.log('Workflow activated via PATCH.');
    }
  }

  console.log('\nDone! Test by posting a URL in #markitdownurl on Slack.');
}

main().catch((e) => {
  console.error('Deploy failed:', e.message);
  process.exit(1);
});
