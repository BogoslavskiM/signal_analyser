---
id: HND-0345
type: design_revision
from: orchestrator
to: designer
title: Re-audit and restore live Plotly interaction in the pinned design package
task_section: ../tasks/TASK-0067-revise-display-toolbar-and-signal-row-actions.md#acceptance-criteria
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  The user explicitly reports that the graph in the design appears to have
  stopped being interactive. Treat live interaction as blocking, not a visual
  screenshot requirement. Click-test the package-local prototype at 1024x768,
  1280x720 and 1440x900. For each visible pane prove an actual Plotly DOM with
  SVG/axes/traces and changing axis ranges under LMB drag zoom, Shift+LMB pan
  and double-click autoscale. Repeat after plot-type, screen and layout changes.
  Reject image/raster/background/staticPlot/fixedrange/fallback implementations.
  If anything is broken, repair only architecture/design/**, rerun the complete
  interaction map, increment the package version and refresh evidence. If it is
  intact, do not create a cosmetic revision; return a same-version integrity
  report with exact executable evidence. Screenshots alone are insufficient.
required_states: [initial-live-plot, lmb-zoom, shift-lmb-pan, double-click-autoscale, after-type-change, after-screen-change, after-layout-change]
required_viewports: [1024x768, 1280x720, 1440x900]
acceptance_criteria:
  - Every tested pane is a live local Plotly DOM instance, never an image/static fallback.
  - Axis ranges prove zoom, pan and autoscale before and after navigation/type/layout changes.
  - Full prototype interaction map passes at all required viewports.
  - Any repair is confined to architecture/design/** and versioned; otherwise version 2 remains pinned.
requested_skills: [designer/designer-workflow, designer/visual-system, designer/output-and-visualization]
---
