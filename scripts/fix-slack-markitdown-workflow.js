#!/usr/bin/env node
/**
 * Fetch workflow BaABQXevdM8jJVuH from n8n, apply all IF + Set node fixes, PUT back.
 *
 * Requires: N8N_API_KEY, optional N8N_BASE_URL (default https://entagency.app.n8n.cloud)
 * Run: node scripts/fix-slack-markitdown-workflow.js
 */

const https = require('https');
const http = require('http');

const N8N_BASE_URL = process.env.N8N_BASE_URL || 'https://entagency.app.n8n.cloud';
const N8N_API_KEY = process.env.N8N_API_KEY;
const WORKFLOW_ID = 'BaABQXevdM8jJVuH';

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

const ifOptions = { caseSensitive: true, leftValue: '', typeValidation: 'strict' };

function fixNode(node) {
  const name = node.name;
  const params = node.parameters || {};

  // --- IF nodes: add conditions.conditions array ---
  if (node.type === 'n8n-nodes-base.if' && node.typeVersion === 2) {
    const conditions = params.conditions || {};
    if (!Array.isArray(conditions.conditions)) {
      let leftValue, rightValue, operator;
      switch (name) {
        case 'Slack URL verification?':
          leftValue = "={{ ($json.body && $json.body.type) || $json.type || '' }}";
          rightValue = 'url_verification';
          operator = { type: 'string', operation: 'equals' };
          break;
        case 'Event type (file vs message)':
          leftValue = "={{ ($json.body && $json.body.event && $json.body.event.type) || ($json.event && $json.event.type) || '' }}";
          rightValue = 'file_shared';
          operator = { type: 'string', operation: 'equals' };
          break;
        case 'Not from bot?':
          leftValue = "={{ ($json.body && $json.body.event && $json.body.event.bot_id) || ($json.event && $json.event.bot_id) || '' }}";
          rightValue = '';
          operator = { type: 'string', operation: 'equals' };
          break;
        case 'Has URL?':
          leftValue = '={{ $json.url }}';
          rightValue = '';
          operator = { type: 'string', operation: 'notEmpty' };
          break;
        case 'Conversion OK?':
          leftValue = '={{ $json.ok }}';
          rightValue = true;
          operator = { type: 'boolean', operation: 'equals' };
          break;
        default:
          return node;
      }
      node.parameters = {
        ...params,
        conditions: {
          combinator: conditions.combinator || 'and',
          options: conditions.options || ifOptions,
          conditions: [{ id: name.replace(/\?|\s/g, '_').slice(0, 20), leftValue, rightValue, operator }],
        },
      };
    }
    return node;
  }

  // --- Set nodes: add assignments ---
  if (node.type === 'n8n-nodes-base.set' && node.typeVersion === 3.4) {
    const hasAssignments = params.assignments && Array.isArray(params.assignments.assignments) && params.assignments.assignments.length > 0;
    if (!hasAssignments) {
      switch (name) {
        case 'Normalize inbound (Slack → internal)':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'source', name: 'source', value: 'slack', type: 'string' },
                { id: 'channel_id', name: 'channel_id', value: "={{ ($json.body && $json.body.event && $json.body.event.channel_id) || $json.channel_id || '' }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ ($json.body && $json.body.event && $json.body.event.ts) || $json.thread_ts || '' }}", type: 'string' },
                { id: 'file_id', name: 'file_id', value: "={{ ($json.body && $json.body.event && $json.body.event.file_id) || $json.file_id || '' }}", type: 'string' },
                { id: 'filename', name: 'filename', value: "={{ ($json.body && $json.body.event && $json.body.event.file && $json.body.event.file.name) || $json.filename || 'document' }}", type: 'string' },
                { id: 'ok', name: 'ok', value: true, type: 'boolean' },
              ],
            },
            options: {},
          };
          break;
        case 'Normalize message (URL)':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'channel_id', name: 'channel_id', value: "={{ ($json.body && $json.body.event && $json.body.event.channel_id) || $json.channel_id || '' }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ ($json.body && $json.body.event && $json.body.event.ts) || $json.thread_ts || '' }}", type: 'string' },
                { id: 'url', name: 'url', value: "={{ ($json.body && $json.body.event && $json.body.event.text) || $json.text || '' }}", type: 'string' },
              ],
            },
            options: {},
          };
          break;
        case 'Reply context (file)':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'channel_id', name: 'channel_id', value: "={{ $('Normalize inbound (Slack → internal)').item.json.channel_id }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ $('Normalize inbound (Slack → internal)').item.json.thread_ts }}", type: 'string' },
              ],
            },
            options: {},
          };
          break;
        case 'Reply context (message)':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'channel_id', name: 'channel_id', value: "={{ $('Normalize message (URL)').item.json.channel_id }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ $('Normalize message (URL)').item.json.thread_ts }}", type: 'string' },
              ],
            },
            options: {},
          };
          break;
        case 'Normalize MarkItDown response':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'channel_id', name: 'channel_id', value: "={{ $('Normalize inbound (Slack → internal)').item.json.channel_id || $('Normalize message (URL)').item.json.channel_id }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ $('Normalize inbound (Slack → internal)').item.json.thread_ts || $('Normalize message (URL)').item.json.thread_ts }}", type: 'string' },
                { id: 'ok', name: 'ok', value: "={{ ($json.body && $json.body.markdown) || $json.markdown ? true : false }}", type: 'boolean' },
                { id: 'markdown', name: 'markdown', value: "={{ ($json.body && $json.body.markdown) || $json.markdown || '' }}", type: 'string' },
                { id: 'error', name: 'error', value: "={{ ($json.body && $json.body.error) || $json.error || '' }}", type: 'string' },
              ],
            },
            options: {},
          };
          break;
        case 'Normalize LLM output':
          node.parameters = {
            ...params,
            mode: 'manual',
            duplicateItem: false,
            assignments: {
              assignments: [
                { id: 'channel_id', name: 'channel_id', value: "={{ $('Normalize MarkItDown response').item.json.channel_id }}", type: 'string' },
                { id: 'thread_ts', name: 'thread_ts', value: "={{ $('Normalize MarkItDown response').item.json.thread_ts }}", type: 'string' },
                { id: 'llm_response', name: 'llm_response', value: "={{ $json.message && $json.message.content || ($json.choices && $json.choices[0] && $json.choices[0].message && $json.choices[0].message.content) || $json.text || JSON.stringify($json) }}", type: 'string' },
              ],
            },
            options: {},
          };
          break;
        default:
          break;
      }
    }
    return node;
  }

  return node;
}

