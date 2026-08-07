---
id: HND-0130
type: report
from: e2e
to: orchestrator
title: Display reorder passed with responsive overflow findings
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
description: |
  Exact production revision a6add263120f41aa1ae66497f3effac6bb493cff was
  available and loaded exact committed assets. Functional new-feature checks
  passed 9/9: trusted pointer drag, authoritative pending/200 order, Alt+Arrow,
  active ID/focus, deterministic 409/422 and exact session restoration. Visual
  checks passed 16/21 (76.19%, threshold met): 1440 was 7/7, 1280 was 6/7 and
  1024 was 3/7. Findings are document height 768 at 1280x720 and application
  width 1180 at 1024x768, clipping Settings/toolbar/sticky actions. Total 25/30,
  83.33%; no page errors. Browser closed and final session state equals baseline.

  Evidence: /private/tmp/e2e-hnd-0126-20260804-evidence/HND-0126-run.json
---
