---
id: HND-0278
type: task
from: orchestrator
to: e2e
title: Resume TASK-0059 profile after bounded layout-hang diagnostics
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
description: |
  HND-0277 attests one healthy process, exact baseline SHA and root/status 200.
  Resume the same HND-0270 25-sample production matrix in one foreground Chrome
  worker. Instrument every layout request with start/end/status and client
  revision so a repeated Loading layout state can be tied to 409 replay,
  connection wait, abandoned request or frontend stale-state behavior. Keep
  profiling evidence for API wait, payload, Plotly.react and browser work.
  Restore persistent state. Do not use local runtime, localhost, devhub,
  fallback or dependency files; this old production revision is performance
  baseline only and not current design-v2 acceptance evidence.
acceptance_criteria:
  - All 25 planned samples execute or each not-run item has fresh exact evidence.
  - Layout requests/revisions/statuses are correlated with any loading hang.
  - P50/P95 and root-layer attribution are evidence-based.
  - Persistent state is restored and final runtime availability recorded.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
