---
id: HND-0235
type: task
from: orchestrator
to: e2e
title: Повторить production stall profile после восстановления runtime
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  e2e_mode: analysis_regression
  Rerun the complete HND-0229 25-sample matrix against exact ready production
  target https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  at revision cac83c5f445352a50f04aeeeb269b47007766d79 (HND-0234). Update the
  test-owned profiler expected revision accordingly. Use foreground visible
  Google Chrome, headless:false, one sequential worker, bringToFront before
  each scenario, restore persistent state and return raw evidence paths plus
  root-layer attribution and actionable TASK-0065/TASK-0060 budgets. Never use
  local runtime/localhost/devhub/fallback or dependency files.
acceptance_criteria:
  - All 25 planned measurements run or each not-run item has new evidence.
  - P50/P95, long tasks, network, Plotly and render/DOM evidence are reported.
  - Backend versus Frontend remediation boundaries and budgets are explicit.
  - Production state is restored and exact revision/browser visibility reported.
requested_skills: [e2e/visual-analysis]
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
---
