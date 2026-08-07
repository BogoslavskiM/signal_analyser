---
id: HND-0148
type: task
from: orchestrator
to: e2e
title: Verify responsive overflow correction in production
task_section: ../tasks/TASK-0045-fix-responsive-viewport-overflow.md#verification-and-results
description: |
  Run the one post-task responsive regression on exact production revision
  8c0d37e525268b2acf4781a4cb61e823a50639f8. Measure document/stage dimensions
  at 1440x900, 1280x720 and 1024x768; verify no document overflow and that
  toolbar, Settings, table/action column, Display tabs, layout and add controls
  remain reachable. Include representative 4x4 stress at 1024 and restore state.
acceptance_criteria:
  - Exact width/height/scroll measurements are reported for all viewports.
  - Internal scroll owners remain functional with no clipping of required actions.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
required_viewports: [1440x900, 1280x720, 1024x768]
---
