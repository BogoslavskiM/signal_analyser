---
id: HND-0285
type: task
from: orchestrator
to: tester
title: Complete deterministic overlay stacking and focus contract
task_section: ../tasks/TASK-0062-test-overlay-stacking-contract.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
description: |
  Own test/front/** only. Extend the now-green full corpus with deterministic
  behavior coverage for the complete pinned layer matrix and coexistence
  rules: menu to graph-help to tooltip; legend beneath help; stale pane/help
  beneath screen delete; dropdown/tooltip beneath main dialog; passive toast
  beneath active dialog; main dialog beneath nested confirmation; inspector
  menu/tooltip. Prove newest-first Escape/outside dismissal, single active
  focus trap, focus restoration and inert/scroll ownership. Prove graph-help
  open/close does not change graph bounding geometry or trigger Plotly resize,
  and screen-delete cancel/confirm preserves the required state. Do not weaken
  the 1732-assertion corpus. If current DOM cannot satisfy a contract, report
  the exact Frontend defect rather than mocking it away. Do not change public,
  backend, architecture or dependency files and do not start a local app.
acceptance_criteria:
  - All TASK-0062 layer, focus, dismissal, clipping and geometry rules have deterministic coverage.
  - Existing 1732 assertions remain active and green.
  - Full frontend suite passes or exact product defects are reported.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
