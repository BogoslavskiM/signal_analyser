---
id: HND-0368
type: task
from: orchestrator
to: frontend
title: Fix missing live Plotly and complete design-v2 styling
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  The user rejects production eb4f81eb695ddafef032646aff6245f4f380c4f8:
  no live Plotly is visible and styling remains incomplete across multiple zones.
  Diagnose the current public runtime path and fix frontend-owned causes. Compare
  every one of the five zones directly with pinned design v2 at all three target
  viewports; remove mixed legacy composition instead of adding narrow cosmetic
  exceptions. Preserve the backend/API/state-lite contracts and real local
  Plotly lifecycle. Do not use images or static graphs. Preserve and revalidate
  the complete popup stack: dropdowns, tooltips, graph-help, pane/inspector menus,
  layout popover, +/import/save dialogs, toast and nested/delete confirmations,
  including no plot movement or resize. If live Plotly is demonstrably blocked
  outside public/**, report exact evidence without editing backend files.
allowed_paths:
  - public/**
acceptance_criteria:
  - Live Plotly renders from current active-output response and remains interactive.
  - Five zones match pinned design v2 without legacy styling gaps.
  - Full popup/overlay lifecycle and no-plot-shift contract remain intact.
  - Complete frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/output-loading-flow]
---
