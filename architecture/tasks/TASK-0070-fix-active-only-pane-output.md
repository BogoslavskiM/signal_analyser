---
id: TASK-0070
kind: task
title: Устранить eager inactive pane calculations и типизировать output errors
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender]
parent: TASK-0055
depends_on: []
blocks: [TASK-0068, TASK-0066]
source_handoffs: [HND-0246, HND-0256]
related_handoffs: [HND-0257, HND-0261, HND-0262, HND-0263, HND-0264, HND-0265]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Active-only pane output product fix

## Scope

Исправить backend snapshot/output path так, чтобы создание layout/display/state
snapshot не вызывало providers неактивных panes или inactive Displays.
Рассчитывать/формировать output только для active pane active Display. Ошибку
provider активной pane преобразовать в существующий typed failed pane-output
contract, не выбрасывая `ArgumentError` через API/snapshot boundary. Сохранить
полный ordered metadata layout, ids/type/bindings, 10×10 round-trip и revision
semantics. Не реализовывать весь TASK-0065 worker/cache refactor в этой задаче.

## Acceptance criteria

- [ ] Snapshot active Time pane вызывает 0 Spectrum/Spectrogram/Persistence providers.
- [ ] Inactive Displays return `outputs == []` and invoke zero providers.
- [ ] Selecting a heavy pane invokes exactly its provider once, no siblings.
- [ ] Provider failure returns typed failed pane output without uncaught exception.
- [ ] Focused TASK-0068 tests and full backend regression pass after Tester rerun.
- [ ] No local app/runtime, frontend/test/dependency edits occur.

## Queue decision

- P0: confirmed active-only performance regression blocks 10×10 and the
  frontend performance architecture. Dispatched immediately via HND-0257.
