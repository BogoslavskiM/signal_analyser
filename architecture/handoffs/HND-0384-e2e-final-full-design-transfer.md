---
id: HND-0384
type: task
from: orchestrator
to: e2e
title: Verify complete design transfer on final production revision
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
production_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: e0d1253433505943569c2a6b5e07555d5504be0b
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
prototype_entry: ../design/TASK-0057-ui-overlay-refinement/prototype/index.html
prototype_interaction_map: ../design/TASK-0057-ui-overlay-refinement/evidence/interaction-walkthrough.json
proportion_contract: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md#responsive-and-proportion-contract
asset_inventory: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md#visual-sources
visual_references: ../design/TASK-0057-ui-overlay-refinement/screenshots/
required_viewports: [1024x768, 1280x720, 1440x900]
required_states: [default, hover, active, focus-visible, disabled, loading, empty, error, success]
required_overlay_combinations:
  - pane menu -> graph help -> tooltip
  - legend -> graph help
  - pane menu/help -> screen delete
  - dropdown/tooltip -> main workspace dialog
  - toast -> active dialog
  - main workspace dialog -> nested dirty confirmation
  - inspector menu -> tooltip
description: |
  e2e_mode: new_functionality_regression
  Use one foreground visible Google Chrome worker. First open and click the
  pinned local prototype through file://, then repeat the complete interaction
  map in exact production revision e0d1253. Prove the application consumes the
  complete available tab/container at every checkpoint and compare all five
  zones visually and geometrically, not merely by presence. Verify Russian
  labels, three Display-settings pages and their control states, direct Signals
  + main-dialog opening, 502 retry/focus/Escape restoration, nested confirmation
  priority, every overlay combination with elementFromPoint/focus/inert/restore
  evidence and unchanged plot rectangles. Prove live local Plotly by
  _fullLayout/_fullData, SVG and non-static/fixed-range state; exercise real LMB
  zoom, Shift+LMB pan and double-click autoscale. Assert no .modebar or
  .modebar-container exists after render or gestures. Preserve shared visible
  Chrome; do not close the CDP browser and do not edit product code.
acceptance_criteria:
  - Exact production SHA, availability and zero page JavaScript errors.
  - Live Plotly and all three gestures pass without generated modebar DOM.
  - Complete five-zone design-v2 comparison passes at all three viewports.
  - Shell fills available viewport/container; minimum dimensions do not create a fixed canvas.
  - Popup/overlay hit, focus, dismissal, restoration and no-shift matrix passes.
  - Direct Signals + and workspace 502 failure lifecycle pass.
  - New-functionality scope and quick regression are reported separately.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
