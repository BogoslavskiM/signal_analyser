---
id: HND-0250
type: task
from: orchestrator
to: e2e
title: Повторить stall profile после exact runtime restart
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  e2e_mode: analysis_regression
  HND-0249 restored and attested exact production revision. Repeat the complete
  HND-0235 25-sample matrix immediately in foreground visible Google Chrome,
  one sequential worker, bringToFront before each scenario. Return P50/P95,
  long tasks, network, Plotly/render/DOM evidence and explicit Frontend versus
  Backend ownership/budgets. Restore state. Never use local runtime, localhost,
  devhub/fallback or dependency files.
acceptance_criteria:
  - All 25 planned samples execute or fresh evidence explains each not-run item.
  - Exact target/revision and browser visibility are attested.
  - Root layer attribution and TASK-0060/TASK-0065 budgets are evidence-based.
requested_skills: [e2e/visual-analysis]
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
---
