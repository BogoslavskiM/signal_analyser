---
id: HND-0314
type: report
from: frontend
to: orchestrator
title: Null title write no longer aborts mutation dispatch
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
description: |
  Frontend changed only public/js/app.js. renderSettings now treats the legacy
  display-plot-title as optional and updates it only when present, preserving
  the pane-owned title. This removes the exact synchronous null textContent
  exception before enqueue without broad catch/delay or any visible change.
  Plot-type remains POST ./api/view and confirmed screen deletion remains POST
  ./api/displays; overlay and Plotly lifecycle code are unchanged. Independent
  Orchestrator checks confirmed JavaScript syntax, diff validity and all seven
  frontend files passing.
acceptance_criteria:
  - Exact null write removed: passed.
  - API/overlay/Plotly contracts unchanged: passed by source review.
  - Complete deterministic frontend corpus: passed, 7/7.
  - Production proof: pending deploy and E2E rerun.
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/graph-output-zone, frontend/output-loading-flow]
---
