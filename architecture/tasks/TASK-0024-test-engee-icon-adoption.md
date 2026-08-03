---
id: TASK-0024
kind: task
title: Проверить локальное использование Engee SVG
status: done
priority: P1
queue_order: 22
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0022]
blocks: []
source_handoffs: [HND-0021]
related_handoffs: [HND-0020]
blocked_by: []
blocker_reason: null
---

# Проверить локальное использование Engee SVG

## Scope

В `test/front/**` проверить, что утверждённые SVG локальны, привязаны к
сохранённым controls, не изменили stable selectors/a11y и не сломали
frontend regression.

## Out of scope

Изменение product code, backend, E2E или архитектуры.

## Acceptance criteria

- [ ] Focused static/behavior coverage проходит.
- [ ] Full frontend suite проходит.
- [ ] Report отправлен Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: завершает final visual review пользователем запрошенного scope.
- Queue order: 22.
- Eligibility: TASK-0022 завершена.

## Verification and results

Focused static coverage 1/1 и полный frontend suite 4/4 прошли. Findings нет.
