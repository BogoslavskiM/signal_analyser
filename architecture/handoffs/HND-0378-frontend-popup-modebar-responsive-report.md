---
id: HND-0378
type: report
from: frontend
to: orchestrator
title: Direct workspace dialog, modebar cleanup and responsive shell complete
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
applied_skills: [frontend/frontend-workflow, frontend/dialog-system, frontend/graph-output-zone]
skipped_requested_skills: []
description: |
  Signals + now opens the main workspace dialog directly; obsolete intermediate
  popup source ownership is removed. The dialog owns focus through catalog
  failure, exposes retry, closes on Escape and restores focus to +. A newer
  nested confirmation wins Escape and returns focus to the still-open parent.
  Both Plotly.react paths remove generated modebar DOM while preserving the live
  Plotly graph and gestures. The page/application shell fills its containing
  viewport without a fixed checkpoint-sized canvas.
acceptance_criteria:
  - Frontend JavaScript syntax checks pass.
  - Git diff check passes.
  - Complete frontend corpus passes 9/9.
---
