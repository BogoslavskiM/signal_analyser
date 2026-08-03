---
id: TASK-0001
kind: task
title: Define compact backend design skill
status: done
priority: P1
queue_order: 1
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

# Define compact backend design skill

## User value

Backender получает единый короткий шаблон архитектуры без обязательных лишних
слоёв.

## Scope

Пример папок, aggregate root, settings validation, calculation errors, dirty
outputs, graph payload и optional worker queue.

## Out of scope

Конкретные API contracts, engineering math и export/session capabilities.

## Acceptance criteria

- [x] Skill остаётся опциональным этапом Backender.
- [x] Validation и calculation errors разделены.
- [x] Apply только помечает outputs dirty; data routes пересчитывают их лениво.
- [x] Manifest schema 2 сохранён.

## Queue decision

- Priority: P1
- Rationale: необходимая основа следующего backend workflow stage.
- Queue order: 1
- Eligibility: выполнено Orchestrator в своей ownership-зоне.

## Verification and results

Добавлены `backend-design/SKILL.md` и `manifest.yaml`; skill validator пройден.
