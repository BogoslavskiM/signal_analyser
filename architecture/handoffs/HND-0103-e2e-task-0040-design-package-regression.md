---
id: HND-0103
type: task
from: orchestrator
to: e2e
title: Visual quick regression ready detailed-layout package
task_section: ../tasks/TASK-0040-generate-detailed-current-layout-design.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0040
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  planned_scope: Confirm production availability and capture current product
  baseline, then verify the local design package/prototype opens without page
  errors or document overflow and that required state/viewport evidence exists.
  The package is not yet implemented in production: do not classify expected
  production-vs-v1 differences as implementation defects; report only package
  ambiguity/incompleteness or baseline runtime failures.
acceptance_criteria:
  - Production availability and exact revision context are reported.
  - Local prototype and required 10-state/3-viewport evidence integrity are checked.
  - Planned/pass/fail/not-run metric, screenshots and findings are explicit.
  - No product, design, dependency, Git, deployment or runtime state changes occur.
requested_skills: [e2e/visual-analysis]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0040-detailed-current-layout/screenshots/
---
