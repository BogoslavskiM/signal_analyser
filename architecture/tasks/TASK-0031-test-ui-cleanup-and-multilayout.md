---
id: TASK-0031
kind: task
title: Покрыть multi-layout backend/frontend integration regression
status: queued
priority: P1
queue_order: 29
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0027, TASK-0029, TASK-0030]
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Regression UI cleanup и multi-layout

## Scope

Добавить integration coverage topology `1 × 1`..`4 × 4`, invalid dimensions,
deterministic pane preservation, per-pane type/signal isolation, session
migration/round-trip, layout popup draft/apply/cancel и active-pane checkbox
synchronization. UI-cleanup regression закрепляется отдельно TASK-0033.

## Out of scope

Изменение product code, screenshot baselines, deployment и Playwright E2E.

## Acceptance criteria

- [ ] Backend contract/session tests покрывают boundaries, validation,
  conflict и migration.
- [ ] Frontend tests покрывают все новые controls и transient states.
- [ ] Негативные assertions подтверждают удаление лишних UI элементов.
- [ ] Existing backend/frontend suites проходят без regression.
- [ ] Report перечисляет непокрываемые локально scenarios для E2E handoff.

## Queue decision

- Priority: P1.
- Rationale: новая stateful функциональность требует contract regression перед
  browser E2E.
- Queue order: 29.
- Eligibility: после всех product implementation tasks.

## Verification and results

Ожидается Tester report и post-task quick E2E handoff.
