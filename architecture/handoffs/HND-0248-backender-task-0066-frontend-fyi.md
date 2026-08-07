---
id: HND-0248
type: FYI
from: backender
to: frontend
title: Layout API расширен до 10×10 и active-only output
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#scope
description: |
  POST /api/layouts method/path/request shape is unchanged and now accepts
  rows/columns 1..10. layout.panes remains the full ordered metadata list up to
  100 panes; layouts[].outputs contains only active_pane_id for active Display
  and [] for inactive Displays, consistently in GET, POST 200 and 409.current.
  public/js/layouts.js currently requires outputs.length == panes.length and
  must migrate under TASK-0058. Recommendation warning remains UI-only.
applied_skills: [backender/api-contract-planning]
---
