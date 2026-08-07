---
id: HND-0095
type: report
from: backender
to: orchestrator
title: TASK-0029 authoritative multi-layout backend contract verified
task_section: ../tasks/TASK-0029-multilayout-state-contract.md#verification-and-results
applied_skills:
  - backender/backender-workflow
  - backender/backend-design
  - backender/state-model
  - backender/api-contract-planning
skipped_requested_skills: []
description: |
  Current backend already satisfies TASK-0029; no file changes were required.
  SignalAnalyserState owns version-1 layouts with ordered stable pane IDs,
  dimensions 1..4, active pane, monotonic next-pane allocation, independent
  plot type and ordered unique signal bindings.

  GET /api/layouts returns the authoritative layouts plus full state snapshot.
  POST /api/layouts accepts exact revision-aware resize, select_pane and
  update_pane unions. Validation is HTTP 422 invalid_request; stale revision is
  HTTP 409 stale_state with current layout/state; mutation uses a cloned
  candidate and publishes atomically. No-op does not increment revision.

  Resize preserves the ordered prefix, drops only the suffix, creates empty
  time panes with never-reused pane-N IDs, preserves a surviving active pane
  and otherwise selects the first surviving pane. Signal removal reconciles
  all panes without changing surviving binding order.

  Session schema and layout version remain 1. Explicit layout round-trip
  preserves topology/order/IDs/active pane/allocator/types/bindings. Legacy
  Displays without layout migrate to canonical 1x1 pane-1 while retaining the
  previous active plot, visible signals and typed Display settings.

  Focused command included multilayout bootstrap and session suites plus route
  assertions: 64/64 PASS, exit 0. Full command
  `julia --startup-file=no test/back/runtests.jl`: all testsets PASS, exit 0.
  Orchestrator independently repeated the full command successfully.
  Project.toml and Manifest.toml were not used or changed.
---

# Contract references

- `lib/domain/signal_analyser_state.jl`: typed pane/layout aggregate and resize.
- `lib/services/signal_analyser_service.jl`: wire mapping, strict validation and
  atomic layout mutation.
- `lib/services/signal_session_service.jl`: explicit layout parse/export and
  legacy migration.
- `app/routes.jl`: `GET /api/layouts` and `POST /api/layouts`.

# Downstream FYI

- Frontend must use `/api/layouts` as authoritative source, never allocate pane
  IDs locally, and recover from 409 through the returned `current` snapshot.
- Tester should cover exact operation unions, no-op revision, stale rollback,
  prefix/suffix resize rules, active fallback and both session forms.
