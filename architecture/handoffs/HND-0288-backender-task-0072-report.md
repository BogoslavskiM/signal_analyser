---
id: HND-0288
type: report
from: backender
to: orchestrator
title: Canonical selection projection repaired without changing active-only outputs
task_section: ../tasks/TASK-0072-fix-layout-selection-projection.md#acceptance-criteria
description: |
  Reproduced the production contract defect: reverse pane bindings [B,A] were
  persisted into Display.visible_signals while authoritative signals remained
  [A,B], allowing ok=true with a selection envelope the frontend correctly
  rejected. The repair preserves pane binding and trace order but normalizes
  Display/root projection by inventory and validates all signal membership,
  uniqueness, active pane/display, plot kind and root visibility before a
  successful layout envelope. Same-layout update can atomically repair legacy
  projection and increments revision only for a real change. Session import
  preserves pane order as a set-equivalent relation but rejects noncanonical
  Display projection without mutation. Active-only outputs are unchanged.
  Focused multilayout passed 1778/1778 and full backend exited zero without
  --project=. No local server, dependency or frontend/architecture files were
  used or changed.
changed_files:
  - ../../lib/services/signal_analyser_service.jl
  - ../../lib/services/signal_session_service.jl
  - ../../test/back/lib/multilayout_integration_test.jl
  - ../../test/back/lib/signal_session_service_test.jl
applied_skills: [backender/backender-workflow, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
skipped_requested_skills: []
---
