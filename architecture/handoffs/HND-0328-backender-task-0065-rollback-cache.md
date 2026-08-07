---
id: HND-0328
type: task
from: orchestrator
to: backender
title: Preserve last-good full snapshot cache after failed inventory mutation
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own app/** and lib/** only. HND-0327 isolated one backend gap: after a failed
  inventory mutation with the Spectrum provider unavailable, the atomic state
  rollback restores domain/cache fields but a subsequent legacy
  signal_analyser_snapshot(state) attempts provider materialization instead of
  reusing the exact last-good snapshot/cache. Preserve legacy /api/state
  compatibility and the pre-mutation last-good plot/cache/context so rollback
  verification succeeds while the provider remains unavailable. Do not alter
  the test to state-lite and do not suppress provider errors on a genuine cold
  miss. Keep revision/task invalidation semantics and active-output path intact.
  Do not change tests/public/architecture/dependencies, do not read/use
  Project.toml/Manifest.toml and do not start a local app. Run parser/diff and
  a dependency-independent focused harness if possible.
acceptance_criteria:
  - Failed mutation is fully atomic across domain and last-good caches/context.
  - Legacy full snapshot reuses restored last-good data after rollback.
  - Genuine uncached provider failure still surfaces explicitly.
  - Active-output stale/cancellation contracts remain unchanged.
requested_skills: [backender/backender-workflow, backender/state-model, backender/apply-calculation-flow]
---
