---
id: HND-0393
type: task
from: orchestrator
to: tester
title: Test final design polish and signal search
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Extend frontend regressions for HND-0390. Assert stable Display-settings
  alignment/scroll contracts; compact upper-right pointer-inert HTML legend,
  cloned Plotly layout with internal legend disabled and non-overlap positioning;
  screen-close blue hover/focus, centered 32x32 + and canonical layout action;
  contained 16x16 table checkbox, last-cell pre-action ellipsis and 60x24 inline
  action reveal/colors. Test visible Russian signal search, case-insensitive local
  filtering, Escape clearing, preserved selection, filtered header-toggle scope,
  empty state and absence of API/backend mutation. Retain HND-0387 minimum/page
  assertions. Do not edit product code.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - Every final user correction has durable static or behavior coverage.
  - Search tests prove local-only filtering and preserved selection.
  - Plotly/no-modebar and overlay regressions remain green.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
