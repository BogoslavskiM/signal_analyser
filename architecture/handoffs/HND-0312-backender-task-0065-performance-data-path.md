---
id: HND-0312
type: task
from: orchestrator
to: backender
title: Implement lightweight active-output backend data path from production evidence
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own app/**, lib/**, app.jl, run.jl and config/** only. HND-0310 measured a
  298,364 B settings mutation response, initial state 273,450 B, layouts
  307,543 B and display-create latency 1347 ms, while browser/Plotly work was
  small. Implement the already-specified TASK-0065 architecture: lightweight
  state metadata path, graph arrays separated from metadata mutations,
  active-output-only materialization, deterministic plot cache/invalidation,
  monotonic state/calculation revisions and stale-publication guards. Preserve
  all existing calculation semantics and current API compatibility where
  required by deployed clients. No new Engee function or MATLAB-derived
  behavior is introduced, so Engee/MATLAB research is not applicable.

  Targets from HND-0310: metadata/state-lite response <=64 KiB, mutation API
  P95 <=300 ms, accepted mutation revision exactly +1, inactive outputs perform
  no heavy calculation or graph-array transfer. Do not read, edit or use
  Project.toml/Manifest.toml; do not add dependencies and do not start a local
  application. You may run source/backend checks that do not use the forbidden
  dependency files. You are not alone in the worktree; preserve all concurrent
  changes and do not touch public/test/architecture.
acceptance_criteria:
  - State-lite/metadata responses exclude graph arrays and meet the structural
    <=64 KiB target on representative current state.
  - Only active output materializes or returns graph payload.
  - Cache invalidation and revisions reject stale publication deterministically.
  - Existing calculations and public behavior remain compatible.
  - No dependency files or local application runtime are used.
requested_skills: [backender/backender-workflow, backender/backend-design, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
---
