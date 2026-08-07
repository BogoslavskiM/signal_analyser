---
id: HND-0230
type: report
from: e2e
to: orchestrator
title: Production stall profiling blocked by unavailable application shell
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  Foreground visible Google Chrome, headless:false, one worker reached the exact
  production URL, but app-shell did not become visible within 60 seconds and
  the expected revision could not be attested. Planned profile matrix was 25
  samples; passed 0, failed 0, not-run 25. No product mutation occurred.
  A bounded syntax-checked profiler was added at
  test/playwright/profile_frontend_stalls.js; failure evidence is under
  /private/tmp/HND-0229-e2e-profile-2026-08-05T10-34-29-819Z/failure.txt.
  Root layer is availability/deployment until runtime is restored; frontend,
  backend and Plotly attribution remains unknown. Proposed post-restore budgets:
  interaction P95 <=1000 ms, API P95 <=700 ms, no main-thread task >50 ms and
  cumulative long-task time <=200 ms per action.
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
skipped_requested_skills: []
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
expected_revision: 38d4134ea962b264ebabe0e7e9814c48368a975c
---
