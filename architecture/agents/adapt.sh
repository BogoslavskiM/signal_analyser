#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ROLE_DIR="$ROOT/architecture/agents/roles"
adapter=codex
force=0

for arg in "$@"; do
  case "$arg" in
    --adapter=*) adapter="${arg#--adapter=}" ;;
    --force) force=1 ;;
    --dry-run) echo "adapter=$adapter (dry-run)"; exit 0 ;;
    --help|-h) echo "Usage: bash architecture/agents/adapt.sh --adapter=codex [--force]"; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done
[[ "$adapter" == codex ]] || { echo "Only codex adapter is enabled" >&2; exit 2; }

role_files=("$ROLE_DIR"/*.toml)
for role_file in "${role_files[@]}"; do
  role=$(sed -n 's/^name = "\([^"]*\)"/\1/p' "$role_file" | head -1)
  label=$(sed -n 's/^label = "\([^"]*\)"/\1/p' "$role_file" | head -1)
  level=$(sed -n 's/^model_level = "\([^"]*\)"/\1/p' "$role_file" | head -1)
  case "$level" in high) reasoning=xhigh; model=gpt-5.6-sol;; medium) reasoning=medium; model=gpt-5.6-terra;; low) reasoning=low; model=gpt-5.6-luna;; *) echo "Invalid model_level in $role_file" >&2; exit 1;; esac
  out="$ROOT/.codex/agents/$role.toml"
  if [[ -w "$ROOT/.codex/agents" ]]; then
    {
      echo "# Generated from architecture/agents/roles/$(basename "$role_file")"
      echo "name = \"$role\""
      echo "description = \"$label\""
      echo "model = \"$model\""
      echo "model_reasoning_effort = \"$reasoning\""
      echo
      sed -n '/^developer_instructions = """$/,/^"""$/p' "$role_file"
    } > "$out"
  else
    echo "WARN: cannot write $out; .codex is read-only" >&2
  fi
done

if [[ -e "$ROOT/AGENTS.md" && "$force" != 1 ]]; then
  echo "AGENTS.md exists; use --force to regenerate" >&2
  exit 1
fi
{
  echo '# Generated Agent Instructions'
  echo
  echo 'Generated from `architecture/agents/`. Do not edit by hand.'
  echo
  echo '## Bootstrap'
  echo
  echo '- Read `architecture/agents/manifest.toml`.'
  echo '- Read the active role in `architecture/agents/roles/`.'
  echo '- Treat `architecture/` as the source of truth.'
  echo '- Return the structured handoff required by the role contract.'
  echo
  echo '## Target'
  echo
  echo '- Engee: production only at `https://engee.com`.'
  echo '- Devhub and fallback are forbidden.'
  echo '- Never persist credentials.'
  echo
  echo '## Roles'
  echo
  printf '%s\n' '| Role | Label | Model |' '|---|---|---|'
  for role_file in "${role_files[@]}"; do
    role=$(sed -n 's/^name = "\([^"]*\)"/\1/p' "$role_file" | head -1)
    label=$(sed -n 's/^label = "\([^"]*\)"/\1/p' "$role_file" | head -1)
    level=$(sed -n 's/^model_level = "\([^"]*\)"/\1/p' "$role_file" | head -1)
    printf '| `%s` | %s | %s |\n' "$role" "$label" "$level"
  done
} > "$ROOT/AGENTS.md"
echo "Generated Codex architecture for ${#role_files[@]} roles"
