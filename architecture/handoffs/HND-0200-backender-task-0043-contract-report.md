---
id: HND-0200
type: report
from: backender
to: orchestrator
title: Immutable runtime revision API contract ready
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Recommend top-level /api/status runtime_revision as an exact lowercase 40-hex
  Git SHA, distinct from mutable state_revision and immutable for process life.
  Read SIGNAL_ANALYSER_RUNTIME_REVISION exactly once during bootstrap into a
  typed value; missing, padded, uppercase or malformed values fail startup with
  no fallback. Add Cache-Control: no-store. DevOps must inject the independently
  resolved clean production checkout SHA and E2E must compare it exactly.
applied_skills: [backender/backender-workflow, backender/backend-design, backender/api-contract-planning]
design_ref: null
design_version: null
design_status: n/a
---
