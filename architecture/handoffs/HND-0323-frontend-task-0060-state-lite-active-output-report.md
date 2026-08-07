---
id: HND-0323
type: report
from: frontend
to: orchestrator
title: Frontend adopted state-lite and active-output polling
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Frontend changed public/js/api.js, public/js/app.js, public/js/layouts.js and
  public/index.html. Startup now requests /api/state-lite; layouts owns
  active-only /api/outputs/active polling with revision/context guards,
  inactive_output reconciliation and pending/error/ready states. Plotly is
  loaded lazily from the existing local asset and ready output is rendered via
  latest-only Plotly.react. No inactive output fetch, browser DSP, CDN,
  static/raster/fixedrange fallback or visible design change was introduced.
  Syntax and diff checks pass. The old frontend corpus fails at its legacy
  /api/state and eager Plotly assumptions; HND-0324 owns independent contract
  modernization and complete regression.
acceptance_criteria:
  - Lightweight startup/mutation integration: implemented.
  - Active-only polling and stale-context rejection: implemented.
  - Local lazy live Plotly path: implemented.
  - Complete independent frontend corpus: pending HND-0324.
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/graph-output-zone, frontend/output-loading-flow, frontend/design-implementation]
---
