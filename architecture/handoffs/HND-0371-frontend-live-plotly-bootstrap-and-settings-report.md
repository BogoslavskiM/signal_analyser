---
id: HND-0371
type: report
from: frontend
to: orchestrator
title: Production render crash fixed and settings consolidated
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Frontend made layouts rendering null-safe for all optional legacy nodes, so
  the absent layout-trigger-label can no longer abort pane host creation,
  active-output polling or lazy Plotly startup. Settings now expose one plot
  type control in the pane and one required duplicate in Display settings, one
  legend control, no legacy settings duplicates, and complete Russian
  presentation maps for 29 sections and 44 fields without changing API IDs or
  values. Overlay contracts are preserved.
acceptance_criteria:
  - Exact production syncContext crash: fixed.
  - Settings ownership and intentional plot-type duplication: preserved.
  - Russian dynamic catalog coverage: 29/29 sections, 44/44 fields.
  - Frontend corpus after Tester correction: 9/9 passed.
applied_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/output-loading-flow]
---
