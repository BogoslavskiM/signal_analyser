---
id: HND-0399
type: report
from: e2e
to: orchestrator
title: Final production design smoke completes with test-evidence residuals
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
expected_revision: 76cb9c6a360ed6d852203f9be0ed7a1a4003e156
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
description: |
  Production-only retry passed exact SHA/readiness, both shell layouts, Settings
  alignment, legend/help geometry, table checkbox, Russian local-only search,
  selection preservation, zero mutation requests and live modebar-free Plotly.
  New-functionality score was 10/16 and quick regression 3/4. Six failed visual
  assertions are classified as harness evidence gaps: transition styles were
  sampled before completion and the layout test expected an img instead of the
  canonical CSS .layout-grid-icon. One anonymous resource 404 was observed with
  no JavaScript exception or identified failing product control. Per the user's
  closeout instruction no third cycle was launched.
design_evidence: ../../test/playwright/artifacts/HND-0398/report.json
---
