---
id: HND-0379
type: report
from: tester
to: orchestrator
title: Popup lifecycle, modebar and responsive shell regressions pass
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
description: |
  Regression coverage proves direct Signals + dialog activation, 502
  retry/focus/Escape restoration, nested confirmation priority, generated
  modebar removal after both Plotly render paths and viewport-filling shell
  behavior. Readable minimum dimensions remain allowed; fixed and maximum
  page/application pixel canvas locks are rejected.
acceptance_criteria:
  - Complete frontend corpus passes 9/9.
  - V8 function coverage is 426/627 (67.94%).
  - Git diff check passes for test/front.
---
