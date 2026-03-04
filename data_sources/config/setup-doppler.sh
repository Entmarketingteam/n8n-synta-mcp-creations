#!/usr/bin/env bash
# Setup script to pull SEO Machine secrets from Doppler into data_sources/config/.env
#
# Prerequisites:
#   1. Install Doppler CLI: curl -sS https://cli.doppler.com/install.sh | sh
#   2. Set your service token (or run `doppler login` for interactive auth)
#
# Usage:
#   # Option A: With service token (non-interactive, for CI/containers)
#   DOPPLER_TOKEN="dp.st.dev.your-token-here" bash setup-doppler.sh
#
#   # Option B: Interactive (after `doppler login`)
#   bash setup-doppler.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env"

echo "==> Pulling secrets from Doppler..."

# Download secrets as env format
if [ -n "${DOPPLER_TOKEN:-}" ]; then
    doppler secrets download --no-file --format env > "${ENV_FILE}"
else
    doppler secrets download --no-file --format env > "${ENV_FILE}"
fi

echo "==> Wrote secrets to ${ENV_FILE}"
echo "==> Keys found:"
grep -c '=' "${ENV_FILE}" | xargs -I{} echo "    {} variables"
echo ""
echo "Done. The .env file is gitignored and safe to use locally."
