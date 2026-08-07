---
id: HND-0160
type: task
from: orchestrator
to: frontend
title: Diagnose intermittent healthy-API browser shell bootstrap failure
task_section: ../tasks/TASK-0042-diagnose-visible-load-error.md#scope
description: |
  Diagnose the production browser bootstrap on exact SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8. E2E proved root/status/assets and
  APIs initially 200 and completed several multi-layout flows, then a fresh
  shell failed to expose layout-trigger within 30s while /api/state and
  /api/session stayed HTTP 200. Reproduce with clean browser contexts; capture
  exact console/page/network exception and state transition. Trace app bootstrap,
  layout bootstrap, Plotly and busy/error rendering. If frontend-owned, implement
  the minimal durable fix in Frontend-owned public paths and add focused/full
  frontend tests. If runtime/backend-owned, do not guess: return exact owning-role
  evidence. Preserve production session and restore any mutation. Do not inspect,
  use or modify Project.toml/Manifest.toml; no Git/deploy/devhub/fallback.
acceptance_criteria:
  - Exact failing request/exception/state transition is evidenced or bounded cleanly.
  - Healthy API responses cannot leave false load-error or missing layout shell.
  - Any frontend fix has focused and full regression with exact changed paths.
  - Production state is restored and dependency files remain untouched.
requested_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/output-loading-flow
  - frontend/frontend-project-structure
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
