---
id: HND-0310
type: report
from: e2e
to: orchestrator
title: Production profile localized dispatch stall and proved live Plotly interaction
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  On exact production SHA 555b6815de9a5d78fd31224f86d47638e18a6bc6,
  one foreground Chrome worker completed 5/5 settings samples and attempted
  three plot-type samples before the product flow and later reload timed out.
  Settings P50/P95 were 471/513 ms, API wait 247/263 ms, settle 214/288 ms,
  Plotly.react 12.7/19.5 ms, with zero long tasks. Responses were 298,364 B.
  Plot-type and delete-display actions entered busy UI but emitted no product
  mutation request; repeated page errors reported a null textContent target.
  This is Frontend dispatch/render failure, not Backend or Plotly execution.

  HND-0307 separately proved the active graph is live Plotly: _fullLayout and
  _fullData exist, two 512-point scatter traces render, staticPlot/fixedrange
  are false, no img/raster/background fallback exists and modebar is hidden.
  LMB zoom, Shift+LMB pan and double-click autoscale produced real
  plotly_relayout axis changes. The same live-graph contract and zoom/autoscale
  held after creating and switching to a second screen. Post-type-switch proof
  remains blocked by the dispatch defect. Production cleanup through the same
  UI also failed, leaving display-2 active at revision 21.
acceptance_criteria:
  - Production live Plotly, non-static contract: passed.
  - Zoom, pan and autoscale axis transitions on initial screen: passed.
  - Interaction after second-screen switch: partial; live/zoom/autoscale pass,
    Shift-pan semantic translation requires rerun.
  - Interaction after plot-type switch: failed before request dispatch.
  - HND-0302 matrix: 5 passed, 3 failed, 17 not run.
  - Canonical production state restoration: failed through visible flow.
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
