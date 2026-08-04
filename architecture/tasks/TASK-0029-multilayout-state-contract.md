---
id: TASK-0029
kind: task
title: Реализовать authoritative multi-layout state и session contract
status: in_progress
priority: P1
queue_order: 27
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: []
blocks: [TASK-0030]
source_handoffs: []
related_handoffs: [HND-0025, HND-0030, HND-0038]
blocked_by: []
blocker_reason: null
---

# Multi-layout state и session contract

## User value

Каждый Display поддерживает устойчивую сетку до `4 × 4`, а каждый plot pane
сохраняет собственный тип и набор сигналов при reload/session export/import.

## Source evidence

- `/Users/makar/Desktop/Снимок экрана 2026-08-04 в 00.03.09.png`.
- Прямые требования пользователя от 2026-08-04.

## Scope

В backend authoritative state определить versioned layout model: rows/columns
`1..4`, выбранный layout variant, стабильные ordered pane IDs, active pane,
per-pane plot type и ordered signal bindings. Добавить/расширить API mutations,
validation, revision/conflict semantics и session export/import/migration так,
чтобы старый single-pane state безопасно открывался как `1 × 1`.

## Out of scope

HTML/CSS, layout popover rendering, drag UI, tests и deployment.

## Acceptance criteria

- [ ] Layout не принимает dimensions вне `1..4`, duplicate pane IDs,
  неизвестные plot types/signals или число panes вне выбранной topology.
- [ ] Per-pane type/bindings независимы; active pane имеет валидный fallback
  после изменения layout и удаления signal/display.
- [ ] Layout change имеет детерминированные preserve/drop rules и не теряет
  surviving pane configuration.
- [ ] API поддерживает atomic revision-aware update и стабильные errors.
- [ ] Session round-trip сохраняет layout/panes/bindings; старый document
  мигрирует в `1 × 1` без потери прежнего plot state.
- [ ] Contract/report передан Frontend и Tester; backend suite проходит.

## Queue decision

- Priority: P1.
- Rationale: authoritative contract нужен до frontend multi-layout и защищает
  session persistence от несовместимого локального состояния.
- Queue order: 27.
- Eligibility: готова к параллельной работе с TASK-0027.

## Verification and results

Backender handoff HND-0030 отправлен; ожидается API/session contract и report.
