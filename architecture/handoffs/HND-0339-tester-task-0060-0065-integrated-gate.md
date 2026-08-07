---
id: HND-0339
type: task
from: orchestrator
to: tester
title: Final dependency-independent backend and interactive Plotly contract gate
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own test/back/** and test/front/** only. Update the two obsolete backend
  source-text assertions so view/display mutations require lightweight=true,
  then independently run the complete backend runner with
  `julia --startup-file=no test/back/runtests.jl`. Do not use --project, read or
  modify Project.toml/Manifest.toml, start an application locally, or change
  product/architecture files. Also run the exact eight-file frontend corpus and
  preserve strict evidence that every ready pane is a live package-local
  Plotly DOM instance rendered through serialized latest-only Plotly.react:
  staticPlot/fixedrange/image/raster fallbacks are forbidden; zoom, Shift+LMB
  pan and double-click autoscale capability must survive type, screen and layout
  updates. Static/behavior evidence does not replace the later production E2E.
acceptance_criteria:
  - Two stale route assertions reflect the accepted lightweight mutation contract.
  - Complete backend corpus passes with the dependency-independent runner.
  - Complete frontend corpus passes and retains live non-static Plotly contracts.
  - No product, architecture, dependency or Playwright files are changed.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
---
