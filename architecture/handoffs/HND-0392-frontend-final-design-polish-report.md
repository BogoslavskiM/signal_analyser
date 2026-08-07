---
id: HND-0392
type: report
from: frontend
to: orchestrator
title: Final production design-readiness polish complete
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/settings-controls, frontend/multi-page-element, frontend/inspector-ui, frontend/graph-output-zone]
skipped_requested_skills: []
description: |
  All seven final user items are implemented in six public files. The shell
  retains 920x680 minimums and containing-block fill; Display settings rows are
  stable; the compact HTML legend is upper-right and pointer-inert; screen close,
  centered + and layout action use canonical geometry/states; table header and
  row actions are contained; last-cell copy ellipsizes; Russian client-side
  signal search filters by name without backend mutation. Plotly internal legend
  is suppressed through a cloned layout while live Plotly and no-modebar remain.
  Production JS syntax 4/4, frontend corpus 10/10 and diff check pass.
---
