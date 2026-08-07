---
id: HND-0161
type: report
from: frontend
to: orchestrator
title: Missing browser shell is maintenance runtime, not frontend
task_section: ../tasks/TASK-0042-diagnose-visible-load-error.md#verification-and-results
applied_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/output-loading-flow
  - frontend/frontend-project-structure
description: |
  Three clean browser contexts received maintenance HTTP 404 for root and all
  status/state/session/layouts requests, with identical 246-byte maintenance HTML.
  Product HTML/scripts/styles never loaded; no frontend JS exception or state
  transition occurred. Source trace proves layout-trigger is created after valid
  state before Plotly. Node syntax 4/4, focused layout 141/141 and full frontend
  6/6 pass. No code/test/session/dependency/Git changes. Runtime owns the issue.
---
