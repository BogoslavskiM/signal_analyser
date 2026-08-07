---
id: HND-0202
type: task
from: orchestrator
to: backender
title: Implement immutable runtime revision status contract
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Implement the agreed product contract only. Add immutable typed strict
  lowercase 40-hex validation and one-time SIGNAL_ANALYSER_RUNTIME_REVISION load,
  expose runtime_revision in /api/status, and return Cache-Control: no-store.
  Missing/empty/padded/uppercase/malformed input must fail bootstrap with no
  fallback. Preserve state_revision and all other API behavior. Do not edit tests,
  run.jl, frontend, architecture or dependency files; another role owns tests.
acceptance_criteria:
  - RuntimeRevision is immutable and strict; no normalization or fallback exists.
  - Environment is read once during bootstrap before readiness.
  - /api/status adds exact runtime_revision and no-store only.
  - Product code syntax/load checks pass under an explicit valid fixture SHA.
requested_skills: [backender/backender-workflow, backender/backend-design, backender/api-contract-planning]
design_ref: null
design_version: null
---
