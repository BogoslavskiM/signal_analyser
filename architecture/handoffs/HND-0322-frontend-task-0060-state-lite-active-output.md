---
id: HND-0322
type: task
from: orchestrator
to: frontend
title: Adopt state-lite and active-output polling without losing live Plotly
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own public/** only. Integrate the HND-0320 API contract before any backend
  deployment. Startup and mutation reconciliation use GET /api/state-lite and
  lightweight mutation responses. Add GET
  /api/outputs/active?display_id=...&pane_id=... polling only for the current
  active output: pending is lightweight, ready contains ordered Plotly records,
  failed is explicit, inactive_output 409 triggers authoritative current-state
  reconciliation. Reject stale state/calculation revisions and context keys;
  screen/plot/layout changes must cancel/ignore obsolete polls. Do not fetch or
  render inactive outputs and do no browser DSP.

  Preserve current localized UI, TASK-0073 null-title fix, overlay lifecycle,
  active app-owned host plus inactive pane ownership, and latest-only rAF
  Plotly.react rendering. Every ready graph remains live interactive Plotly;
  no static image/raster/fixedrange fallback. Keep semantic actions immediate
  and existing debounce budgets. No visible design deviation is authorized.
  Extend API/state integration source as needed inside public/**, run syntax
  and full frontend tests without editing tests or starting a local app. Do not
  touch backend/tests/architecture/Project.toml/Manifest.toml or dependencies.
  Preserve concurrent worktree changes.
acceptance_criteria:
  - Startup/mutations accept lightweight state without fatal quarantine.
  - Only active output is polled and stale/inactive results cannot render.
  - Pending/error/ready lifecycles settle without UI stalls.
  - Live zoom/pan/autoscale Plotly and latest-only queue remain intact.
  - Full frontend corpus passes and API signatures are reported to Tester.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/graph-output-zone, frontend/output-loading-flow]
---
