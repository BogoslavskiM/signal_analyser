#!/usr/bin/env bash
set -euo pipefail

AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHITECTURE_DIR="$(cd "$AGENTS_DIR/.." && pwd)"
REPO_ROOT="$(cd "$AGENTS_DIR/../.." && pwd)"
MANIFEST_PATH="$AGENTS_DIR/manifest.toml"

ADAPTERS=(codex claude cursor windsurf cline roo gemini)
ROLE_FILES=(
  "$AGENTS_DIR/roles/architect.toml"
  "$AGENTS_DIR/roles/backend.toml"
  "$AGENTS_DIR/roles/frontend.toml"
  "$AGENTS_DIR/roles/tester.toml"
  "$AGENTS_DIR/roles/e2e-tester.toml"
  "$AGENTS_DIR/roles/devops.toml"
  "$AGENTS_DIR/roles/matlab-researcher.toml"
)

adapter=""
dry_run=0
force=0
list=0

usage() {
  cat <<'USAGE'
Usage:
  bash architecture/agents/adapt.sh
  bash architecture/agents/adapt.sh --list
  bash architecture/agents/adapt.sh --adapter=codex --dry-run
  bash architecture/agents/adapt.sh --adapter=claude --force

Options:
  --adapter=<name>  Adapter name: codex, claude, cursor, windsurf, cline, roo, gemini.
  --dry-run         Print files that would be generated without writing.
  --force           Overwrite existing generated files without prompting.
  --list            List available adapters.
  --help            Print this help.
USAGE
}

for arg in "$@"; do
  case "$arg" in
    --adapter=*) adapter="${arg#--adapter=}" ;;
    --dry-run) dry_run=1 ;;
    --force) force=1 ;;
    --list) list=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "Unknown argument: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

rel() {
  local path="$1"
  printf '%s\n' "${path#$REPO_ROOT/}"
}

toml_value() {
  local file="$1"
  local key="$2"
  sed -n "s/^${key} = \"\\(.*\\)\"/\\1/p" "$file" | head -n 1
}

toml_bool_value() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    $1 == key && $2 == "=" && ($3 == "true" || $3 == "false") {
      print $3
      exit
    }
  ' "$file"
}

workflow_value() {
  local key="$1"
  awk -v key="$key" '
    /^\[workflow\]/ { in_workflow = 1; next }
    /^\[/ && in_workflow { exit }
    in_workflow && $0 ~ "^" key " = " {
      sub("^" key " = ", "")
      gsub(/^"/, "")
      gsub(/"$/, "")
      print
      exit
    }
  ' "$MANIFEST_PATH"
}

toml_array_line() {
  local file="$1"
  local key="$2"
  sed -n "s/^${key} = //p" "$file" | head -n 1
}

toml_array_markdown() {
  local file="$1"
  local key="$2"
  local line
  line="$(toml_array_line "$file" "$key")"
  if [[ -z "$line" || "$line" == "[]" ]]; then
    printf '%s\n' "- none"
    return
  fi
  printf '%s\n' "$line" | grep -o '"[^"]*"' | sed 's/^"//; s/"$//; s/^/- `/; s/$/`/'
}

toml_multiline_array_items() {
  local file="$1"
  local key="$2"
  awk -v key="$key" '
    $0 ~ "^" key " = \\[" { inside = 1; next }
    inside && /^\]/ { exit }
    inside { print }
  ' "$file" | grep -o '"[^"]*"' | sed 's/^"//; s/"$//'
}

developer_instructions() {
  local file="$1"
  awk '
    /^developer_instructions = """/ { inside = 1; next }
    inside && /^"""/ { exit }
    inside { print }
  ' "$file"
}

adapter_tool() {
  case "$1" in
    codex) printf '%s\n' "Codex" ;;
    claude) printf '%s\n' "Claude Code" ;;
    cursor) printf '%s\n' "Cursor" ;;
    windsurf) printf '%s\n' "Windsurf Cascade" ;;
    cline) printf '%s\n' "Cline" ;;
    roo) printf '%s\n' "Roo Code" ;;
    gemini) printf '%s\n' "Gemini CLI" ;;
    *) printf '%s\n' "Unknown" ;;
  esac
}

