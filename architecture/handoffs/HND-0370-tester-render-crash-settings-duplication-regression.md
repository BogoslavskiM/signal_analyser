---
id: HND-0370
type: task
from: orchestrator
to: tester
title: Add regressions for design-v2 DOM render and unique localized settings
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Add strict frontend regressions using the current production index DOM shape.
  Prove layouts rendering does not throw when optional legacy nodes such as
  layout-trigger-label are absent, creates the active pane host, polls active
  output and reaches lazy Plotly rendering on a ready response. Prove the
  settings surface has exactly one plot type and one legend control, no visible
  legacy duplicate, and all visible catalog group/section/field/enum labels are
  Russian except canonical technical units/acronyms. Preserve existing overlay
  and no-plot-shift tests. Run the complete frontend corpus.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - Current design-v2 DOM bootstrap cannot reproduce the syncContext null crash.
  - Pane host, active-output polling and lazy Plotly path are asserted.
  - Unique settings ownership and complete Russian presentation are asserted.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
