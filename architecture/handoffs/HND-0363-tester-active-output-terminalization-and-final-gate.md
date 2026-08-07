---
id: HND-0363
type: task
from: orchestrator
to: tester
title: Add active-output terminalization regressions and run final local gate
task_section: ../tasks/TASK-0075-fix-production-active-output-pending.md#acceptance-criteria
description: |
  Own test/back/** and test/front/** only. Add deterministic backend regressions
  for HND-0362: no-wait polling reaches ready, exceptions/completed-without-
  publication/stuck tasks become explicit terminal error, the 64-poll bound is
  enforced, stale tasks cannot publish, last-good cache survives and terminal
  failure is not automatically restarted. Preserve active-only and lightweight
  response contracts. Then run the complete dependency-independent backend
  runner and the complete nine-file frontend corpus, including design-v2 and
  overlay coverage. Never use --project or Project.toml/Manifest.toml, edit
  product/architecture/Playwright/dependencies or start a local app. If Julia
  launcher needs its external lockfile, use the narrow approved execution path;
  do not accept bootstrap-only 3/3 as a full run.
acceptance_criteria:
  - New lifecycle terminalization and no-restart regressions pass.
  - Complete backend corpus executes beyond bootstrap and passes.
  - Complete frontend design-v2/overlay corpus passes 9/9.
  - Only test/back/** and test/front/** change.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
---
