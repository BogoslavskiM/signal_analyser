---
id: HND-0428
type: task
from: orchestrator
to: frontend
title: Remove legacy responsive settings reflow conflicting with design v1
task_section: ../tasks/TASK-0082-frontend-explicit-apply-state-machine.md#result
source_branch: neuro_signal_analyser_ui_refinement
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
description: |
  HND-0427 confirmed that the selector-specific @media(max-width:1080px) rule
  for #display-settings-panel>#settings-view changes the accepted 140px grid
  geometry. Design v1 instead requires invariant zones and controls with
  document scroll below the 920x680 application minimum. Fix public CSS only;
  retain 140px label/control grid and accepted desktop layout across viewports.
  Do not alter the test to hide this conflict. Run the complete frontend suite.
allowed_paths: [public/css/layouts.css, public/css/settings.css]
acceptance_criteria:
  - No legacy selector-specific settings reflow violates the design-v1 sizing contract.
  - Settings row geometry preserves its authoritative 140px label track.
  - node test/front/run_front_tests.js passes all files.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/frontend-project-structure]
evidence_refs: [HND-0422, HND-0427]
---
