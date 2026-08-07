---
id: HND-0264
type: task
from: orchestrator
to: tester
title: Независимо проверить active-only fix и 10x10 regression
task_section: ../tasks/TASK-0068-update-layout-active-only-regressions.md#acceptance-criteria
description: |
  Review HND-0261/HND-0262 and independently rerun pane_outputs,
  multilayout_integration and the full backend suite. Confirm zero inactive
  provider calls, typed active-provider failures, 1..10/100 layout metadata,
  session round-trip and revision semantics. Use julia --startup-file=no with
  explicit includes/runtests only; do not use --project=., read or modify
  Project.toml/Manifest.toml, start the app locally or touch product code.
acceptance_criteria:
  - Focused suites and full backend runner pass independently.
  - Provider call counts and typed failure shape match TASK-0070.
  - TASK-0068 and TASK-0066 completion recommendation is explicit.
requested_skills:
  - tester/backend-unit-testing
  - tester/backend-api-testing
---
