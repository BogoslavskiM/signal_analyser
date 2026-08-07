---
id: HND-0352
type: task
from: orchestrator
to: e2e
title: Capture exact production-to-design-v2 visual gaps
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
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
description: |
  e2e_mode: analysis_regression. A visible Chrome/CDP worker is now listening on
  127.0.0.1:9222. The user rejects the current production UI as visibly ancient
  and far from design v2. Prioritize a bounded visual gap audit, not the deferred
  performance matrix: bring Chrome to front, open the exact prototype and exact
  production revision, capture comparable screenshots and report concrete
  mismatches by the five design zones, geometry/tokens/assets and interaction
  state. Confirm whether production panes are live Plotly rather than images,
  but do not spend this pass on 25-sample profiling. Return early actionable
  evidence for Frontend. Modify only test/playwright/** if an evidence script
  repair is necessary; do not deploy or start a local app.
acceptance_criteria:
  - Foreground Chrome and exact production revision are attested.
  - Comparable prototype/production screenshots cover all five zones.
  - Mismatches are concrete, measured and routed to Frontend.
  - Live Plotly versus static placeholder is explicitly classified.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
