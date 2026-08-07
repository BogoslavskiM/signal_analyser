---
id: HND-0315
type: report
from: tester
to: orchestrator
title: Pane-owned mutation dispatch regression passes
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
description: |
  Tester added a deterministic app.behavior scenario with the retired
  display-plot-title genuinely absent. Plot-type emits exactly one POST
  ./api/view, remains busy until the authoritative response and then settles.
  Confirmed screen deletion emits exactly one POST ./api/displays, closes the
  confirmation and settles on the authoritative response. No duplicate request
  or throw occurs. Orchestrator independently reran all seven frontend files
  successfully and diff checks pass. Existing localization, overlay and live
  Plotly assertions remain enabled.
acceptance_criteria:
  - Focused pane-owned topology behavior: passed.
  - Full frontend corpus: passed, 7/7.
  - V8 function coverage: 495/654, 75.69%.
  - Production regression: pending exact deployed revision.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
