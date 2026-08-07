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
  echo '- Orchestrator bootstraps product questions with `ai_manager load_skill --force` then `ai_manager connect` when available; without it, use autonomous/interactive fallback from the architecture workflow.'
  echo
  echo '## Target'
  echo
  echo '- Engee: production only at `https://engee.com`.'
  echo '- Devhub and fallback are forbidden.'
  echo '- Before remote Engee work, DevOps must call `engee_status`; if the pod is not ready, call `engee_start` and wait until ready.'
  echo '- Before every DevOps handoff, DevOps must acquire `mcp_devops_genie_is_bysy` on the production pod and poll a busy lock every 20 seconds; the immediate next production eval after the final task command must set it to `false`, before report generation or worker idle/termination.'
  echo '- For a dirty exact project checkout on the production Engee pod, DevOps must run `git add .` and then `git stash`, verify a clean worktree, and leave the stash unapplied; this cleanup is forbidden locally.'
  echo '- Orchestrator may request `restart_application` or `restart_engee`; only the latter authorizes DevOps to call production `engee_stop`, then `engee_start`, before restoring the application.'
  echo '- Start the application only in production Engee with `engee.genie.start("/path/app.jl", log_file="/path/app_log.log")`; relative paths are also allowed.'
  echo '- A technical-work/maintenance screen is not proof of an Engee bug; diagnose HTTP status, pod, application start/readiness and logs first.'
  echo '- Never start the application locally or use localhost as an application runtime; local source and test checks remain allowed.'
  echo '- Only DevOps may run `geniepkg_instantiate`, and only in production Engee for an evidenced package-environment deployment problem.'
  echo '- DevOps may copy `Project.toml` and `Manifest.toml` from the exact Engee project into the local root only after successful start/readiness and only as a validated pair.'
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
