---
id: HND-0416
type: task
from: orchestrator
to: e2e
title: Post-TASK-0078 production quick baseline
task_section: ../tasks/TASK-0078-matlab-reference-math-audit.md#acceptance-criteria
description: |
  e2e_mode: quick_regression
  Trigger task TASK-0078 is research-only and made no product changes. Verify
  the exact currently deployed production revision as a baseline before the
  explicit-Apply/math refactor: application availability/readiness, shell load,
  state-lite startup, absence of maintenance/HTTP 500/page exception, and one
  bounded current critical user workflow that is possible from existing data.
  Do not claim MATLAB parity or new functionality. Preserve all pre-existing
  Chrome tabs and close only pages created by this run.
trigger_task: TASK-0078
target_status: available
target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
acceptance_criteria:
  - Production target serves the exact expected revision and is ready.
  - Planned/passed/failed/not-run checks and quick success rate are reported.
  - No MATLAB parity or new Apply behavior is inferred from baseline runtime.
  - Run-created tabs are closed and pre-existing tabs remain untouched.
requested_skills: [e2e/e2e-workflow]
---
