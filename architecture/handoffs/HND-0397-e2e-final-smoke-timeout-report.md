---
id: HND-0397
type: report
from: e2e
to: orchestrator
title: Final smoke blocked by transient Chrome navigation timeout
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
expected_revision: 76cb9c6a360ed6d852203f9be0ed7a1a4003e156
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
description: |
  Prototype checks passed at both viewports, but the first production navigation
  returned net::ERR_TIMED_OUT before DOM readiness, leaving production checks not
  run. Immediate independent probes then returned root HTTP 200 in 0.46 seconds
  and exact SHA with ready/ok=true, so one bounded production-only retry is
  authorized; no product defect is inferred from the transient timeout.
design_evidence: ../../test/playwright/artifacts/HND-0396/report.json
---
