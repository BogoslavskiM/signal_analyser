---
id: TASK-0068
kind: task
title: Обновить backend regressions для 10×10 и active-only outputs
status: done
priority: P1
queue_order: 2
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [tester]
parent: TASK-0055
depends_on: []
blocks: [TASK-0066]
source_handoffs: [HND-0246, HND-0247]
related_handoffs: [HND-0251, HND-0256, HND-0261, HND-0262, HND-0264, HND-0265]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Backend regression gate for layout 10×10

## Scope

Обновить только Tester-owned backend tests, которые всё ещё требуют максимум
4×4 и eager output для каждой pane. Закрепить authoritative contract TASK-0066:
dimensions 1..10, rejection 0/11, полный ordered metadata список до 100 panes,
но output только active pane активного Display и `[]` для inactive Displays.
Добавить provider counters, доказывающие отсутствие расчётов inactive panes,
и exact session round-trip stable ids/type/bindings/active pane. Не менять
product code или frontend tests; frontend active-only migration остаётся
TASK-0058/TASK-0061.

## Acceptance criteria

- [ ] `multilayout_integration_test.jl` больше не содержит 4×4/16/eager-all-pane assumptions.
- [ ] `pane_outputs_test.jl` проверяет один active output и zero inactive provider calls.
- [ ] 1×1/10×10 accepted, 0/11 rejected, 100-pane metadata and session round-trip covered.
- [ ] Existing unrelated backend regressions сохранены и полный `test/back/runtests.jl` проходит.
- [ ] Product, frontend, Engee and dependency files не изменены; local app не запускается.

## Queue decision

- P1: обязательный независимый test gate, блокирующий завершение TASK-0066 и
  дальнейший Frontend contract.
- Выдан Tester через HND-0251 параллельно P0 Designer work.

## Verification and results

HND-0256: metadata/boundary integration passes 1760/1760. Focused pane output
regression fails 11/94 and full suite stops with 5 failures after 1813 passes:
inactive providers are still invoked by snapshots, and a failing active
Spectrogram provider escapes as `ArgumentError` instead of typed pane output.
Tests are retained as the reproducer; TASK-0070 owns the product fix.
