---
id: HND-0332
type: task
from: orchestrator
to: backender
title: Make legacy active-view provider failure fully atomic
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own app/** and lib/** only. The dependency-independent full runner isolated
  Cascade 23: legacy apply_signal_analyser_view!(lightweight=false) switching a
  cold Time display to Persistence increments revision, changes active_plot and
  mutates caches before a provider failure is returned. Prepare prospective
  display/full snapshot/cache on a clone and publish only after success, as in
  the accepted inventory fix. On failure preserve exact domain revision,
  active plot, all four cache families and output manager; on success preserve
  existing response/API behavior. lightweight=true must remain provider-free
  and publish metadata atomically. Genuine cold output provider errors still
  surface explicitly. Do not change tests/public/architecture/dependencies,
  read/use Project.toml/Manifest.toml or start a local app. Run focused Cascade
  23 and full `julia --startup-file=no test/back/runtests.jl`.
acceptance_criteria:
  - Cascade 23 provider failure leaves revision/plot/cache exactly unchanged.
  - Successful legacy and lightweight view paths preserve their contracts.
  - Full dependency-independent backend corpus passes.
requested_skills: [backender/backender-workflow, backender/state-model, backender/apply-calculation-flow]
---
