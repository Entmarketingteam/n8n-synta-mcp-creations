#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# --- Node.js dependencies (shopmy-browserbase-runner) ---
if [ -d "$CLAUDE_PROJECT_DIR/shopmy-browserbase-runner" ]; then
  cd "$CLAUDE_PROJECT_DIR/shopmy-browserbase-runner"
  npm install --ignore-scripts 2>/dev/null || true
  cd "$CLAUDE_PROJECT_DIR"
fi

# --- Python dependencies ---
if command -v pip >/dev/null 2>&1; then
  pip install -q \
    playwright pandas requests python-dotenv flask \
    2>/dev/null || true
fi

# --- SQLite3 (ensure available for migration validation) ---
if ! command -v sqlite3 >/dev/null 2>&1; then
  apt-get update -qq && apt-get install -y -qq sqlite3 2>/dev/null || true
fi

# --- ESLint for JavaScript linting ---
if ! command -v npx >/dev/null 2>&1 || ! npx eslint --version >/dev/null 2>&1; then
  npm install -g eslint 2>/dev/null || true
fi

# --- Set PYTHONPATH for imports ---
echo "export PYTHONPATH=\"$CLAUDE_PROJECT_DIR\"" >> "$CLAUDE_ENV_FILE"
