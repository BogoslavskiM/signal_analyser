---
id: HND-0334
type: task
from: orchestrator
to: tester
title: Replace remaining app-owned eager Plotly expectations
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Own test/front/** only. The accepted product architecture has app.js as the
  metadata/mutation coordinator and layouts.js as the sole active-output,
  local-lazy Plotly owner. Remove or rewrite the remaining C26 behavior and
  app.static assertions that demand app-owned pre-fatal Plotly.react or
  loadPlotlyScript. Preserve the intent: stale active-output completion after a
  fatal metadata reset must not render or overwrite state, local Plotly load
  failure is explicit, and exactly one current layouts-owned ready render is
  allowed. Do not weaken the strict HND-0324 lifecycle audit. Modernize the
  remaining legacy layouts parallel cold-start expectation to the app-published
  state-lite lifecycle. Run focused and full `node test/front/run_front_tests.js`.
  Do not change product/backend/architecture/dependencies, read/use
  Project.toml/Manifest.toml or start a local app.
acceptance_criteria:
  - No test requires eager Plotly ownership in app.js.
  - Fatal/stale/lazy-load behaviors remain covered at layouts ownership.
  - Complete eight-file frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
