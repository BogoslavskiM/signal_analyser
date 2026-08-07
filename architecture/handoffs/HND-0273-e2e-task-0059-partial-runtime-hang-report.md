---
id: HND-0273
type: report
from: e2e
to: orchestrator
title: TASK-0059 profile stopped after production layout loading hang
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  The one-worker foreground Chrome run attested the expected production SHA
  and completed 5 of 25 planned samples with no test failure before
  active_pane_layout_change left the UI at Loading layout for 60 seconds.
  Recovery did not return an active ready plot. Partial settings telemetry was
  p50 350 ms and p95 16466 ms; the outlier contained 16308 ms API wait while
  Plotly.react was 4.5 ms and browser script/layout were under 5 ms. This
  incomplete sample does not establish Frontend, Backend, Plotly or platform
  ownership and is not an Engee bug classification. DevOps log correlation
  and runtime recovery are required before rerunning the same matrix. No test,
  product or dependency files were changed.
evidence:
  - /private/tmp/HND-0235-e2e-profile-2026-08-05T14-25-58-552Z/report.json
  - /private/tmp/HND-0235-state-recovery-2026-08-05T14-33-07-804Z/report.json
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
---
