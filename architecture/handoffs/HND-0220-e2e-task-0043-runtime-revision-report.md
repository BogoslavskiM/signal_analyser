---
id: HND-0220
type: report
from: e2e
to: orchestrator
title: Browser-visible immutable runtime revision production E2E passed
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Exact production SHA 38d4134ea962b264ebabe0e7e9814c48368a975c passed
  21/21 browser checks. With cache disabled and service workers blocked, two
  unique nonce status requests plus one post-reload request returned the exact
  schema and runtime_revision; external policy was no-cache with absent Age.
  Mutable state_revision stayed 0 and the state hash was exactly unchanged.
  Root DOM, plot, signals, layout and four key assets were healthy; product
  mutating requests were zero and no application errors occurred.
applied_skills: [orchestrator/orchestrator-workflow, e2e/e2e-workflow]
design_ref: null
design_version: null
design_status: n/a
---
