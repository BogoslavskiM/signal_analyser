---
id: HND-0386
type: report
from: frontend
to: orchestrator
title: Page minimum and selected-check containment complete
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/settings-controls]
skipped_requested_skills: []
description: |
  CSS-only correction in public/css/layouts.css and public/css/settings.css.
  The shell fills larger containers, restores the 920x680 application minimum
  and uses document scrolling below that minimum. Selected enum options reserve
  a contained 16x16 slot and render the canonical tick in accent #1b84b8; native
  application checkboxes use the same accent. Row geometry remains unchanged.
  JavaScript syntax, diff check and the complete frontend corpus pass 9/9.
---
