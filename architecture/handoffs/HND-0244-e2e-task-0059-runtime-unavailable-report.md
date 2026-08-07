---
id: HND-0244
type: report
from: e2e
to: orchestrator
title: Production stall profile остановлен до первого sample
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  Exact target https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  at required revision cac83c5f445352a50f04aeeeb269b47007766d79 was not
  reachable or attestable. Foreground visible Google Chrome navigation timed
  out after 30.1 seconds; the retry was interrupted by chrome-error://chromewebdata/
  while the title remained `Loading https://engee.com/account/`. Planned 25,
  passed 0, failed samples 0, not-run 25. No product/state mutation occurred.
  P50/P95, long tasks, network waterfall, Plotly and DOM/render attribution are
  unavailable and no Frontend/Backend ownership is inferred. Raw evidence:
  /private/tmp/HND-0235-e2e-profile-2026-08-05T12-16-17-524Z/report.json,
  failure.txt and failure.png in the same directory.
applied_skills:
  - e2e/e2e-workflow
skipped_requested_skills:
  - e2e/visual-analysis: TASK-0059 has ui_impact none and no pinned design/prototype contract; visual runtime failure screenshot was still inspected.
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
---
