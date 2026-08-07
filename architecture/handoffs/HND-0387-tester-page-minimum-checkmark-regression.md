---
id: HND-0387
type: task
from: orchestrator
to: tester
title: Test readable minimums, zone reachability and checkmark containment
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Add focused static/behavior coverage for HND-0386. Require the app shell to
  fill its container and retain explicit readable 920x680 minimums. Below the
  minimum, document overflow must remain scrollable so every zone is reachable;
  reject body/html/shell clipping that hides zones and reject fixed/max canvas
  locks. Require every settings enum option to reserve a 16x16 check slot, the
  selected option's mark to be contained and use var(--accent), and application
  native checkboxes to use the same accent. Preserve exact 34px option rows and
  existing full corpus contracts. Do not edit product code.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - Responsive/minimum/scroll contract has durable regression assertions.
  - Selected dropdown and native checkbox accent/containment are asserted.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
