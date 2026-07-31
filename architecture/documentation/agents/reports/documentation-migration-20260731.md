# Documentation migration report — 2026-07-31

Status: freeze-ready

## Migration map

| Legacy path | Authoritative destination |
| --- | --- |
| Legacy root file `project.md` | `documentation/user/product-overview.md` |
| Legacy top-level `tasks/**` | `documentation/agents/tasks/**` |
| Legacy top-level `backlog/**` | `documentation/agents/backlog/**` |
| Legacy top-level `handoff/**` | `documentation/agents/handoff/**` |
| Client cascade reports | `documentation/user/reports/**` |
| Research/coordination reports and templates | `documentation/agents/reports/**` |
| New specifications/math/ADR/history/traceability | `documentation/user/**` |
| Engee bug records | `documentation/user/engee_bugs/**` |
| Engee candidate intake | `documentation/agents/engee_bug_intake/**` |

Все существовавшие cascade/handoff reports перенесены. Legacy directories и
`project.md` отсутствуют; root содержит только `README.md`, `user/`, `agents/`.
Authoritative content не продублирован.

## Policy delivered

- Physical audience split and Russian client layer.
- Immutable ADR, append-only history/reports/handoffs/bug reproduction.
- Current product/math specifications with code/test anchors.
- Requirement-to-deployment traceability with separate status phases.
- Repository-native Markdown/assets delivery without site/PDF pipeline.
- Engee bug candidate/triage policy and non-defect EngeeDSP limitation.
- E2E browser workspace coordination and `browser_workspace_setup` evidence.

## Verification command

```bash
python3 architecture/documentation/agents/verify_documentation.py
```

The command fails on legacy root entries, unexpected root shape, broken
relative links, repo-escaping links, temporary/absolute client links, internal
identity markers in client docs, cascade-v2 status drift and closed/suspected
bug-status contradiction.

## Verification result

Final result is recorded by the freeze handoff after adapter regeneration.
