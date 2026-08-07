---
id: HND-0297
type: report
from: e2e
to: orchestrator
title: Old baseline completed 25 attempts but re-corrupted selection projection
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
e2e_mode: analysis_regression
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  The one-worker foreground run reached all 25 planned attempts and produced
  each fifth-sample screenshot. Ready two-trace Time and Spectrum Plotly graphs
  rendered before the old deployed backend degraded canonical revision 65 to
  invalid revision 95 during layout scenarios. Final recovery had zero signal
  controls and no ready plot. The in-memory profiler did not flush aggregate
  telemetry during failure handling, so P50/P95 and budgets are not promoted.
  Document, status and layout returned HTTP 200; Plotly and platform outage are
  excluded. Current-source TASK-0072 fixes this exact projection defect and has
  passed 4006/4006 tests, so the next profile must run on a deployed feature
  revision and flush evidence incrementally. No files or direct API recovery
  mutation were made by E2E.
evidence:
  - /private/tmp/HND-0296-e2e-profile-2026-08-05T16-03-50-297Z
  - /private/tmp/HND-0296-ui-recovery-2026-08-05T16-15-39-778Z/report.json
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
---
