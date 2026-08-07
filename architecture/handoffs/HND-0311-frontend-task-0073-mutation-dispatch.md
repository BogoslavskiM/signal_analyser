---
id: HND-0311
type: task
from: orchestrator
to: frontend
title: Repair synchronous render exception before mutation dispatch
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own public/** only. HND-0310 proves plot-type and confirmed delete-display
  actions enter busy UI but emit no product POST because synchronous render
  throws `Cannot set properties of null (setting 'textContent')`. Inspect the
  active-host ownership topology and fix the authoritative render path so
  absent legacy shell nodes cannot abort enqueue/dispatch. Do not hide the
  error with a broad catch or delay. Preserve the pane-owned title, exact API
  methods/payloads, overlay/focus lifecycle, latest-only Plotly.react queue and
  all live zoom/pan/autoscale behavior. No visible design change is authorized.
  Run syntax and full frontend tests without editing tests or starting a local
  application. Do not touch backend, architecture, Project.toml or
  Manifest.toml. You are not alone in the worktree; preserve all concurrent
  changes.
acceptance_criteria:
  - Plot-type and delete-display paths cannot throw before product dispatch.
  - Exactly one intended mutation is queued for each action.
  - Busy state settles from authoritative response/error.
  - Live Plotly and overlay contracts remain unchanged and tests pass.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/graph-output-zone, frontend/output-loading-flow]
---
