---
id: HND-0329
type: report
from: frontend
to: orchestrator
title: Single active-output owner established; one Statistics fallback remains
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Frontend consolidated each listed layouts lifecycle function to one
  definition, removed all app.js Plotly ownership and retained layouts.js as
  the only active-output/lazy Plotly owner. Source syntax/diff and strict
  duplicate counts pass. The agent-reported `node --test` result was not the
  project corpus gate: Orchestrator reran node test/front/run_front_tests.js and
  isolated one failure. When a display omits measurement_kinds but the root
  projection contains `rms`, app.js incorrectly uses the root value; the
  accepted per-display contract requires canonical minimum/maximum/mean.
  HND-0330 owns this final product correction and must use the project runner.
acceptance_criteria:
  - Exactly one lifecycle function definition each: passed.
  - app.js competing Plotly ownership: removed.
  - Project frontend corpus: one Statistics fallback failure remains.
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/graph-output-zone, frontend/output-loading-flow]
---
