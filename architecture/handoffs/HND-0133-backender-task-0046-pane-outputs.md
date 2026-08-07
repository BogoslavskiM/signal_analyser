---
id: HND-0133
type: task
from: orchestrator
to: backender
title: Add authoritative ordered plot outputs for every layout pane
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#scope
description: |
  Current /api/layouts exposes all pane configurations but only the active
  pane's plot_payload inside state. Design and implement a backward-compatible
  ordered per-pane output in the layout envelope so Frontend can render every
  pane simultaneously without select_pane mutations or guessed data. Reuse the
  existing typed pane settings, calculation and cache paths; preserve active
  state/revision/session. GET, POST 200 and stale 409 current must share the
  exact shape. Include explicit empty-pane behavior and bound max-16 handling.
  Work only backend and focused backend-test paths; do not modify frontend,
  architecture, deployment, Project.toml or Manifest.toml. Return the exact
  wire contract, paths, compatibility/performance decisions and focused/full
  suite counts. No commit/deploy.
acceptance_criteria:
  - Every authoritative pane has exactly one ordered identity/type/bindings/output entry.
  - All four renderer payload types and empty panes are deterministic.
  - GET/200/409 shape is identical and read paths do not mutate revision/active pane.
  - Existing layout/session/display contracts remain compatible.
  - Focused and full backend suites pass without dependency files.
requested_skills:
  - backender/backend-design
  - backender/state-model
  - backender/api-contract-planning
  - backender/calculation-planning
---
