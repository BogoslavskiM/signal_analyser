---
id: HND-0337
type: task
from: orchestrator
to: backender
title: Preserve cold-cache presentation-only settings semantics
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own app/** and lib/** only. The dependency-independent full runner passes
  3,282 assertions then fails two DEC-042 checks. A presentation-only
  spectrogram.scale mutation on an active cold Spectrogram display must store
  intent/revision and return typed-empty legacy presentation without invoking
  or warming the Spectrogram provider/cache. Current apply_signal_setting!
  mutates state and then calls generic signal_analyser_snapshot_unlocked,
  materializing the cold provider. Restore the existing selective/passive
  settings preparation path for lightweight=false, with candidate-atomic
  publication. lightweight=true remains metadata-only/provider-free. Warm
  presentation changes must reuse cache and convert scale without provider
  calls. Do not change tests/public/architecture/dependencies, read/use
  Project.toml/Manifest.toml or start a local app. Run DEC-042 focused and full
  `julia --startup-file=no test/back/runtests.jl`.
acceptance_criteria:
  - Cold presentation-only setting neither calls nor warms provider/cache.
  - Legacy response remains typed-empty; warm response reuses cache.
  - Revision/publication is atomic and lightweight path remains provider-free.
  - Full dependency-independent backend corpus passes.
requested_skills: [backender/backender-workflow, backender/state-model, backender/apply-calculation-flow, backender/calculation-planning]
---
