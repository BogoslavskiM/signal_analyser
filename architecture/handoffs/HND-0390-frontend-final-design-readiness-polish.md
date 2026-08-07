---
id: HND-0390
type: task
from: orchestrator
to: frontend
title: Complete final production design-readiness polish
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
description: |
  This is the user's final blocking visual list. Integrate HND-0385 and HND-0389
  into one coherent production correction, using the pinned design package and
  exact canonical references rather than adding ad-hoc overrides.

  1. Restore stable Display-settings composition: heading, three tabs, section
     titles, labels and controls must remain aligned in the 370/340/300px panel,
     with intended internal vertical scrolling and no wrapped/drifting rows.
  2. Place the compact small legend in the plot's upper-right sector. It must
     not overlap the pane type/ellipsis cluster, graph-help or plot content
     controls and must remain pointer-inert.
  3. Give each screen close cross the design-defined blue hover/focus-visible
     background without changing tab geometry. Center the icon-only + exactly
     inside its 32x32 target beside the layout action.
  4. Make the layout-change action match the pinned multi-page/layout reference
     in label/icon, dimensions, border, radius, spacing and hover/focus/active
     states; keep + immediately to its left.
  5. Correct signal-table interactions: selected/all-visible header checkbox is
     the canonical contained 16x16 accent control; row duplicate/delete actions
     remain inside the last content cell, hidden at rest and revealed on
     hover/focus with canonical ordinary/danger colors. No separate action
     column or stray dot. Constrain .signal-cell-copy and ellipsize before the
     reserved 60x24 action area at all target viewports.
  6. Restore the signal search control in the Signals inspector using the
     pinned inspector reference. Search filters visible table rows client-side,
     retains Russian accessible label/placeholder, preserves selection and does
     not mutate backend signal state. It must fit the inspector without changing
     the 32px table rows or clipping horizontal scroll.
  7. Preserve readable 920x680 minimums, full larger-page fill and reachable
     zones below minimum through intentional scrolling. Preserve live Plotly,
     no-modebar, direct Signals + dialog and all overlay behavior.
allowed_paths:
  - public/**
acceptance_criteria:
  - Display settings alignment passes at 1024x768, 1280x720 and 1440x900.
  - Small upper-right legend never intersects pane controls or graph help.
  - Screen close, centered + and layout action match pinned interaction states.
  - Header checkbox and inline table actions match canonical geometry/colors.
  - Last-cell copy never exceeds its cell and ellipsizes before actions.
  - Signal search is visible, Russian, keyboard-operable and filters rows locally.
  - Full-page/minimum/scroll behavior and existing Plotly/overlay contracts remain intact.
  - Frontend syntax and complete frontend corpus pass.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/settings-controls, frontend/multi-page-element, frontend/inspector-ui, frontend/graph-output-zone]
---
