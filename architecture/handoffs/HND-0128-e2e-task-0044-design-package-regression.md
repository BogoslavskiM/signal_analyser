---
id: HND-0128
type: task
from: orchestrator
to: e2e
title: Visual quick regression ready multi-layout design package
task_section: ../tasks/TASK-0044-design-multilayout-ui.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0044
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: a6add263120f41aa1ae66497f3effac6bb493cff
  planned_scope: Confirm production availability, then verify the local v1
  prototype opens without page errors, document overflow or popover collision;
  audit all documented layout/state/viewport evidence, active-pane context,
  independent bindings/type interactions, Apply/Cancel/Escape/focus and fresh
  draft after 409. The package is not implemented in production yet, so do not
  classify expected product-vs-design differences as defects.
acceptance_criteria:
  - Exact production target/revision and local design ref/version are reported.
  - Layout, state and viewport evidence integrity plus interactive prototype audit are explicit.
  - Planned/pass/fail/not-run metric, screenshots and findings are explicit.
  - No product, design, dependency, Git, deployment or runtime state changes occur.
requested_skills: [e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 1
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success, conflict]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0044-multilayout-ui/screenshots/
---
