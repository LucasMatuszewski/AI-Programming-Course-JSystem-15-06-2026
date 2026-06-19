#!/usr/bin/env bash
set -euo pipefail

# Codex Cloud runs this from the repository root.
# Keep API keys and other secrets in Codex Cloud environment settings.

echo "Node: $(node --version)"
echo "npm: $(npm --version)"

cd app

if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

# Optional: uncomment when you want setup to fail fast on a broken app.
# npm run lint
# npm test
# npm run build
