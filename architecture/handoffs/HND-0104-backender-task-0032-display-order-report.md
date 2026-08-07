---
id: HND-0104
type: report
from: backender
to: orchestrator
title: Persistent authoritative Display tab order implemented
task_section: ../tasks/TASK-0032-display-tab-order-contract.md#verification-and-results
applied_skills:
  - backender/backender-workflow
  - backender/state-model
  - backender/api-contract-planning
skipped_requested_skills: []
description: |
  Added operation reorder to existing POST /api/displays in
  lib/services/signal_analyser_service.jl. Exact request is state_revision,
  operation and full ordered array of all Display IDs. Extra/missing fields,
  non-array/empty/non-string IDs, duplicate, missing and unknown IDs return
  stable HTTP 422 invalid_request order/body errors. Well-formed stale requests
  return HTTP 409 without mutation.

  HTTP 200 returns the existing full authoritative snapshot with displays in
  requested order; active_display_id and typed Display objects are preserved
  by ID. Identical order is a no-op without revision increment. Existing
  ordered session displays array preserves order/import without schema change.

  Syntax, focused reorder/session probe, git diff check and full
  `julia --startup-file=no test/back/runtests.jl` passed. Orchestrator repeated
  the full suite successfully. Project.toml and Manifest.toml were not used or
  changed; no frontend/tests/architecture/Git/runtime change was made.
---
