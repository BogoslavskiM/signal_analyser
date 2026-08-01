#!/usr/bin/env bash
set -euo pipefail

PLAYWRIGHT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${PLAYWRIGHT_DIR}/../.." && pwd)"
CDP_PORT="${PLAYWRIGHT_CDP_PORT:-9222}"
CDP_URL="${PLAYWRIGHT_CDP_URL:-http://127.0.0.1:${CDP_PORT}}"
CHROME_PROFILE="${PLAYWRIGHT_CHROME_PROFILE:-/tmp/genie-playwright-chrome}"
PAGE_URL_MATCH="${PLAYWRIGHT_PAGE_URL_MATCH:-/genie/}"
CANONICAL_TARGET_MANIFEST="${ROOT_DIR}/architecture/agents/manifest.toml"
REQUESTED_TARGET_MANIFEST="${PLAYWRIGHT_TARGET_MANIFEST:-}"
CURRENT=0
NO_LAUNCH=0
APP_URL=""

usage() {
  cat <<'EOF'
Usage:
  ./test/playwright/run_devhub_playwright_tests.sh <allowed-engee-app-url>
  ./test/playwright/run_devhub_playwright_tests.sh --current

Options:
  --current     Use an already-open tab from the project-allowed Engee origin.
  --no-launch   Connect only to an existing CDP Chrome.
  -h, --help    Show this help.

Environment:
  PLAYWRIGHT_CDP_PORT=9222
  PLAYWRIGHT_CDP_URL=http://127.0.0.1:9222
  PLAYWRIGHT_CHROME_PROFILE=/tmp/genie-playwright-chrome
  PLAYWRIGHT_PAGE_URL_MATCH=/genie/
  PLAYWRIGHT_TARGET_MANIFEST=architecture/agents/manifest.toml
  PLAYWRIGHT_ALLOWED_ORIGINS=https://allowed.example
  PLAYWRIGHT_SPEC=smoke/app_load
  PLAYWRIGHT_FEATURES=settings-controls,inspector-ui
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

if [[ "$CURRENT" -eq 0 && -z "$APP_URL" ]]; then
  usage >&2
  exit 2
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Missing node command." >&2
  exit 2
fi

manifest_target_value() {
  local key="$1"
  awk -v key="$key" '
    /^\[engee_target\]/ { in_target = 1; next }
    /^\[/ && in_target { exit }
    in_target && $0 ~ "^" key " = " {
      sub("^" key " = ", "")
      gsub(/^"/, "")
      gsub(/"$/, "")
      print
      exit
    }
  ' "$TARGET_MANIFEST"
}

if [[ -e "$CANONICAL_TARGET_MANIFEST" ]]; then
  if [[ -n "$REQUESTED_TARGET_MANIFEST" ]]; then
    if [[ ! -e "$REQUESTED_TARGET_MANIFEST" ]] ||
       [[ ! "$CANONICAL_TARGET_MANIFEST" -ef "$REQUESTED_TARGET_MANIFEST" ]]; then
      echo "PLAYWRIGHT_TARGET_MANIFEST cannot override existing canonical manifest: ${CANONICAL_TARGET_MANIFEST}" >&2
      exit 2
    fi
  fi
  TARGET_MANIFEST="$CANONICAL_TARGET_MANIFEST"
else
  TARGET_MANIFEST="${REQUESTED_TARGET_MANIFEST:-$CANONICAL_TARGET_MANIFEST}"
fi

manifest_has_engee_target() {
  awk '
    /^\[engee_target\]/ { found = 1 }
    END { exit(found ? 0 : 1) }
  ' "$TARGET_MANIFEST"
}

CONFIG_ALLOWED_ORIGINS="$(node -e '
  const config = require(process.argv[1]);
  const values = config.target && Array.isArray(config.target.allowedOrigins)
    ? config.target.allowedOrigins
    : [];
  process.stdout.write(values.join(","));
' "${PLAYWRIGHT_DIR}/e2e.config.js")"
ENV_ALLOWED_ORIGINS="${PLAYWRIGHT_ALLOWED_ORIGINS:-}"

if [[ -e "$TARGET_MANIFEST" ]]; then
  if [[ ! -f "$TARGET_MANIFEST" ]]; then
    echo "Configured target manifest is not a regular file: ${TARGET_MANIFEST}" >&2
    exit 2
  fi
  if ! manifest_has_engee_target; then
    echo "Existing project manifest has no [engee_target]: ${TARGET_MANIFEST}" >&2
    exit 2
  fi

  MANIFEST_BASE_URL="$(manifest_target_value base_url)"
  if [[ -z "$MANIFEST_BASE_URL" ]]; then
    echo "Existing project [engee_target] has no base_url: ${TARGET_MANIFEST}" >&2
    exit 2
  fi

  ALLOWED_ORIGINS="$(node -e '
    const policy = require(process.argv[1]);
    const locked = policy.resolveAllowedOrigins({}, process.argv[2]);
    const normalized = values => values.slice().sort().join(",");
    for (const [label, raw] of [
      ["PLAYWRIGHT_ALLOWED_ORIGINS", process.argv[3]],
      ["e2e.config.js target.allowedOrigins", process.argv[4]],
    ]) {
      if (!raw || !raw.trim()) continue;
      const candidate = policy.resolveAllowedOrigins({}, raw);
      if (normalized(candidate) !== normalized(locked)) {
        throw new Error(`${label} conflicts with locked [engee_target].base_url`);
      }
    }
    process.stdout.write(locked.join(","));
  ' "${PLAYWRIGHT_DIR}/support/target_policy.js" "$MANIFEST_BASE_URL" "$ENV_ALLOWED_ORIGINS" "$CONFIG_ALLOWED_ORIGINS")"
else
  ALLOWED_ORIGINS="$(node -e '
    const policy = require(process.argv[1]);
    const environmentValue = process.argv[2];
    const configValue = process.argv[3];
    const environmentOrigins = environmentValue && environmentValue.trim()
      ? policy.resolveAllowedOrigins({}, environmentValue)
      : [];
    const configOrigins = configValue && configValue.trim()
      ? policy.resolveAllowedOrigins({}, configValue)
      : [];
    const normalized = values => values.slice().sort().join(",");
    if (environmentOrigins.length && configOrigins.length &&
        normalized(environmentOrigins) !== normalized(configOrigins)) {
      throw new Error("PLAYWRIGHT_ALLOWED_ORIGINS conflicts with e2e.config.js target.allowedOrigins");
    }
    const effective = environmentOrigins.length ? environmentOrigins : configOrigins;
    if (!effective.length) {
      throw new Error(
        "No target manifest and no allowed origins configured in environment or e2e.config.js"
      );
    }
    process.stdout.write(effective.join(","));
  ' "${PLAYWRIGHT_DIR}/support/target_policy.js" "$ENV_ALLOWED_ORIGINS" "$CONFIG_ALLOWED_ORIGINS")"
fi

if [[ "$CURRENT" -eq 0 ]]; then
  node -e '
    const policy = require(process.argv[1]);
    const origins = policy.resolveAllowedOrigins({}, process.argv[3]);
    policy.assertAllowedUrl(process.argv[2], origins, "application URL");
  ' "${PLAYWRIGHT_DIR}/support/target_policy.js" "$APP_URL" "$ALLOWED_ORIGINS"
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
  echo "Running Playwright tests against current allowed Engee tab matching: ${PAGE_URL_MATCH}"
  PLAYWRIGHT_CDP_URL="$CDP_URL" \
  PLAYWRIGHT_PAGE_URL_MATCH="$PAGE_URL_MATCH" \
  PLAYWRIGHT_ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  npm --prefix "$PLAYWRIGHT_DIR" run test -- --current
else
  echo "Running Playwright tests against URL: ${APP_URL}"
  PLAYWRIGHT_CDP_URL="$CDP_URL" \
  PLAYWRIGHT_ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  npm --prefix "$PLAYWRIGHT_DIR" run test -- "$APP_URL"
fi
