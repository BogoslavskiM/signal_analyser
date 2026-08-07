---
id: HND-0241
type: design_task
from: orchestrator
to: designer
title: Закрепить белый low-prominence Plotly modebar
task_section: ../tasks/TASK-0057-ui-overlay-refinement-design.md#scope
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
required_states: [default, hover, focus-visible, active, disabled]
required_viewports: [1440x900, 1280x720, 1024x768]
description: |
  Explicit user design requirement: every standard Plotly.js modebar has a
  white, visually low-prominence default surface like canonical analytical
  applications. Preserve standard Plotly tools/anatomy. Pin exact background,
  border/shadow, icon opacity/color and hover/focus/active tokens from the
  selected canonical profile; interactive states become clearer without any
  geometry shift. Add representative screenshots and computed token values to
  the same review-ready package.
acceptance_criteria:
  - Default modebar is white and unobtrusive while remaining discoverable.
  - Hover/focus/active states have sufficient contrast and exact pinned tokens.
  - No collision or geometry shift with legend/selectors/adjacent panes.
requested_skills:
  - designer/output-and-visualization
  - designer/visual-system
---
