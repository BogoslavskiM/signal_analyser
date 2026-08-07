---
id: HND-0290
type: report
from: tester
to: orchestrator
title: TASK-0072 canonical selection projection regression passed
task_section: ../tasks/TASK-0072-fix-layout-selection-projection.md#acceptance-criteria
description: |
  Independent focused backend regression passed 1920/1920 and the full suite
  passed 4006/4006 across 100 testsets using julia --startup-file=no without
  --project=.. Reverse pane order, canonical Display/root projection,
  corrupt-state rejection, real-change-only revision increments, session
  round-trip/atomic rejection and API parity all pass. Active-only semantics
  remain exact: inactive provider calls are zero and selecting active Spectrum
  produces exactly one Spectrum call with all other providers at zero.
  Project.toml and Manifest.toml are clean and were not read, modified or used.
  No product defects or missing acceptance coverage were found.
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
skipped_requested_skills: []
---