model_for_adapter() {
  local selected="$1"
  local level="$2"

  case "$selected:$level" in
    codex:high) printf '%s\n' "gpt-5.6" ;;
    codex:medium) printf '%s\n' "gpt-5.6-terra" ;;
    codex:low) printf '%s\n' "gpt-5.3-codex-spark" ;;
    claude:high) printf '%s\n' "opus" ;;
    claude:medium) printf '%s\n' "sonnet" ;;
    claude:low) printf '%s\n' "haiku" ;;
    cursor:high) printf '%s\n' "claude-4-opus" ;;
    cursor:medium) printf '%s\n' "claude-4-sonnet" ;;
    cursor:low) printf '%s\n' "cursor-small" ;;
    windsurf:high) printf '%s\n' "Claude Opus 4.7" ;;
    windsurf:medium) printf '%s\n' "Claude Sonnet 4.6" ;;
    windsurf:low) printf '%s\n' "SWE-1.6" ;;
    cline:high|roo:high) printf '%s\n' "claude-opus-4-7" ;;
    cline:medium|roo:medium) printf '%s\n' "claude-sonnet-4-6" ;;
    cline:low|roo:low) printf '%s\n' "claude-haiku-4-5" ;;
    gemini:high) printf '%s\n' "gemini-3.1-pro-preview" ;;
    gemini:medium) printf '%s\n' "gemini-3-flash-preview" ;;
    gemini:low) printf '%s\n' "gemini-3.1-flash-lite" ;;
    *)
      echo "No model mapping for adapter '$selected' and level '$level'." >&2
      return 1
      ;;
  esac
}

model_binding_for_adapter() {
  case "$1" in
    codex|claude|gemini) printf '%s\n' "native" ;;
    cursor|windsurf|cline|roo) printf '%s\n' "advisory" ;;
    *) echo "Unknown adapter: $1" >&2; return 1 ;;
  esac
}

validate_role_models() {
  local selected="$1"
  local file name level

  for file in "${ROLE_FILES[@]}"; do
    name="$(toml_value "$file" name)"
    level="$(toml_value "$file" model_level)"
    if [[ -z "$level" ]]; then
      echo "Role '$name' has no model_level in $(rel "$file")." >&2
      return 1
    fi
    model_for_adapter "$selected" "$level" >/dev/null
  done
}

adapter_exists() {
  local name="$1"
  local item
  for item in "${ADAPTERS[@]}"; do
    [[ "$item" == "$name" ]] && return 0
  done
  return 1
}

list_adapters() {
  local item
  for item in "${ADAPTERS[@]}"; do
    printf '%s\t%s\t%s\n' "$item" "$(adapter_tool "$item")" "built-in: architecture/agents/adapt.sh"
  done
}

