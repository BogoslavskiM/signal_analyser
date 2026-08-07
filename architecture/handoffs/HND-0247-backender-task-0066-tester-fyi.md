---
id: HND-0247
type: FYI
from: backender
to: tester
title: Синхронизировать regressions с 10×10 active-only contract
task_section: ../tasks/TASK-0068-update-layout-active-only-regressions.md#scope
description: |
  Update multilayout_integration_test.jl and pane_outputs_test.jl: boundaries
  are 1..10 with 100 metadata panes; layouts[].outputs contains one active pane
  for active Display and [] for inactive Displays. Add zero-call counters for
  inactive heavy panes, 0/11 rejection and exact session round-trip. Existing
  function signatures remain; new helper is
  signal_display_layout_validate_dimensions(::Int, ::Int)::Nothing.
applied_skills: [backender/state-model, backender/api-contract-planning, backender/calculation-planning]
---
