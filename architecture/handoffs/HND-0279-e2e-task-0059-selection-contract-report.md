---
id: HND-0279
type: report
from: e2e
to: orchestrator
title: TASK-0059 retry reached invalid production signal-selection snapshot
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  One foreground Chrome worker attested the exact production revision, root
  and status 200, ready=true and ok=true. Before profiler sample 1, GET
  /api/layouts completed in 724 ms with HTTP 200 and revision 64. The client
  consumed revision 64, exited loading and displayed its explicit Russian
  server signal-selection validation error; no Plotly render was reached and
  all 25 samples were not run. There was no 409, replay, abandoned request or
  connection hang in this lifecycle. Platform/network/Plotly are excluded for
  this occurrence; persisted backend layout/signal selection and response
  construction require investigation. Persistent bindings could not be
  restored without a functionally ready active plot. No files or direct API
  mutations were made.
evidence:
  - /private/tmp/HND-0278-layout-diagnostic-2026-08-05T15-05-59-991Z/report.json
  - /private/tmp/HND-0278-layout-diagnostic-2026-08-05T15-05-59-991Z/final.png
  - /private/tmp/HND-0278-e2e-profile-2026-08-05T15-00-52-610Z/failure.png
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
---