prompt_adapter() {
  echo "Available agent adapters:"
  local index=1
  local item
  for item in "${ADAPTERS[@]}"; do
    printf '  %s. %s - %s\n' "$index" "$item" "$(adapter_tool "$item")"
    index=$((index + 1))
  done
  printf 'Select adapter by number or name: '
  local answer
  read -r answer

  if [[ "$answer" =~ ^[0-9]+$ ]] && (( answer >= 1 && answer <= ${#ADAPTERS[@]} )); then
    adapter="${ADAPTERS[$((answer - 1))]}"
    return
  fi

  if adapter_exists "$answer"; then
    adapter="$answer"
    return
  fi

  echo "Unknown adapter selection: $answer" >&2
  exit 2
}

confirm() {
  local question="$1"
  printf '%s [y/N]: ' "$question"
  local answer
  read -r answer
  answer="$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')"
  case "$answer" in
    y|yes) return 0 ;;
    *) return 1 ;;
  esac
}

role_summary_markdown() {
  local selected="$1"
  cat <<'EOF'
## Roles

| Role | Model level | Resolved model | Owns | Read-only | Forbidden |
| --- | --- | --- | --- | --- | --- |
EOF

  local file name model_level model owns read_only forbidden
  for file in "${ROLE_FILES[@]}"; do
    name="$(toml_value "$file" name)"
    model_level="$(toml_value "$file" model_level)"
    model="$(model_for_adapter "$selected" "$model_level")"
    owns="$(toml_array_line "$file" owns)"
    read_only="$(toml_array_line "$file" read_only)"
    forbidden="$(toml_array_line "$file" forbidden)"
    [[ -z "$read_only" ]] && read_only="[]"
    [[ -z "$forbidden" ]] && forbidden="[]"
    printf '| `%s` | `%s` | `%s` | %s | %s | %s |\n' \
      "$name" "$model_level" "$model" "$owns" "$read_only" "$forbidden"
  done
}

bootstrap_markdown() {
  cat <<'EOF'
- Read architecture/agents/manifest.toml.
- Read the active role file from architecture/agents/roles/*.toml.
- Treat architecture/ as source of truth.
- Do not edit outside the active role owns paths.
- Return a handoff instead of crossing role boundaries.
EOF
}

verification_markdown() {
  toml_multiline_array_items "$MANIFEST_PATH" verification_commands | sed 's/^/- `/; s/$/`/'
}

common_markdown() {
  local selected="$1"

  cat <<EOF
# Generated Agent Instructions

Generated from \`architecture/agents/\`.

Do not edit generated adapter files by hand. Update \`architecture/agents/\`
and rerun:

\`\`\`bash
bash architecture/agents/adapt.sh --adapter=$selected
\`\`\`

## Source Of Truth

- Manifest: \`architecture/agents/manifest.toml\`
- Roles: \`architecture/agents/roles/*.toml\`
- Adapter renderer: \`architecture/agents/adapt.sh --adapter=$selected\`
- Documentation: \`architecture/documentation/\`
- Skills: \`architecture/skills/\`

## Bootstrap

$(bootstrap_markdown)

## Workflow

- Lead role: \`$(workflow_value lead_role)\`
- Reporting: \`$(workflow_value reporting)\`
- Handoff policy: \`$(workflow_value handoff_policy)\`
- Strict boundaries: \`$(toml_bool_value "$MANIFEST_PATH" strict_boundaries)\`

$(role_summary_markdown "$selected")

## Verification Commands

$(verification_markdown)
EOF
}

role_markdown() {
  local file="$1"
  local selected="$2"
  local name label description model_level model binding
  name="$(toml_value "$file" name)"
  label="$(toml_value "$file" label)"
  description="$(toml_value "$file" description)"
  model_level="$(toml_value "$file" model_level)"
  model="$(model_for_adapter "$selected" "$model_level")"
  binding="$(model_binding_for_adapter "$selected")"

  case "$selected" in
    claude)
      cat <<EOF
---
name: $name
description: $description
model: $model
---

EOF
      ;;
    gemini)
      cat <<EOF
---
name: $name
description: $description
kind: local
model: $model
---

EOF
      ;;
  esac

  cat <<EOF
# $label

$description

## Model

- Source level: \`$model_level\`
- Resolved model for $(adapter_tool "$selected"): \`$model\`
- Binding: \`$binding\`

## Owns

$(toml_array_markdown "$file" owns)

## Read-only

$(toml_array_markdown "$file" read_only)

## Forbidden

$(toml_array_markdown "$file" forbidden)

## Verification

$(toml_array_markdown "$file" verification)

## Instructions

$(developer_instructions "$file")
EOF
}

generated_config_toml() {
  local selected="$1"
  cat <<EOF
# Generated from architecture/agents/.
# Adapter: $selected ($(adapter_tool "$selected"))
# Source of truth: $(toml_value "$MANIFEST_PATH" source_of_truth)
# Manifest: architecture/agents/manifest.toml
# Strict role boundaries: $(toml_bool_value "$MANIFEST_PATH" strict_boundaries)

[agents]
enabled = true
max_concurrent_threads_per_session = ${#ROLE_FILES[@]}
EOF
}

role_toml() {
  local file="$1"
  local selected="$2"
  local name description model_level model
  name="$(toml_value "$file" name)"
  description="$(toml_value "$file" description | sed 's/"/\\"/g')"
  model_level="$(toml_value "$file" model_level)"
  model="$(model_for_adapter "$selected" "$model_level")"

  cat <<EOF
# Generated from $(rel "$file").
# Source model level: $model_level
name = "$name"
description = "$description"
model = "$model"
developer_instructions = """
Source role: $(rel "$file")

Owned paths:
$(toml_array_markdown "$file" owns)

Read-only paths:
$(toml_array_markdown "$file" read_only)

Forbidden paths:
$(toml_array_markdown "$file" forbidden)

Verification:
$(toml_array_markdown "$file" verification)

$(developer_instructions "$file")
"""
EOF
}

cursor_rule_markdown() {
  local selected="$1"
  cat <<EOF
---
description: Generated strict multi-agent workflow for this Genie app
alwaysApply: true
---

$(common_markdown "$selected")
EOF
}

plan_outputs() {
  local selected="$1"
  outputs=()

  case "$selected" in
    codex)
      outputs+=("AGENTS.md")
      outputs+=(".codex/config.toml")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".codex/agents/$role_name.toml")
      done
      ;;
    claude)
      outputs+=("CLAUDE.md")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".claude/agents/$role_name.md")
      done
      ;;
    cursor)
      outputs+=(".cursor/rules/multi-agent-workflow.mdc")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".cursor/rules/role-$role_name.mdc")
      done
      ;;
    windsurf)
      outputs+=(".windsurf/rules/multi-agent-workflow.md")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".windsurf/rules/role-$role_name.md")
      done
      ;;
    cline)
      outputs+=(".clinerules/multi-agent-workflow.md")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".clinerules/role-$role_name.md")
      done
      ;;
    roo)
      outputs+=(".roo/rules/multi-agent-workflow.md")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".roo/rules/role-$role_name.md")
      done
      ;;
    gemini)
      outputs+=("GEMINI.md")
      local file role_name
      for file in "${ROLE_FILES[@]}"; do
        role_name="$(toml_value "$file" name)"
        outputs+=(".gemini/agents/$role_name.md")
      done
      ;;
    *) echo "No renderer implemented for adapter: $selected" >&2; exit 2 ;;
  esac
}

write_file() {
  local relative_path="$1"
  local full_path="$REPO_ROOT/$relative_path"
  mkdir -p "$(dirname "$full_path")"

  case "$relative_path" in
    AGENTS.md|CLAUDE.md|GEMINI.md|.windsurf/rules/multi-agent-workflow.md|.clinerules/multi-agent-workflow.md|.roo/rules/multi-agent-workflow.md)
      common_markdown "$adapter" > "$full_path"
      ;;
    .codex/config.toml)
      generated_config_toml "$adapter" > "$full_path"
      ;;
    .cursor/rules/multi-agent-workflow.mdc)
      cursor_rule_markdown "$adapter" > "$full_path"
      ;;
    .codex/agents/*.toml)
      local role_name="${relative_path##*/}"
      role_name="${role_name%.toml}"
      local file
      for file in "${ROLE_FILES[@]}"; do
        [[ "$(toml_value "$file" name)" == "$role_name" ]] && role_toml "$file" "$adapter" > "$full_path" && return
      done
      ;;
    .claude/agents/*.md|.cursor/rules/role-*.mdc|.windsurf/rules/role-*.md|.clinerules/role-*.md|.roo/rules/role-*.md|.gemini/agents/*.md)
      local role_name="${relative_path##*/}"
      role_name="${role_name#role-}"
      role_name="${role_name%.md}"
      role_name="${role_name%.mdc}"
      local file
      for file in "${ROLE_FILES[@]}"; do
        [[ "$(toml_value "$file" name)" == "$role_name" ]] && role_markdown "$file" "$adapter" > "$full_path" && return
      done
      ;;
    *) echo "Unknown output path: $relative_path" >&2; exit 2 ;;
  esac
}

