#!/usr/bin/env bash
# Verify creator data pipeline webhooks respond.
# n8n base URL (change if different)
BASE="${N8N_WEBHOOK_BASE:-https://entagency.app.n8n.cloud/webhook}"

echo "=== Creator pipelines webhook check ==="
echo "Base: $BASE"
echo ""

# 1) Amazon Associates Report Ingest
echo "1. Amazon Associates Report Ingest (amazon-report-ingest)"
AMAZON_STATUS=$(curl -s -o /tmp/amazon_ingest_out.json -w "%{http_code}" -X POST "$BASE/amazon-report-ingest" \
  -H "Content-Type: application/json" \
  -d '{"creator_id":"verify-test","csvData":"Date,Earnings\n2025-01-01,0.00"}')
if [ "$AMAZON_STATUS" = "200" ]; then
  echo "   OK (HTTP $AMAZON_STATUS)"
  [ -f /tmp/amazon_ingest_out.json ] && head -c 200 /tmp/amazon_ingest_out.json && echo ""
else
  echo "   FAIL (HTTP $AMAZON_STATUS)"
  [ -f /tmp/amazon_ingest_out.json ] && cat /tmp/amazon_ingest_out.json
fi
echo ""

# 2) ShopMy CSV Processor
echo "2. ShopMy CSV Processor (shopmy-csv-creators)"
SHOPMY_STATUS=$(curl -s -o /tmp/shopmy_csv_out.json -w "%{http_code}" -X POST "$BASE/shopmy-csv-creators" \
  -H "Content-Type: application/json" \
  -d '{"creatorId":"verify-test","creatorEmail":"test@example.com","csvData":"Transaction Date,Commission\n2025-01-01,0.00","reportType":"shopmy_export"}')
if [ "$SHOPMY_STATUS" = "200" ]; then
  echo "   OK (HTTP $SHOPMY_STATUS)"
  [ -f /tmp/shopmy_csv_out.json ] && head -c 200 /tmp/shopmy_csv_out.json && echo ""
else
  echo "   FAIL (HTTP $SHOPMY_STATUS)"
  [ -f /tmp/shopmy_csv_out.json ] && cat /tmp/shopmy_csv_out.json
fi
echo ""

echo "=== Done ==="
if [ "$AMAZON_STATUS" != "200" ] || [ "$SHOPMY_STATUS" != "200" ]; then
  echo "Tip: 404 'webhook is not registered' means the workflow is INACTIVE. Activate it in n8n (toggle top-right), then re-run this script."
fi
echo "If both show OK, webhooks are reachable. Check n8n executions for full success."
echo "Mavely and ShopMy Browserbase / Amazon Get Token: run manually in n8n (Manual Trigger) after setting credentials/runner URL."
