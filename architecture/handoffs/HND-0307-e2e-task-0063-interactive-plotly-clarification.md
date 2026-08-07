---
id: HND-0307
type: scope_update
from: orchestrator
to: e2e
title: Prove graphs remain live interactive Plotly instances
task_section: ../tasks/TASK-0063-e2e-multi-overlay-regression.md#acceptance-criteria
description: |
  The user explicitly rejects image-like or otherwise static graphs. After the
  current HND-0302 profile, use the same single foreground Chrome worker and
  exact production runtime to prove real Plotly interaction. On representative
  active panes, record axis ranges before and after LMB selection zoom,
  Shift+LMB pan and double-click autoscale. Repeat after a plot-type change and
  after switching screens/layouts. Verify there is no staticPlot, fixedrange,
  raster/background-image or screenshot fallback. A visible chart alone is
  insufficient evidence. Do not run another browser worker in parallel and do
  not change workspace files or dependencies.
acceptance_criteria:
  - Axis ranges change after zoom and pan, then autoscale restores ranges.
  - Interaction remains functional after plot-type and screen/layout changes.
  - Every checked pane is a live Plotly graph, not an image/static substitute.
  - Hidden modebar does not disable native graph interaction.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
