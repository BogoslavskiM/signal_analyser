---
id: TASK-0025
kind: task
title: Обновить E2E regression routing и ownership deployment
status: in_progress
priority: P1
queue_order: 23
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [orchestrator]
parent: null
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Обновить post-task и idle E2E workflow

## User value

Каждая завершённая задача получает своевременную проверку работоспособности,
новая функциональность — собственное E2E coverage, а свободная очередь —
полный анализирующий регресс с исправлением тестов и follow-up.

## Scope

Обновить source-of-truth Orchestrator и E2E: routing трёх regression modes,
quick threshold 75%, analysis test repair и functional/performance follow-up,
new-functionality coverage плюс quick regression. Передать deployment skill от
Engee User роли E2E и перегенерировать Codex role adapters.

## Out of scope

Изменение product или test code, запуск deployment, изменение production target
policy.

## Acceptance criteria

- [x] После каждой done task выбирается quick либо new-functionality mode.
- [x] Quick threshold и формула 75% определены однозначно.
- [x] Analysis запускается при пустом actionable backlog и разрешает E2E
  исправлять только test-owned failures.
- [x] Functional failures и slow green suite маршрутизируются в разные
  follow-up handoffs.
- [x] New-functionality mode включает новое coverage и quick suite.
- [x] Deployment skill принадлежит только E2E и запускается отдельным явным
  handoff, не смешанным с regression.
- [x] Engee User больше не принимает deployment requests.
- [ ] Generated adapters и manifests проверены.

## Queue decision

- Priority: P1.
- Rationale: пользователь явно меняет обязательный workflow всех следующих
  development cycles.
- Queue order: 23.
- Eligibility: выполняется Orchestrator в собственной ownership-зоне.

## Verification and results

Ожидается regeneration и validation.
