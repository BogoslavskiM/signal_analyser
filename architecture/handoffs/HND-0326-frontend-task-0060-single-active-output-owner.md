---
id: HND-0326
type: task
from: orchestrator
to: frontend
title: Establish one unambiguous active-output and Plotly lifecycle owner
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own public/js/app.js and public/js/layouts.js only. Resolve HND-0325 by
  consolidating each layouts lifecycle function to exactly one definition:
  normalizeEnvelope, acceptEnvelope, queuePaneRender, renderPanePlots, refresh,
  postLayout and onAppRendered. Do not rely on hoisting overrides. layouts.js
  is the sole active-output poll and lazy Plotly render owner; remove the
  competing eager loadPlotlyScript/Plotly.react lifecycle from app.js while
  retaining app metadata/state coordinator behavior. Lite snapshots that omit
  measurement_kinds must normalize to canonical minimum/maximum/mean, without
  changing explicit values.

  Preserve TASK-0073 dispatch fix, all overlay/localization behavior and the
  interactive Plotly contract. No broad catch, static fallback or visible
  design change. Run syntax and complete frontend corpus against the current
  Tester changes; do not edit tests/backend/architecture/dependencies, read/use
  Project.toml/Manifest.toml or start a local app. Preserve concurrent work.
acceptance_criteria:
  - Every listed lifecycle function has one source definition and one owner.
  - app.js has no competing eager Plotly render/load lifecycle.
  - Missing measurement_kinds restores canonical three defaults.
  - State-lite race/live Plotly and full frontend corpus pass.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/graph-output-zone, frontend/output-loading-flow]
---
