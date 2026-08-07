---
id: HND-0320
type: report
from: backender
to: orchestrator
title: Lightweight active-output backend architecture implemented
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Backender implemented SignalAnalyserCalculationManager with monotonic
  calculation revisions, page invalidation, typed plot cache, one active task,
  cooperative cancellation and context-key guarded publication. New
  state-lite/layout-lite paths exclude graph arrays; active output is the only
  calculation/materialization path. Mutation helpers retain lightweight=false
  default compatibility while HTTP hot routes request lightweight=true.
  Representative dependency-free harnesses measured state-lite 4,157 B,
  settings mutation 36,675 B and pending active output about 278 B. Duplicate
  polling reuses one task; cache hit, stale rejection, last-good preservation,
  session runtime exclusion and active-only behavior pass. Parser and diff
  checks pass. Existing backend runner reached 1,774 passes, then four old
  TASK-0031 route-source expectations failed because they require eager layout
  outputs; HND-0321 owns the independent contract update and full regression.
  Frontend must adopt state-lite/active-output before deployment.
acceptance_criteria:
  - Lightweight metadata excludes graph arrays: passed in harness.
  - Representative metadata is below 64 KiB: passed.
  - Active-only task/cache/revision behavior: passed in harness.
  - Full independent backend corpus: pending HND-0321.
  - Production byte/latency evidence: pending integrated deploy/E2E.
applied_skills: [backender/backender-workflow, backender/backend-design, backender/state-model, backender/api-contract-planning, backender/calculation-planning, backender/apply-calculation-flow]
---
