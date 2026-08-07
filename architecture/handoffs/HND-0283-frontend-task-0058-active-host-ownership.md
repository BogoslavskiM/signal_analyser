---
id: HND-0283
type: task
from: orchestrator
to: frontend
title: Make the active pane own exactly the app Plotly host
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
description: |
  Fix the final HND-0282 defect in public/js/layouts.js. The active pane must
  use and render into the existing app-owned active-plot-host. Generate
  data-pane-plot-host only for inactive panes, preserving active-output-only
  payload semantics and cached ready graphs. In 2x2 there must be exactly four
  live hosts after each pane has a ready payload: one app-owned active host and
  three generated inactive hosts. Preserve the latest-only queue, revision
  floor, all live Plotly gestures, hidden modebar and loading/error/empty state
  ownership. Do not change tests, backend, architecture or dependency files
  and do not start the app locally.
acceptance_criteria:
  - No duplicate generated host exists inside the active pane.
  - Plotly.react targets app-owned active host and inactive cached hosts exactly once.
  - Full six-file frontend suite passes without bypass.
requested_skills: [frontend/frontend-workflow, frontend/graph-output-zone, frontend/output-loading-flow]
---
