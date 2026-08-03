---
id: TASK-0023
kind: task
title: E2E проверить Inspector и сохранение/импорт сессии
status: backlog
priority: P1
queue_order: null
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [e2e]
parent: TASK-0014
depends_on: [TASK-0022]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: [production-target-url]
blocker_reason: "E2E contract requires a deployed production URL; deployment was not requested and must not be inferred."
---

# E2E проверить Inspector и сохранение/импорт сессии

## Scope

После получения production URL проверить complete workflow: Inspector Info,
row actions, session export, JSON import и server-authoritative reload в
browser.

## Out of scope

Deployment, devhub/fallback, продуктовые исправления.

## Acceptance criteria

- [ ] Отдельный e2e handoff содержит production target URL и mode.
- [ ] Browser scenario проверяет File/Blob lifecycle и user-visible recovery.
- [ ] Report возвращён Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: последний browser gate после feature completion.
- Queue order: не назначен до доступного target URL.
- Eligibility: blocked отсутствием отдельно подтверждённого production URL.

## Verification and results

Не начата.
