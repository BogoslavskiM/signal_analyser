---
id: HND-0333
type: report
from: frontend
to: orchestrator
title: Per-display Statistics default restored
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Frontend removed the root measurement_kinds fallback in public/js/app.js.
  Display omission now yields minimum/maximum/mean; explicit empty/subset and
  malformed quarantine semantics remain authoritative. The project runner now
  advances to obsolete C26/static expectations that still require app-owned
  eager Plotly, while the accepted HND-0326 contract assigns all lazy Plotly
  ownership to layouts.js. HND-0334 owns removal/replacement of those legacy
  test assumptions; eager Plotly must not be restored to app.js.
acceptance_criteria:
  - Statistics omission/default regression: passed past prior assertion.
  - Syntax/diff: passed.
  - Full corpus: blocked by contradictory legacy app-owned Plotly tests.
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation]
---
