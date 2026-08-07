---
id: HND-0389
type: task
from: orchestrator
to: frontend
title: Contain last table-cell copy before final deploy
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  E2E measured a remaining 1024x768 containment defect: .signal-cell-copy
  extends to x=1025.11 while its .signal-type-cell ends at x=1016.50. Fix the
  last content cell so its visible copy is constrained inside the cell and
  ellipsizes before the reserved 60x24 inline-action area. Keep actions in the
  same last cell, preserve sticky behavior, 32px row geometry, hover/focus
  reveal and horizontal table scrolling. Integrate with the uncommitted
  minimum-page/checkmark correction from HND-0385 and do not alter other zones.
allowed_paths:
  - public/**
acceptance_criteria:
  - signal-cell-copy bounding box never exceeds signal-type-cell.
  - Copy ellipsizes before the reserved action area at 1024/1280/1440.
  - Inline actions remain in the last content cell and operable.
  - Row height, sticky column and horizontal scrolling remain unchanged.
  - Complete frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/inspector-ui]
---
