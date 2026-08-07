---
id: HND-0126
type: task
from: orchestrator
to: e2e
title: Post-task browser regression detailed-layout and persistent Display reorder
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
description: |
  e2e_mode: new_functionality
  trigger_task: TASK-0027
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: a6add263120f41aa1ae66497f3effac6bb493cff
  planned_scope: In a real browser verify availability and exact loaded assets;
  safely create enough Displays to exercise real pointer drag/drop and
  Alt+Arrow reorder, authoritative pending/confirmed order, active ID and focus,
  plus safe conflict/error behavior where deterministic injection is possible.
  Visually inspect design-v1 geometry at all required viewports: no document or
  main-stage clipping, settings label/control integrity, horizontal Display-tab
  overflow, table scrolling with fixed action column, menu/info placement and
  retained controls. Restore the exact initial session state and close browser.
acceptance_criteria:
  - Exact target/revision, availability and planned/pass/fail/not-run metric are explicit.
  - Real pointer and keyboard reorder evidence includes authoritative order, active ID and focus.
  - All required viewports have screenshots and explicit overflow/clipping findings.
  - Final session document equals baseline and no persistent mutation remains.
  - No repository, dependency, Git or deployment changes occur.
requested_skills: [e2e/visual-analysis]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0040-detailed-current-layout/screenshots/
---
