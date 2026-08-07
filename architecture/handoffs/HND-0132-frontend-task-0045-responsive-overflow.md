---
id: HND-0132
type: task
from: orchestrator
to: frontend
title: Correct required-viewport document overflow in current write lane
task_section: ../tasks/TASK-0045-fix-responsive-viewport-overflow.md#scope
description: |
  Incorporate this bounded correction into the active HND-0129 product patch.
  HND-0130 measured scrollHeight 768 at 1280x720 because base min-height is
  768, and scrollWidth 1180 at 1024x768 because .signal-analyser min-width 1180
  is cleared only below 980. Remove these document-level constraints at the
  required breakpoints while preserving internal grid/settings/table/tab scroll
  ownership and 1440 geometry. Report it separately in the combined Frontend
  result. Do not touch tests, backend, architecture, dependency or Git state.
acceptance_criteria:
  - 1280x720 has no document vertical overflow from base min-height.
  - 1024x768 has no document horizontal overflow or clipped retained controls.
  - 1440 geometry and component-owned scrolling remain intact.
  - Syntax/diff/full frontend suite pass.
requested_skills: [frontend/design-implementation]
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---
