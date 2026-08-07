---
id: HND-0239
type: design_task
from: orchestrator
to: designer
title: Уточнить Display plus и стандартные Plotly.js tools
task_section: ../tasks/TASK-0057-ui-overlay-refinement-design.md#scope
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
required_states: [default, hover, focus-visible, active, warning, disabled]
required_viewports: [1440x900, 1280x720, 1024x768]
description: |
  Explicit clarification superseding HND-0237 wording about an always-visible
  signal plus: the user means the `+` that adds a new Display/screen. Keep
  `+ Add Display` always visible in Display tabs. The separate Signals toolbar
  still keeps its `+` next to vertical ellipsis under the earlier requirement.
  Every graph pane must use the standard Plotly.js modebar and ordinary Plotly
  graph tools, not a custom imitation. Show real modebar anatomy/states and
  define collision with compact upper-right legend, plot-type selector and
  adjacent panes, including dense/10×10 behavior. Update DESIGN.md, prototype,
  interaction map and screenshots before the review-ready report.
acceptance_criteria:
  - Display-add and Signals-add controls are both visible and unambiguous.
  - Every graph uses a standard Plotly.js modebar/tool contract.
  - Modebar/legend/selectors do not collide at required viewports/layout states.
  - Final report records this clarification and click evidence.
requested_skills:
  - designer/application-composition
  - designer/output-and-visualization
  - designer/data-entry-and-inspection
---
