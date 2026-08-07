---
id: HND-0407
type: task
from: orchestrator
to: e2e
title: Final exact-revision production smoke for TASK-0060
e2e_mode: quick_regression
target: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  e2e_mode: quick_regression
  Run one bounded production-only browser smoke at exact revision
  `bba7f2528abccf14dcdd313681c8fd8bf538d40c`. Verify root and `/api/status`,
  no maintenance page, no uncaught JS exception or HTTP 500, and that the
  loaded `public/js/settings.js` carries the 150 ms contract. If an enabled
  continuous numeric settings input is available without creating signals,
  exercise rapid valid input while focused, assert one trailing settings
  mutation after the final edit, then restore the original value immediately
  and verify exactly one restore mutation. Do not fabricate a signal or alter
  layout merely to make the probe possible. Confirm the shell remains usable
  at 1024×768 and 1440×900; record live Plotly status if an active graph exists.
  Use the correct readiness route `/api/status`, not `/status`. Never start the
  app locally and do not touch dependency files.
allowed_paths:
  - test/playwright/**
acceptance_criteria:
  - Exact runtime revision, ready=true, ok=true and root HTTP 200 pass.
  - No 500 response, maintenance screen or page exception occurs.
  - Deployed settings asset contains the exact debounce implementation.
  - Available continuous-input probe coalesces and restores state, or is explicitly not applicable because no enabled input exists.
  - Both viewports retain a usable full-page shell.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
