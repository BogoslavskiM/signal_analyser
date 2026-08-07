---
id: HND-0324
type: task
from: orchestrator
to: tester
title: Verify frontend state-lite to live active-output lifecycle
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Own test/front/** only. Replace obsolete expectations for eager GET
  /api/state and eager Plotly script/render with the accepted HND-0320/HND-0323
  state-lite + local-lazy active-output contract. Add deterministic behavior
  coverage for startup metadata, active-only polling, pending/ready/error,
  inactive_output 409 reconciliation, revision/context stale rejection,
  display/pane/plot switching cancellation, and exactly one latest ready render.
  Prove lazy source is package-local, modebar hidden, staticPlot/fixedrange/
  image/raster fallback absent and the resulting Plotly host remains capable of
  zoom/pan/autoscale events. Preserve TASK-0073 pane-owned mutation dispatch,
  localization and overlay suites. Inspect source for duplicate/ambiguous
  lifecycle definitions and report a Frontend gap instead of encoding broken
  behavior. Do not change product/backend/architecture/dependencies, do not
  read/use Project.toml or Manifest.toml and do not start a local app. Run the
  focused files and complete frontend corpus with exact counts.
acceptance_criteria:
  - State-lite/active-output lifecycle has deterministic race coverage.
  - Only current active context can render ready data.
  - Live non-static Plotly contract remains enforced.
  - Complete frontend corpus passes or exact Frontend gaps are isolated.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
