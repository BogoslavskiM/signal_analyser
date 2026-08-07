---
id: HND-0367
type: task
from: orchestrator
to: e2e
title: Final production design-v2, overlay-stack and live-Plotly acceptance
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
production_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: eb4f81eb695ddafef032646aff6245f4f380c4f8
description: |
  Use the already-running visible Chrome CDP session on 127.0.0.1:9222 and
  perform foreground production acceptance against pinned design v2. Verify the
  exact runtime SHA first. Compare all five zones at 1024x768, 1280x720 and
  1440x900 against the prototype, recording screenshots and measured geometry.
  Exercise every popup layer: settings enum dropdowns, tooltips, graph-help,
  pane/inspector menus, layout popover, main + dialog, import/save, toast,
  screen-delete and nested confirmations. For overlapping combinations prove
  newest-layer hit ownership with elementFromPoint, keyboard focus/trap,
  Escape/click-outside dismissal, focus restoration and lower-layer inertness.
  Measure plot rectangles before/after overlays and prove no movement/resize.
  Confirm every visible graph is live local Plotly (_fullLayout/_fullData,
  staticPlot=false, fixedrange=false, no image/raster fallback), then perform
  real LMB area zoom, Shift+LMB pan and double-click autoscale. Do not accept a
  screenshot/static graph. Report exact deviations as blockers; do not edit
  product code.
acceptance_criteria:
  - Exact runtime SHA, root and status are healthy.
  - Five-zone geometry and visual states match design v2 at all three viewports.
  - Complete popup/overlay interaction and stacking matrix passes.
  - Overlay lifecycle never shifts/resizes plots.
  - Live interactive Plotly and real zoom/pan/autoscale pass.
  - Evidence screenshots and machine-readable measurements are persisted.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
