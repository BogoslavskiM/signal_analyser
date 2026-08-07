---
id: HND-0272
type: task
from: orchestrator
to: tester
title: Independently verify TASK-0058 and update deterministic frontend contracts
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own test/front/** only. Independently audit the accumulated public/**
  implementation against pinned design v2 and update obsolete deterministic
  tests that still assume one graph host. A multi-pane layout must assert one
  real Plotly.react host per rendered ready pane while preserving the active
  app-owned host contract. Add static/behavior coverage proving dragmode zoom,
  hidden modebar, compact upper-right legends and absence of staticPlot,
  fixedrange, image/raster/background/static graph fallbacks. Cover the new
  Russian source contract, seven-column signal table, mandatory Name column,
  borderless color swatch, inline Type-cell actions, display add/arrows/close,
  graph-help and overlay geometry/focus behavior where the current harness can
  prove it. Diagnose rather than blindly weakening any failing assertion.
  Do not change public/**, backend, architecture or dependency files. Do not
  use Project.toml or Manifest.toml, and do not start the application locally.
acceptance_criteria:
  - Existing obsolete single-host assertion is replaced by the exact active and multi-pane contract.
  - Live Plotly interaction/static-fallback prohibitions have deterministic coverage.
  - Russian UI and revised table/toolbar/overlay contracts have deterministic coverage.
  - Full node test/front/run_front_tests.js suite passes, or every product defect is reported precisely without weakening the contract.
requested_skills: [tester/tester-workflow, tester/frontend-testing]
---
