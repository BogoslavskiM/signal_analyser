---
id: HND-0114
type: task
from: orchestrator
to: frontend
title: Complete UI cleanup with authoritative Display reorder and design v1
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#scope
description: |
  Complete the remaining TASK-0027 work after TASK-0032/TASK-0034. Connect
  existing tab drag and Alt+Arrow reorder UI to POST /api/displays operation
  reorder using the exact full-ID permutation, current revision, 200 snapshot,
  409 current recovery and 422 rollback. Preserve active Display by response
  ID. Verify the already implemented cleanup/table/settings/branding against
  pinned detailed-layout v1; implement only TASK-0027-covered differences and
  request design_revision for any required visible deviation. Do not implement
  multi-layout TASK-0030.
acceptance_criteria:
  - Persistent mouse/keyboard reorder uses authoritative backend and survives rerender/session reload.
  - 409/422 restore authoritative order without optimistic residue.
  - TASK-0027 visual/cleanup criteria conform to pinned design v1 at required viewports/states.
  - Stable selectors, syntax/focused/full frontend suite and report are complete.
requested_skills:
  - frontend/multi-page-element
  - frontend/inspector-ui
  - frontend/settings-controls
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0040-detailed-current-layout/screenshots/
---
