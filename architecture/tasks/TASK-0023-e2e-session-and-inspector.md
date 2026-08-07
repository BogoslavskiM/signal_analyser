---
id: TASK-0023
kind: task
title: E2E проверить Inspector и сохранение/импорт сессии
status: done
priority: P1
queue_order: 48
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [e2e]
parent: TASK-0014
depends_on: [TASK-0022]
blocks: []
source_handoffs: [HND-0176, HND-0178, HND-0179]
related_handoffs: [HND-0180, HND-0181]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: none
---

# E2E проверить Inspector и сохранение/импорт сессии

## Scope

После получения production URL проверить complete workflow: Inspector Info,
row actions, session export, JSON import и server-authoritative reload в
browser.

## Out of scope

Deployment, devhub/fallback, продуктовые исправления.

## Acceptance criteria

- [x] Отдельный e2e handoff содержит production target URL и mode.
- [x] Browser scenario проверяет File/Blob lifecycle и user-visible recovery.
- [x] Report возвращён Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: последний browser gate после feature completion.
- Queue order: не назначен до доступного target URL.
- Eligibility: blocked отсутствием отдельно подтверждённого production URL.

## Verification and results

Exact production URL/SHA аттестованы DevOps и последним E2E; прежний target
blocker снят. Full Inspector/session browser workflow выдан как `HND-0180`.

E2E report `HND-0181`: 25/26 PASS. Export Blob/download JSON, authoritative
document hash, valid multi-layout import/reload, malformed client rejection,
422 invalid version, stale 409/retry and exact final restoration passed. One
Inspector visual defect reproduced: aria-expanded toggles and metadata nodes
exist, but row remains 41.78125px and clips details. Routed to TASK-0053.
