---
id: HND-0287
type: task
from: orchestrator
to: frontend
title: Implement common overlay lifecycle for TASK-0062
task_section: ../tasks/TASK-0062-test-overlay-stacking-contract.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own public/** only and implement the nine independently reproduced gaps from
  HND-0286 through one common overlay lifecycle, not isolated z-index/event
  patches. Register modeless menu/help/tooltip and blocking main/screen-delete/
  nested-confirmation layers in newest-first order. Centralize Escape/outside
  dismissal, single focus trap, trigger restoration, inert ownership and
  document scroll lock reference counting. Graph-help close must preserve the
  pane menu for the next Escape; opening screen delete must dismiss stale pane
  menu/help, trap Tab/Shift+Tab and support the pinned backdrop dismissal.
  Closing an older dialog must never release inert/scroll while a newer blocker
  exists. Add a pointer-inert tooltip owner and the nested-confirmation layer
  required by design coexistence. Do not resize/rerender/move Plotly when
  help/tooltips open or close, and preserve all live graph interaction and
  latest-only host contracts. Do not change tests, backend, architecture or
  dependency files and do not start a local application.
acceptance_criteria:
  - All nine HND-0286 gaps are resolved through the common lifecycle.
  - Named design-v2 layer tokens remain the sole overlay ordering source.
  - Existing 1732 assertions and the new 43-clause overlay gate pass.
  - No graph-help/tooltip action changes graph geometry or triggers Plotly work.
requested_skills:
  - frontend/frontend-workflow
  - frontend/dialog-system
  - frontend/output-loading-flow
  - frontend/graph-output-zone
---
