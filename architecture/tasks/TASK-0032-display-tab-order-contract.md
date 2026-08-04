---
id: TASK-0032
kind: task
title: Добавить authoritative порядок Display tabs для persistent reorder
status: queued
priority: P1
queue_order: 30
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: [TASK-0029]
blocks: [TASK-0027]
source_handoffs: [HND-0029]
related_handoffs: [HND-0033]
blocked_by: []
blocker_reason: null
---

# Persistent Display tab reorder contract

## User value

Перетаскивание переполненных Display-вкладок сохраняет визуальный и session
порядок после authoritative re-render, а не работает только до следующего API
ответа.

## Scope

Добавить revision-aware authoritative mutation порядка существующих Display IDs,
валидацию exact permutation, deterministic active-display preservation и
session export/import. Выдать Frontend стабильный request/response/error
contract.

## Out of scope

Drag UI, CSS/keyboard interaction, создание/удаление Display semantics,
multi-layout panes и deployment.

## Acceptance criteria

- [ ] API принимает только полный exact permutation существующих Display IDs и
  возвращает 422 для duplicate/missing/unknown ID.
- [ ] Stale revision возвращает 409 без частичного reorder.
- [ ] Active Display сохраняется по ID; session round-trip сохраняет order.
- [ ] Existing create/select/close behavior и backend suite проходят.

## Queue decision

- Priority: P1.
- Rationale: обязательная часть пользовательского tab drag-reorder и единственная
  выявленная contract dependency TASK-0027.
- Queue order: 30.
- Eligibility: выдаётся тому же Backender после TASK-0029, чтобы не смешивать
  два revisioned aggregate changes.
