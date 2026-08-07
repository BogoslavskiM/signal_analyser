---
id: HND-0140
type: task
from: orchestrator
to: e2e
title: Verify bounded multi-layout design v2 evidence
task_section: ../tasks/TASK-0047-revise-multilayout-1024-geometry.md#verification-and-results
description: |
  Run one read-only post-task quick regression of local design package v2.
  Verify all fifteen refreshed 1024x768 screenshots, inherited 42px Display tab
  row, grid/1x1 696x363.53, 2x2 345x178.77, 4x4 169.5x86.38, no document
  overflow/popover collision, and unchanged interaction semantics. Confirm the
  thirty 1280/1440 evidence files remain v1-compatible. Production remains at
  a6add263120f41aa1ae66497f3effac6bb493cff and has not received TASK-0030;
  do not report that expected product/design difference as a defect. Read-only:
  no product/design/tests/dependencies/Git/deploy/session mutation.
acceptance_criteria:
  - Report separate screenshot, geometry, responsive and interaction totals.
  - Report exact evidence paths and any reproducible package defect.
  - Do not modify repository files or production state.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
required_viewports: [1024x768, 1280x720, 1440x900]
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success, conflict]
---
