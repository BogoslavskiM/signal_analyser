#!/usr/bin/env python3
"""Fail on legacy documentation roots or broken relative Markdown links."""

from pathlib import Path
import re
import sys
from urllib.parse import unquote


DOC_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = DOC_ROOT.parents[1]
EXPECTED_ROOT = {"README.md", "user", "agents"}
LEGACY = {"tasks", "backlog", "handoff", "reports", "project.md"}
LINK_RE = re.compile(r"\[[^\]]*\]\(([^)]+)\)")


def main() -> int:
    errors: list[str] = []
    visible_entries = {entry.name for entry in DOC_ROOT.iterdir() if not entry.name.startswith(".")}

    if visible_entries != EXPECTED_ROOT:
        errors.append(
            f"documentation root must be exactly {sorted(EXPECTED_ROOT)}, got {sorted(visible_entries)}"
        )
    present_legacy = sorted(name for name in LEGACY if (DOC_ROOT / name).exists())
    if present_legacy:
        errors.append(f"legacy documentation entries remain: {present_legacy}")

    user_root = DOC_ROOT / "user"
    forbidden_user_markers = ("agent_id_or_session", "canonical_role:", "ROLE:")
    for markdown in sorted(user_root.rglob("*.md")):
        text = markdown.read_text(encoding="utf-8")
        for marker in forbidden_user_markers:
            if marker in text:
                errors.append(f"internal marker in client documentation: {markdown}: {marker}")
        for raw_target in LINK_RE.findall(text):
            target = raw_target.strip().strip("<>")
            if target.startswith(("/tmp", "/private/tmp", "/Users/", "file:")):
                errors.append(f"ephemeral or absolute client link: {markdown}: {raw_target}")

    v2_report = user_root / "reports" / "signal-analyser-cascade-v2.md"
    if v2_report.exists():
        v2_text = v2_report.read_text(encoding="utf-8")
        if "Status: integration-review" not in v2_text or "не выполнены" not in v2_text:
            errors.append("cascade v2 status must remain integration-review and not deployed")

    for bug_report in sorted((user_root / "engee_bugs").glob("ENGEE-*.md")):
        bug_text = bug_report.read_text(encoding="utf-8")
        status_match = re.search(r"^Status:\s*([^\n]+)", bug_text, re.MULTILINE)
        if status_match and status_match.group(1).strip() == "closed" and "status остаётся `suspected`" in bug_text:
            errors.append(f"closed bug report contains current suspected contradiction: {bug_report}")

    checked_links = 0
    for markdown in sorted(DOC_ROOT.rglob("*.md")):
        text = markdown.read_text(encoding="utf-8")
        for raw_target in LINK_RE.findall(text):
            target = raw_target.strip()
            if target.startswith("<") and target.endswith(">"):
                target = target[1:-1]
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            target = unquote(target.split("#", 1)[0])
            if not target:
                continue
            checked_links += 1
            resolved = (markdown.parent / target).resolve()
            try:
                resolved.relative_to(REPO_ROOT)
            except ValueError:
                errors.append(f"relative link escapes repository root: {markdown}: {raw_target}")
                continue
            if not resolved.exists():
                errors.append(f"broken relative link: {markdown}: {raw_target}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    markdown_count = sum(1 for _ in DOC_ROOT.rglob("*.md"))
    print(
        f"PASS documentation structure: root={sorted(EXPECTED_ROOT)}, "
        f"markdown_files={markdown_count}, relative_links={checked_links}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
