---
id: HND-0188
type: task
from: orchestrator
to: e2e
title: Validate expanded Inspector row in production
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#verification-and-results
description: |
  Run the one mandatory post-task E2E on exact production SHA
  3871bca726d78f5d4011745cd5b8ecd80c2214e2. At 1440x900, 1280x720 and
  1024x768 measure collapsed→expanded→collapsed row height, verify all four
  metadata values are visually inside the row, native click/keyboard focus and
  aria/accessible label behavior, 28px Duplicate/Delete/Info actions, sticky
  action column and horizontal/vertical table scrolling. Prove no API/session
  mutation and exact final session/layout hashes. No repo/Git/dependency mutation.
acceptance_criteria:
  - Geometry, visual metadata, interaction, scroll and restoration totals are separate.
  - All three viewports pass without document overflow or clipped details.
  - Browser closes and no unexpected console/page errors occur.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
required_viewports: [1440x900, 1280x720, 1024x768]
---
