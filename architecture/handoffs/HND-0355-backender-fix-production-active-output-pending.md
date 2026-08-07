---
id: HND-0355
type: task
from: orchestrator
to: backender
title: Fix production active-output task that remains pending indefinitely
task_section: ../tasks/TASK-0075-fix-production-active-output-pending.md#acceptance-criteria
description: |
  Own app/** and lib/** only. HND-0354 observed production SHA c7e0f9a4 stuck
  in «Обновление графика…» after 10 seconds: no ready Plotly payload reached the
  frontend. Diagnose the new SignalAnalyserCalculationManager/background task,
  scheduling, lock/publication and provider path under production-compatible
  Julia semantics. Ensure bounded polling of /api/outputs/active transitions
  pending→ready or explicit terminal error, never indefinite pending, while
  preserving active-only calculation, revision/context stale guards, cache
  rollback and lightweight metadata responses. Do not change the default pane
  count merely because the design prototype demonstrates 1x2; one default
  screen is required, but the mock layout is not an authoritative backend
  topology change. Do not edit tests/public/architecture/dependencies, read/use
  Project.toml/Manifest.toml or start a local app. Run focused source checks and
  full `julia --startup-file=no test/back/runtests.jl`.
acceptance_criteria:
  - Active output reaches ready or explicit error in bounded polls.
  - Ready response contains ordered Plotly records for the active pane.
  - Active-only/revision/cache/rollback contracts remain intact.
  - Complete backend corpus passes without project environment or local runtime.
requested_skills: [backender/backender-workflow, backender/state-model, backender/calculation-planning, backender/apply-calculation-flow, backender/api-contract-planning]
---
