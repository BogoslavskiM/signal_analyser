---
id: HND-0240
type: design_task
from: orchestrator
to: designer
title: Сохранить hover/focus inline actions таблицы
task_section: ../tasks/TASK-0057-ui-overlay-refinement-design.md#scope
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
required_states: [default, hover, focus-visible, active, disabled]
required_viewports: [1440x900, 1280x720, 1024x768]
description: |
  Explicit user requirement: do not lose inline table row actions that appear
  on hover. Preserve all valid row actions except the separately removed Info
  action. Reserve stable action-column geometry so reveal causes no shift; make
  the same controls reachable on keyboard focus/focus-within. Add resting,
  pointer-hover and keyboard-focus prototype states/screenshots to the same
  in-progress package and include them in the interaction map/report.
acceptance_criteria:
  - Valid inline row actions are visible and operable on hover/focus.
  - Info is absent and no other action is accidentally removed.
  - Reveal does not change row/cell/column geometry at required viewports.
requested_skills:
  - designer/data-entry-and-inspection
  - designer/visual-system
---
