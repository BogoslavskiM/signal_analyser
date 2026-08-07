---
id: HND-0237
type: design_task
from: orchestrator
to: designer
title: Обновить design scope: 10×10, signal plus и settings plot type
task_section: ../tasks/TASK-0057-ui-overlay-refinement-design.md#scope
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
required_states: [default, hover, focus-visible, active, warning, disabled, loading]
required_viewports: [1440x900, 1280x720, 1024x768]
description: |
  Explicit user override while HND-0227 is in progress. Replace the old 4×4
  maximum with an allowed 10×10 maximum. Define the exact recommended envelope
  and a visible non-blocking «не рекомендуется» warning for larger allowed
  selections; Apply stays available. Ensure the signal `+` action is always
  visible next to vertical ellipsis and directly opens the main signal dialog.
  Add plot type as the first canonical dropdown row of Display settings and
  demonstrate two-way synchronization with the active pane selector through
  one value. Update prototype interactions, DESIGN.md, screenshots, proportion
  and state matrices before returning ready. This explicit handoff overrides
  any conflicting earlier 4×4 design assumption.
acceptance_criteria:
  - Prototype reaches and applies 10×10 plus its warning state.
  - Signal `+` is visible and direct at every viewport/state.
  - Both plot-type selectors visibly synchronize in both directions.
  - Final design report includes the scope update and click evidence.
requested_skills:
  - designer/application-composition
  - designer/data-entry-and-inspection
  - designer/output-and-visualization
  - designer/dialog-and-file-flows
---
