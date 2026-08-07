---
id: HND-0270
type: task
from: orchestrator
to: e2e
title: Повторить 25-sample stall profile на стабильном auto_stop=false runtime
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  e2e_mode: analysis_regression
  HND-0269 proved the exact production process stable beyond the prior SIGTERM
  boundary. Repeat the complete HND-0235/HND-0250 25-sample matrix now in one
  foreground-visible Google Chrome worker, bringToFront before each scenario.
  Return P50/P95, long tasks, scripting/render/layout/paint, network/payload,
  Plotly/render/DOM and API wait evidence, with explicit Frontend/Backend/
  Plotly/platform attribution and concrete TASK-0060/TASK-0065 budgets. Restore
  persistent state. Never use local runtime, localhost, devhub/fallback or
  dependency files. The production page is the old profiling baseline, not
  evidence for current local design v2.
acceptance_criteria:
  - All 25 planned samples execute or fresh evidence explains each not-run item.
  - Exact target/revision and foreground browser visibility are attested.
  - Root-layer attribution and remediation budgets are evidence-based.
requested_skills: [e2e/visual-analysis]
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
---
