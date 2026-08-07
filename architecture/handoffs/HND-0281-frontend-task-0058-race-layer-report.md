---
id: HND-0281
type: report
from: frontend
to: orchestrator
title: Latest-only Plotly and layout revision races fixed with named layer tokens
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
description: |
  Replaced the accumulating Plotly promise tail with one in-flight render and
  one replaceable latest slot, so stale Time completion cannot suppress a new
  Persistence heatmap. Layout envelope acceptance now applies a monotonic
  floor across app and already accepted layout revisions before side effects.
  Product overlay ordering was normalized through the pinned named token
  matrix from sticky 100 through critical 98000, removing conflicting magic
  overlay declarations. Both graph paths retain Plotly.react, dragmode zoom,
  native Shift-pan/double-click behavior, hidden modebar/tips and no
  static/raster fallback. Syntax, diff and targeted race checks pass. The full
  suite then exposed one separate active-host ownership defect routed in
  HND-0283. Tests, backend and dependency files were not changed.
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/output-loading-flow
  - frontend/graph-output-zone
  - frontend/dialog-system
skipped_requested_skills: []
---