write_outputs() {
  local existing=()
  local output
  for output in "${outputs[@]}"; do
    [[ -f "$REPO_ROOT/$output" ]] && existing+=("$output")
  done

  if (( dry_run )); then
    echo "Dry run. Files and directories that would be generated:"
    for output in "${outputs[@]}"; do
      printf '  %s\n' "$output"
    done
    return
  fi

  if (( ${#existing[@]} > 0 && ! force )); then
    echo "Existing files would be overwritten:"
    printf '  %s\n' "${existing[@]}"
    confirm "Overwrite these files?" || { echo "Aborted without writing files." >&2; exit 1; }
  fi

  for output in "${outputs[@]}"; do
    write_file "$output"
    echo "wrote $output"
  done
}

if (( list )); then
  list_adapters
  exit 0
fi

if [[ -z "$adapter" ]]; then
  prompt_adapter
fi

if ! adapter_exists "$adapter"; then
  echo "Unknown adapter: $adapter" >&2
  exit 2
fi

validate_role_models "$adapter"
plan_outputs "$adapter"

echo "Selected adapter: $adapter ($(adapter_tool "$adapter"))"
echo "Source of truth: architecture/agents/manifest.toml"
echo "Output files: ${#outputs[@]}"

if (( ! dry_run && ! force )); then
  confirm "Generate adapter files now?" || { echo "Aborted without writing files." >&2; exit 1; }
fi

write_outputs
