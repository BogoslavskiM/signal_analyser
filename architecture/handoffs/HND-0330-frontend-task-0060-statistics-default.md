---
id: HND-0330
type: task
from: orchestrator
to: frontend
title: Restore per-display canonical Statistics default in lite snapshots
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Own public/js/app.js only. In measurementKindsSnapshot, a display-level
  omission must produce canonical minimum/maximum/mean and must not fall back
  to root measurement_kinds. Explicit display values, including an empty list,
  remain authoritative and malformed display values still quarantine. Remove
  only the incorrect root fallback; preserve active-output, Plotly, dispatch,
  localization and overlays. Run the authoritative project command
  `node test/front/run_front_tests.js`, not generic `node --test`, plus syntax
  and diff checks. Do not change tests/backend/architecture/dependencies, read
  or use Project.toml/Manifest.toml or start a local app.
acceptance_criteria:
  - Missing display measurement_kinds yields the canonical first three.
  - Explicit empty/subset and malformed cases retain existing semantics.
  - Project frontend runner passes all eight files.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api]
---
