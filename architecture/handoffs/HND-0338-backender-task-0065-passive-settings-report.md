---
id: HND-0338
type: report
from: backender
to: orchestrator
title: Passive settings cold-cache semantics restored
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Backender restored selective passive/effective/presentation settings
  preparation on an atomic candidate. DEC-042 passes 26/26: cold
  spectrogram.scale returns typed-empty output without provider/cache warming,
  warm presentation mutation reuses cache, and lightweight mutations remain
  provider-free. The dependency-independent full runner reaches 3,504 passes
  and has two remaining Tester-owned source assertions that still expect the
  obsolete non-lightweight view/display route calls.
acceptance_criteria:
  - Cold presentation-only mutation does not call or warm the provider/cache: passed.
  - Candidate rollback and lightweight provider-free behavior are preserved: passed.
  - Full backend corpus: pending Tester update of two obsolete source assertions.
applied_skills: [backender/backender-workflow, backender/state-model, backender/apply-calculation-flow, backender/calculation-planning, backender/api-contract-planning]
---
