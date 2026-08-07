---
id: HND-0282
type: report
from: tester
to: orchestrator
title: Full frontend corpus restored; active pane has duplicate graph host
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
description: |
  Removed both accidental early-return bypasses and executed all six frontend
  test files. Updated only proven legacy contracts: removed Info/action column,
  Russian statistics copy and active-output-only pane fixtures with sequential
  cache population. Static contracts retain live Plotly, dragmode zoom, hidden
  modebar, prohibited static/raster fallbacks, seven-column table and pinned UI
  geometry. 1730 of 1732 assertions pass. The two failures prove one product
  defect: the active pane creates a generated pane host in addition to the
  app-owned active-plot-host, and Plotly.react targets the generated duplicate.
  A 2x2 layout therefore has five hosts rather than one live app-owned active
  host plus three live/cached inactive hosts. Test diffs are clean; product,
  architecture and dependency files were not changed.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
---
