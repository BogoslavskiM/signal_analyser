---
id: HND-0118
type: report
from: frontend
to: orchestrator
title: UI cleanup authoritative reorder and design v1 implemented
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/multi-page-element
  - frontend/inspector-ui
  - frontend/settings-controls
skipped_requested_skills: []
description: |
  Existing mouse drag and Alt+Arrow reorder now POST exact full Display-ID
  permutation through /api/displays. Order remains authoritative while pending;
  aria-busy/data-reorder-busy guard repeated input. HTTP 200 applies full
  snapshot; 409 applies current without stale replay; 422/network retain order
  and show recoverable error. Active Display comes only from response ID.

  Design v1 audit implemented 300/340 settings columns, stacked 1024 form,
  nonwrapping scrollable tabs, 960 table minimum, 126/128 type/action columns,
  224/248 menu/info geometry and warning/success tokens. All required states
  and viewports are covered without approved deviations. Multi-layout remains
  out of scope. JS syntax, focused contracts, design matrix, diff check and
  full frontend suite 4/4 pass. Only public/js/app.js and three CSS files
  changed; backend/tests/architecture/runtime/dependencies untouched.
---
