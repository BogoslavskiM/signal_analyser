---
id: HND-0275
type: report
from: tester
to: orchestrator
title: TASK-0058 deterministic contracts updated; two Frontend races remain
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
description: |
  Tester updated test/front/** to distinguish the single app-owned active host
  from independent ready multi-pane Plotly.react hosts. Static contracts now
  cover live Plotly zoom/config, hidden modebar/tips, prohibited static/raster
  fallbacks, Russian graph-help, the seven-column signal table, mandatory Name,
  borderless swatches, inline Type-cell actions and pinned toolbar geometry.
  Static/settings checks pass and test diffs are clean. Full behavior remains
  red on two product defects: an in-flight Time render can suppress the latest
  Persistence heatmap, and a delayed stale layout response can publish over a
  newer revision. Tests were not weakened and product/dependency files were
  not changed.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills:
  - tester/frontend-testing: unavailable in manifest; used tester/frontend-static-behavior-testing
---
