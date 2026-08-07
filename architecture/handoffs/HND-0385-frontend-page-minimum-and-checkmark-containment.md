---
id: HND-0385
type: task
from: orchestrator
to: frontend
title: Preserve page minimums without clipping and contain selected checkmark
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Apply the user's final visual corrections against design v2. The application
  must fill the complete available page/container at larger sizes. Readable
  min-width/min-height are explicitly allowed and desirable; when the viewport
  is below the minimum, page or intended inner scrolling must keep every zone
  reachable instead of shell overflow:hidden clipping the workspace, Settings
  or lower inspector. Do not introduce a fixed/max checkpoint canvas.

  The selected-state checkmark currently appears green and escapes its option
  or control boundary. Identify the exact production selector(s), keep the mark
  inside the canonical reserved 16x16 slot within the unchanged row geometry,
  clip/contain it as needed and use the design accent color rather than green.
  Cover dropdown selected options and native/custom checkbox states implicated
  by shared selectors without changing unrelated success-state colors. Preserve
  all popup, Plotly and direct Signals + fixes already committed.
allowed_paths:
  - public/**
acceptance_criteria:
  - App fills larger page/container and has explicit readable minimum dimensions.
  - Below minimum, every zone remains reachable through intentional scrolling; none is clipped by the shell.
  - Selected checkmark remains fully inside its 16x16 slot and uses interface accent color.
  - Dropdown/checkbox row heights and alignment do not shift.
  - Existing live Plotly, no-modebar and overlay behavior remain intact.
  - Frontend syntax and complete frontend corpus pass.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/settings-controls]
---
