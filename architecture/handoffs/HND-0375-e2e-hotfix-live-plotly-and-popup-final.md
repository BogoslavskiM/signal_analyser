---
id: HND-0375
type: task
from: orchestrator
to: e2e
title: Verify hotfix live Plotly, complete design v2 and popup stack
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
production_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: 545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c
description: |
  e2e_mode: new_functionality_regression
  Use the visible Chrome CDP session at 127.0.0.1:9222. First verify exact
  runtime SHA and reload production while collecting pageerror/console/network.
  Prove no JavaScript exception, pane hosts exist, active output reaches ready,
  the local Plotly asset loads and graph hosts expose _fullLayout/_fullData with
  staticPlot=false and fixedrange=false. Exercise real LMB zoom, Shift+LMB pan
  and double-click autoscale. Compare all five zones against design v2 at
  1024x768, 1280x720 and 1440x900, including unique settings ownership and full
  Russian visible labels. Exercise every popup/overlay category and overlapping
  combinations: hit owner, focus/trap, Escape/click-outside, focus restoration,
  lower-layer inertness and unchanged plot rectangles. Persist screenshots and
  machine-readable evidence. Do not edit product code.
acceptance_criteria:
  - Exact SHA and zero page errors.
  - Live local interactive Plotly and three gestures pass.
  - Five-zone visual design v2 passes at three viewports.
  - Settings ownership and Russian presentation pass.
  - Complete popup/overlay and no-plot-shift matrix passes.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
