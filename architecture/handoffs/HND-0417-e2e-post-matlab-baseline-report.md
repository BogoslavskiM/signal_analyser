---
id: HND-0417
type: report
from: e2e
to: orchestrator
title: Post-MATLAB-audit production baseline blocked by HTTP 404
task_section: ../tasks/TASK-0078-matlab-reference-math-audit.md#result
description: |
  Quick regression planned 6 checks and passed 0: production main document
  returned HTTP 404 at 2026-08-06T15:09:26.558Z. Functional checks stopped;
  exact revision, readiness, state-lite, shell and bounded workflow were not
  run. This is availability failure, not an Engee bug classification. DevOps
  HTTP-status/pod/start/readiness/log diagnostics are required.
applied_skills: [e2e/e2e-workflow]
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
evidence_status: collected
log_refs:
  - ../../test/playwright/artifacts/HND-0416/report.json
  - ../../test/playwright/artifacts/HND-0416/production-availability-failure-1440x900.png
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
opened_tab_count: 1
closed_tab_count: 1
tab_cleanup_status: passed
planned: 6
passed: 0
failed: 1
not_run: 5
success_rate_percent: 0
availability: failed
result: blocked
---
