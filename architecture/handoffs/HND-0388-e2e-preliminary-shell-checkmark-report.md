---
id: HND-0388
type: report
from: e2e
to: orchestrator
title: Preliminary shell and checkmark production inspection
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
expected_revision: e0d1253433505943569c2a6b5e07555d5504be0b
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
description: |
  Exact revision and readiness passed. No shell-zone crop was reproduced at
  1024x768, 1280x720 or 1440x900; all five zones were reachable and document
  dimensions matched the viewport. The reported green check overflow was not
  reproduced in the old revision. One Frontend finding remains: at 1024x768 the
  last-cell .signal-cell-copy right edge is 1025.11 while .signal-type-cell ends
  at 1016.50, so text escapes its cell before shell clipping. The stale full run
  was stopped pending redeploy.
design_evidence: ../../test/playwright/artifacts/HND-0384/preliminary/report.json
---
