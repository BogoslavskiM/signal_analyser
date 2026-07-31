#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${PLAYWRIGHT_DIR}/../.." && pwd)"
CDP_PORT="${PLAYWRIGHT_CDP_PORT:-9222}"
CDP_URL="${PLAYWRIGHT_CDP_URL:-http://127.0.0.1:${CDP_PORT}}"
CHROME_PROFILE="${PLAYWRIGHT_CHROME_PROFILE:-/tmp/genie-playwright-chrome}"
PAGE_URL_MATCH="${PLAYWRIGHT_PAGE_URL_MATCH:-/user/apps/signal_analyser}"
CURRENT=0
NO_LAUNCH=0
APP_URL=""

usage() {
  cat <<'EOF'
Usage:
  ./test/playwright/run_devhub_playwright_tests.sh <prod-application-url>
  ./test/playwright/run_devhub_playwright_tests.sh --current

Options:
  --current     Use the already-open devhub tab and skip navigation.
  --no-launch   Connect only to an existing CDP Chrome.
  -h, --help    Show this help.

Environment:
  PLAYWRIGHT_CDP_PORT=9222
  PLAYWRIGHT_CDP_URL=http://127.0.0.1:9222
  PLAYWRIGHT_CHROME_PROFILE=/tmp/genie-playwright-chrome
  PLAYWRIGHT_PAGE_URL_MATCH=/user/apps/signal_analyser
  PLAYWRIGHT_APP_URL=https://example.invalid/user/apps/signal_analyser
  PLAYWRIGHT_SPEC=signal_analyser/plot_contracts
  PLAYWRIGHT_FEATURES=layout-geometry,graph-output-zone
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --current)
      CURRENT=1
      shift
      ;;
    --no-launch)
      NO_LAUNCH=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -n "$APP_URL" ]]; then
        echo "Unexpected extra argument: $1" >&2
        usage >&2
        exit 2
      fi
      APP_URL="$1"
      shift
      ;;
  esac
done

if [[ -z "$APP_URL" ]]; then
  APP_URL="${PLAYWRIGHT_APP_URL:-}"
fi

if [[ "$CURRENT" -eq 0 && -z "$APP_URL" ]]; then
  usage >&2
  exit 2
fi

if ! command -v vpnp >/dev/null 2>&1; then
  echo "Missing vpnp command." >&2
  exit 2
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Missing npm command." >&2
  exit 2
fi

if [[ ! -d "$PLAYWRIGHT_DIR/node_modules/playwright-core" ]]; then
  echo "Missing Playwright dependencies. Run: cd test/playwright && npm install" >&2
  exit 2
fi

cd "$ROOT_DIR"

cdp_ready() {
  curl -fsS "${CDP_URL}/json/version" >/dev/null 2>&1
}

wait_for_cdp() {
  local deadline=$((SECONDS + 30))
  until cdp_ready; do
    if (( SECONDS >= deadline )); then
      echo "Chrome DevTools endpoint did not become ready: ${CDP_URL}" >&2
      echo "Check /tmp/genie-playwright-chrome.log for vpnp google output." >&2
      exit 1
    fi
    sleep 0.5
  done
}

if [[ "$NO_LAUNCH" -eq 0 ]]; then
  if cdp_ready; then
    echo "Using existing Chrome DevTools endpoint: ${CDP_URL}"
  else
    echo "Starting proxied Chrome through vpnp google on ${CDP_URL}"
    if [[ -n "$APP_URL" && "$CURRENT" -eq 0 ]]; then
      vpnp google \
        "--remote-debugging-port=${CDP_PORT}" \
        "--user-data-dir=${CHROME_PROFILE}" \
        "$APP_URL" >/tmp/genie-playwright-chrome.log 2>&1 &
    else
      vpnp google \
        "--remote-debugging-port=${CDP_PORT}" \
        "--user-data-dir=${CHROME_PROFILE}" >/tmp/genie-playwright-chrome.log 2>&1 &
    fi
  fi
fi

wait_for_cdp

if [[ "$CURRENT" -eq 1 ]]; then
  echo "Running Playwright tests against current devhub tab matching: ${PAGE_URL_MATCH}"
  PLAYWRIGHT_CDP_URL="$CDP_URL" \
  PLAYWRIGHT_PAGE_URL_MATCH="$PAGE_URL_MATCH" \
  npm --prefix "$PLAYWRIGHT_DIR" run test -- --current
else
  echo "Running Playwright tests against URL: ${APP_URL}"
  PLAYWRIGHT_CDP_URL="$CDP_URL" \
  npm --prefix "$PLAYWRIGHT_DIR" run test -- "$APP_URL"
fi
