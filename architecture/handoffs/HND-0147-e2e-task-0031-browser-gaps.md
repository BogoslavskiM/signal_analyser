---
id: HND-0147
type: task
from: orchestrator
to: e2e
title: Close TASK-0031 browser-only regression gaps
task_section: ../tasks/TASK-0031-test-ui-cleanup-and-multilayout.md#verification-and-results
description: |
  On exact production revision 8c0d37e525268b2acf4781a4cb61e823a50639f8,
  verify the Tester-reported browser-only gaps: native focus containment and
  restoration, pointer pane selection, real Plotly sizing lifecycle with sixteen
  simultaneous hosts, and fixed layout/add actions while Display tabs scroll.
  Reuse the HND-0146 restored session baseline; restore state after any mutation.
acceptance_criteria:
  - Report each of the four browser gaps with exact pass/fail evidence.
  - Report console/network errors and final restoration evidence.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
required_viewports: [1440x900, 1280x720, 1024x768]
---
