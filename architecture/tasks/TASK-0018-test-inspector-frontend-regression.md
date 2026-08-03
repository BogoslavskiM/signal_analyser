---
id: TASK-0018
kind: task
title: Проверить Inspector Info и row actions
status: done
priority: P1
queue_order: 16
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0015]
blocks: []
source_handoffs: [HND-0004]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Проверить Inspector Info и row actions

## Scope

В `test/front/**` добавить и выполнить behavior/static regression для
TASK-0015: Info card, hover/focus row actions, duplicate/delete lifecycle,
last-row disabled state и сохранение текущих нижних вкладок.

## Out of scope

Изменение product code, session API и Playwright specs.

## Acceptance criteria

- [ ] Новое поведение проверено без хрупких selectors.
- [ ] Выполнен релевантный frontend regression suite.
- [ ] Отчёт с командами, count и findings отправлен Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: frontend feature должна быть проверена перед финальным review.
- Queue order: 16.
- Eligibility: TASK-0015 implementation report получен.

## Verification and results

После TASK-0019 полный frontend regression прошёл: node
test/front/run_front_tests.js — 4/4. P0 defect закрыт.
