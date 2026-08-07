---
id: HND-0252
type: report
from: e2e
to: orchestrator
title: Production maintenance page блокирует stall profile
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  After HND-0249 nominal restart, exact production URL loaded a page titled
  `Server maintenance`; [data-testid="app-shell"] remained absent for 60s and
  /api/status could not attest revision. Planned 25, passed 0, failed samples 0,
  not-run 25. No state was read or mutated. Two browser resource requests
  returned 404. P50/P95 and Frontend/Backend/Plotly attribution remain
  unavailable. Evidence:
  /private/tmp/HND-0235-e2e-profile-2026-08-05T12-46-05-704Z/report.json,
  failure.txt and reviewed failure.png. The runtime is not operational.
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
---
