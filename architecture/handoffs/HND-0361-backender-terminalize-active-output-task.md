---
id: HND-0361
type: task
from: orchestrator
to: backender
title: Terminalize every active-output background task outcome
task_section: ../tasks/TASK-0075-fix-production-active-output-pending.md#acceptance-criteria
description: |
  Continue the completed HND-0355 diagnosis and implement it now in app/** or
  lib/** only. The calculation manager currently allows active_task to throw
  outside narrow try blocks, leaving manager status pending; later polls then
  silently restart the task forever. Wrap the entire task lifecycle so every
  outcome publishes ready or explicit terminal error under the existing
  revision/context stale guard. Ensure production polling yields to the Julia
  scheduler after task launch and cannot indefinitely recycle a failed/stuck
  context; add bounded terminalization consistent with current architecture.
  Preserve active-only CPU/network, candidate/cache rollback and lightweight
  response shapes. Do not edit tests/public/architecture/dependencies, use
  Project.toml/Manifest.toml or start a local app. Run focused dependency-
  independent polling probes and full `julia --startup-file=no
  test/back/runtests.jl`; return only after code and evidence are complete.
acceptance_criteria:
  - No exception path leaves the manager indefinitely pending.
  - Polling reaches ready or explicit terminal error without wait(task).
  - Failed/stale tasks are not silently restarted forever.
  - Full backend corpus passes.
requested_skills: [backender/backender-workflow, backender/state-model, backender/calculation-planning, backender/apply-calculation-flow, backender/api-contract-planning]
---
