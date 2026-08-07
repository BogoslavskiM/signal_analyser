---
id: HND-0396
type: task
from: orchestrator
to: e2e
title: Final production smoke for accepted design-readiness list
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
production_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
expected_revision: 76cb9c6a360ed6d852203f9be0ed7a1a4003e156
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
ui_profile: analytical-dense
required_viewports: [1024x768, 1440x900]
description: |
  e2e_mode: new_functionality_regression
  Timeboxed final smoke only; do not broaden scope. In one visible foreground
  Chrome worker verify exact SHA/availability and zero page errors, then at
  1024x768 and 1440x900 check: full-page shell with all zones reachable;
  Display-settings alignment; small upper-right legend with no control/help
  overlap; screen-close blue hover/focus; centered + and canonical layout action;
  contained table header checkbox; inline row actions inside the final cell with
  ellipsis and correct ordinary/danger states; Russian signal search filters by
  case-insensitive name, Escape clears, selection remains and no mutation request
  is emitted. Confirm live Plotly still has _fullLayout/_fullData and no modebar
  nodes. Persist one machine-readable report and minimal screenshots. Return
  immediately; do not edit product code or close shared Chrome.
acceptance_criteria:
  - Exact SHA/readiness and zero page errors pass.
  - Every final user-listed visual correction passes at both viewports.
  - Search local-only behavior passes.
  - Live Plotly remains interactive and modebar-free.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
