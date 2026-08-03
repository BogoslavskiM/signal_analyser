---
id: TASK-0019
kind: task
title: Исправить busy-state Inspector row actions
status: done
priority: P0
queue_order: 17
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: []
blocks: [TASK-0018]
source_handoffs: [HND-0006]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Исправить busy-state Inspector row actions

## Scope

В `public/**` исправить lifecycle новых inspector row actions: сразу после
начала duplicate/delete request перерисовать row controls в disabled,
`aria-busy=true` состоянии, затем восстановить authoritative state после
успеха, stale/error recovery или cancellation. Не менять API и тесты.

## Acceptance criteria

- [ ] Focused behavior assertion из HND-0006 проходит.
- [ ] `node test/front/run_front_tests.js` проходит.
- [ ] Frontend report возвращён Tester и Orchestrator.

## Queue decision

- Priority: P0.
- Rationale: регрессия только что добавленного user workflow блокирует
  завершение текущей feature.
- Queue order: 17.
- Eligibility: выдана немедленно как отдельное исправление; не прерывает
  независимый backend session work.

## Verification and results

Исправление Frontend принято: row actions немедленно rerender в
disabled/aria-busy; frontend suite 4/4 прошёл. Повторная независимая проверка
остаётся в TASK-0018.
