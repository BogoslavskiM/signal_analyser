---
id: TASK-0062
kind: task
title: Зафиксировать deterministic overlay stacking contract
status: done
priority: P1
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [tester]
parent: TASK-0055
depends_on: [TASK-0058]
blocks: [TASK-0063]
source_handoffs: [HND-0222]
related_handoffs: [HND-0285, HND-0286, HND-0287, HND-0292, HND-0293, HND-0294]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Overlay stacking contract tests

## Scope

Покрыть layer tokens и deterministic DOM behavior для modal/backdrop,
popover, dropdown, tooltip, toast, sticky zones и nested overlays. Проверить
single active focus trap, restoration order, Escape/outside-click priority,
scroll lock ownership и отсутствие локальных z-index magic numbers. Включить
graph-help подсказку, открываемую из area ellipsis menu: проверить anchor,
topmost hit owner, закрытие и возврат focus, а также отсутствие перекрытия
compact legend. Проверить, что help является отдельным overlay layer и не
меняет graph layout. Включить delete-screen confirmation поверх открытых
transient pane overlays и восстановление focus после cancel/confirm.

## Acceptance criteria

- [ ] Layer ordering следует одной token matrix.
- [ ] Nested close/focus/scroll restoration детерминированы.
- [ ] Clipping/portal ownership не зависит от случайного DOM ancestor.
- [ ] Graph-help overlay не пересекает legend, не теряет anchor и после close
  возвращает focus на кнопку в area ellipsis menu.
- [ ] Help layer не меняет graph bounding boxes; delete confirmation корректно
  приоритизируется над pane menu/help и восстанавливает focus/state.
- [ ] Full frontend suite passes.

## Queue decision

- Priority: P1, предотвращает системные ошибки многослойного UI.
- Queue order: null; зависит от TASK-0058.
- Eligibility: implementation and design version ready.
