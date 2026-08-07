---
id: HND-0351
type: task
from: orchestrator
to: e2e
title: Verify production performance architecture and live Plotly interaction
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
e2e_mode: analysis_regression
target_status: ready
target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: c7e0f9a4bbe145be14a197c25d0c8700c0f205ee
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
prototype_entry: ../design/TASK-0057-ui-overlay-refinement/prototype/index.html
prototype_interaction_map: ../design/TASK-0057-ui-overlay-refinement/evidence/interaction-walkthrough.json
required_viewports: [1024x768, 1280x720, 1440x900]
required_states: [initial-live-plot, lmb-zoom, shift-lmb-pan, double-click-autoscale, after-type-change, after-screen-change, after-layout-change]
description: |
  e2e_mode: analysis_regression. First open the pinned local prototype through
  file:// and execute its Plotly interaction path, then repeat on the exact
  production SHA in one visible foreground Google Chrome worker. Prove each
  ready pane is a live Plotly DOM instance with _fullLayout/_fullData, SVG axes
  and traces; staticPlot/fixedrange/image/raster/background fallbacks are
  forbidden. Measure actual axis-range changes for LMB selection zoom,
  Shift+LMB pan and double-click autoscale initially and after plot-type,
  screen and 2x2 layout changes. Verify the hidden modebar and compact legend
  do not remove interaction or overlap controls.

  Verify state-lite contains no graph arrays, pending is lightweight, only the
  active pane requests/calculates active output, stale revisions cannot replace
  the current graph, and inactive panes do not generate output traffic. Repeat
  plot-type and confirmed display-delete workflows: each semantic action must
  issue exactly one product POST, remain busy until authoritative response and
  settle without console errors. Complete the planned interaction-performance
  sample matrix with P50/P95 API, payload, browser/Plotly and long-task evidence;
  no 60-second stalls or maintenance screen are acceptable. Restore canonical
  production state to one display with one active pane when finished. Modify
  only test/playwright/** if a test-owned repair is necessary; never deploy,
  start a local app, use localhost/devhub/fallback or touch dependencies.
acceptance_criteria:
  - Exact runtime SHA and visible foreground one-worker execution are attested.
  - Live Plotly zoom/pan/autoscale pass before and after type/screen/layout changes.
  - No static/raster fallback, fixed axes, modebar or interaction-obscuring overlap exists.
  - State-lite/active-output/revision and exactly-one mutation dispatch contracts pass.
  - Performance matrix reports P50/P95 without hangs and canonical state is restored.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