async function main() {
  let workflow;

  const fromFile = process.argv.find((a) => a.startsWith('--from-file='));
  const outputFile = process.argv.find((a) => a.startsWith('--output='));

  if (fromFile) {
    const path = fromFile.split('=')[1];
    const fs = require('fs');
    const raw = JSON.parse(fs.readFileSync(path, 'utf8'));
    workflow = raw.data || raw;
    if (!workflow.nodes || !workflow.connections) {
      console.error('Invalid workflow file: need data.nodes and data.connections');
      process.exit(1);
    }
  } else if (N8N_API_KEY) {
    const base = N8N_BASE_URL.replace(/\/$/, '');
    const getUrl = `${base}/api/v1/workflows/${WORKFLOW_ID}`;
    const putUrl = `${base}/api/v1/workflows/${WORKFLOW_ID}`;
    console.log('Fetching workflow...');
    const getRes = await request({ url: getUrl, method: 'GET' });
    workflow = getRes.data || getRes;
    if (!workflow.nodes || !workflow.connections) {
      console.error('Invalid workflow response:', Object.keys(getRes));
      process.exit(1);
    }
  } else {
    console.error('Missing N8N_API_KEY. Set it in your environment, or use --from-file=path/to/workflow.json --output=fixed.json');
    process.exit(1);
  }

  console.log('Applying fixes to', workflow.nodes.length, 'nodes...');
  workflow.nodes = workflow.nodes.map(fixNode);

  if (outputFile) {
    const path = outputFile.split('=')[1];
    const fs = require('fs');
    fs.writeFileSync(path, JSON.stringify({ nodes: workflow.nodes, connections: workflow.connections }, null, 2));
    console.log('Wrote', path);
    return;
  }

  if (!N8N_API_KEY) return;

  const base = N8N_BASE_URL.replace(/\/$/, '');
  const putUrl = `${base}/api/v1/workflows/${WORKFLOW_ID}`;
  console.log('Putting workflow back...');
  const putPayload = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: 'v1' },
  };
  await request({ url: putUrl, method: 'PUT' }, putPayload);

  console.log('Done. Workflow "Slack file → MarkItDown → LLM → reply" updated. Activate and test from Slack.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
