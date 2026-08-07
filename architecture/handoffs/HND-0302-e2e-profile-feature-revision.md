---
id: HND-0302
type: task
from: orchestrator
to: e2e
title: Profile frontend stalls on deployed fixed feature revision
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
description: |
  HND-0301 attests exact deployed feature SHA with TASK-0072 selection repair,
  one process, auto_stop=false and a ready successful layout output. Run the
  unchanged 25-sample matrix in one foreground Chrome worker. Modify only the
  in-memory/external probe behavior so each sample is flushed incrementally to
  evidence before the next mutation and cleanup cannot erase completed data.
  Collect P50/P95, API/network/payload, Plotly.react, script/layout/paint and
  long tasks with evidence-based layer attribution and concrete TASK-0060/
  TASK-0065 budgets. Restore a canonical ready state. Do not change workspace
  files, use local runtime/localhost/devhub/fallback or touch dependencies.
acceptance_criteria:
  - All 25 samples execute and every completed sample is durably evidenced incrementally.
  - Exact feature SHA and foreground one-worker execution are attested.
  - Root cause attribution and remediation budgets are evidence-based.
  - Final state remains canonical and functionally ready.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
