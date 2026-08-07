---
id: HND-0280
type: task
from: orchestrator
to: backender
title: Diagnose revision-64 layout and signal-selection consistency
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  Diagnose HND-0279 against the current backend source and deterministic
  tests. The exact old production baseline returned HTTP 200 revision 64 from
  GET /api/layouts, but its active layout/signal-selection contract was invalid
  and the frontend correctly quarantined it before Plotly. Trace how persisted
  signals, row_selected_signal, analysis_signal/selected_signal, pane bindings,
  active pane and active-only outputs are normalized and serialized. Identify
  the deterministic state transition that can produce a successful envelope
  with zero usable bindings or a selected signal absent from authoritative
  signals. If this is a current-source defect, implement the smallest backend
  invariant repair and add/update backend tests within backend/test ownership;
  if it is only corrupt old persisted production state, return a precise safe
  recovery operation for Engee User/DevOps rather than changing unrelated code.
  Preserve active-only output performance semantics. Do not touch public/**,
  frontend tests, architecture, Project.toml or Manifest.toml and do not start
  the application locally.
acceptance_criteria:
  - Root cause or exact evidence boundary is documented from the selection/layout pipeline.
  - Successful layout envelopes cannot expose invalid selected/bound signal references.
  - Any current-source fix has focused and full backend regression evidence without dependency files.
  - Any production-only recovery is explicit, minimal and preserves the exact baseline until authorized otherwise.
requested_skills: [backender/backend-workflow, backender/backend-api-development, backender/backend-testing]
---
