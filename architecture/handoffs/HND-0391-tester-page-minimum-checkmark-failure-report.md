---
id: HND-0391
type: report
from: tester
to: orchestrator
title: Responsive media override fails page-fill regression
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
skipped_requested_skills: []
description: |
  Added page_minimum_checkmark.static.test.js for explicit 920x680 minimums,
  document scrolling, 34px enum rows, contained 16x16 accent check slots and
  native checkbox accent. The focused test exposed a later max-width:1080px
  .signal-analyser height:calc(100vh - 12px) override that violates containing-
  block fill. Before correction the corpus stopped at 6/10; diff check passed.
  Finding routed into HND-0390 for Frontend correction and full rerun.
---
