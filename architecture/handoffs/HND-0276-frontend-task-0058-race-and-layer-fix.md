---
id: HND-0276
type: task
from: orchestrator
to: frontend
title: Fix latest-only Plotly/layout races and normalize pinned overlay layers
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own public/** only. Fix both independently reproduced races from HND-0275:
  after an in-flight stale Time Plotly.react settles, the latest requested
  Persistence heatmap must render exactly once; and delayed stale layout
  envelopes must never publish over newer state revisions. Preserve the live
  interactive Plotly.react contract, dragmode zoom, Shift+LMB pan,
  double-click autoscale, hidden modebar and no static/raster fallback.
  Also replace product overlay z-index magic numbers with one named token set
  matching the pinned design matrix: sticky 100, layout popover 1000, passive
  toast 1050, menus 1100, graph-help 1200, tooltip 90000, main modal 95000,
  screen delete 96000, nested confirmation 97000 and critical/loading 98000.
  Remove conflicting legacy layer declarations rather than relying on later
  accidental overrides. Do not change tests, backend, architecture or
  dependency files and do not start the application locally.
acceptance_criteria:
  - C24 Time-to-Persistence latest render behavior passes without duplicate or stale Plotly output.
  - Delayed stale layout envelopes are rejected and only the latest revision is published.
  - Named layer tokens are the sole source for product overlay ordering and match design v2.
  - Full frontend suite passes or any remaining product defect is reported exactly.
requested_skills:
  - frontend/frontend-workflow
  - frontend/output-loading-flow
  - frontend/graph-output-zone
  - frontend/dialog-system
---
