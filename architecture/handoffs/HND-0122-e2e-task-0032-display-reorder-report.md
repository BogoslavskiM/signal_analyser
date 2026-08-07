---
id: HND-0122
type: report
from: e2e
to: orchestrator
title: Authoritative Display reorder API regression passed
task_section: ../tasks/TASK-0032-display-tab-order-contract.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  Exact revision bbe0c53e28520feb1799c5dc1bc71db7e865fee3 was available.
  Planned/passed/failed/not-run 13/13/0/0, success 100%. Exact permutation,
  active-ID preservation and session order passed; identical reorder was a
  revision-preserving no-op. Malformed, duplicate, missing and unknown orders
  returned 422 without mutation; stale revision returned 409 without partial
  mutation. Session import restored the canonical baseline exactly.

  Evidence: /private/tmp/e2e-hnd-0110-20260804-evidence/HND-0110-run.json
---
