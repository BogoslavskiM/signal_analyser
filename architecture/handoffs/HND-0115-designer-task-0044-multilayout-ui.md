---
id: HND-0115
type: design_task
from: orchestrator
to: designer
title: Design multi-layout grid and autonomous plot panes
task_section: ../tasks/TASK-0044-design-multilayout-ui.md#scope
description: |
  Extend the ready current-layout v1 with a separate coherent multi-layout
  package. Use TASK-0029 authoritative contract as factual behavior and do not
  alter the rest of IA. Cover selector popover, 1x1/2x2/4x4 grids, active pane,
  per-pane plot type and Signals checkbox binding, resize/conflict/session
  states, responsive geometry and complete local evidence.
acceptance_criteria:
  - Ready DESIGN.md/prototype/screenshots package under TASK-0044-multilayout-ui.
  - Exact pane/popover/control geometry at three required viewports.
  - All required states and contract-driven preserve/drop/recovery flows covered.
requested_skills:
  - designer/visual-system
  - designer/application-composition
  - designer/data-entry-and-inspection
  - designer/output-and-visualization
design_mode: autonomous
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success, conflict]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0040-detailed-current-layout/screenshots/
---
