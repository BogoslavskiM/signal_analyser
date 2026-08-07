---
id: HND-0341
type: task
from: orchestrator
to: tester
title: Align stale mutation error-envelope tests with state-lite contract
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own test/back/** only. The true complete backend run now reaches
  signal_analyser_api_test.jl:380-384 and fails two equality assertions plus
  one legacy plot_payload lookup. The /api/view and /api/displays mutation
  routes intentionally use lightweight=true; their stale/error envelopes must
  expose the authoritative state-lite/current response and must not contain
  graph arrays or legacy plot_payload. Update only these stale expectations,
  preserving exact revision/visible-signals/active-output metadata checks.
  Run focused API tests and then the complete runner using
  `julia --startup-file=no test/back/runtests.jl`. If Julia needs its external
  launcher lock file, request the narrow approved execution permission; do not
  accept a run that reports only the bootstrap 3/3. Never use --project,
  Project.toml/Manifest.toml or a local application runtime.
acceptance_criteria:
  - Stale mutation envelope is asserted as state-lite/current, without graph arrays.
  - No legacy plot_payload expectation remains on lightweight routes.
  - Complete backend corpus runs beyond bootstrap and passes.
  - Only test/back/** is changed.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
---
