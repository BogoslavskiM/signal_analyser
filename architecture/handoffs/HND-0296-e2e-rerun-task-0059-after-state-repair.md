---
id: HND-0296
type: task
from: orchestrator
to: e2e
title: Resume 25-sample TASK-0059 profile on canonical revision 65 state
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
expected_state_revision: 65
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
description: |
  HND-0295 repaired the exact old production baseline into canonical revision
  65 with a ready active Time plot. Resume the unchanged 25-sample performance
  matrix immediately in one foreground Chrome worker. Preserve request/revision
  correlation and collect P50/P95, API/network/payload, Plotly.react, browser
  scripting/layout/paint and long-task evidence. Restore persistent state to a
  canonical functionally ready projection. Do not use local runtime, localhost,
  devhub/fallback or dependency files. This old production SHA remains a
  performance baseline, not current local design-v2 acceptance evidence.
acceptance_criteria:
  - All 25 planned samples execute or every not-run item has fresh exact evidence.
  - Root-layer attribution and TASK-0060/TASK-0065 budgets are evidence-based.
  - Final state is canonical, functionally ready and revision-attested.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
