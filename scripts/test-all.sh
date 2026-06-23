#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Backend unit tests"
(cd "$ROOT/backend" && mvn test)

echo "==> Frontend unit tests"
(cd "$ROOT/frontend" && npm test)

echo "==> Frontend E2E (Playwright)"
echo "    Note: E2E requires running servers (frontend on :3000, backend API)."
echo "    Start them before this step, or set PLAYWRIGHT_START_SERVER=1 for auto dev server."
(cd "$ROOT/frontend" && npx playwright test)

echo "==> All test suites finished"
