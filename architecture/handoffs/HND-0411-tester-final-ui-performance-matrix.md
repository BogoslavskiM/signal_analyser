---
id: HND-0411
type: task
from: orchestrator
to: tester
title: Complete TASK-0061 deterministic UI and performance matrix
task_section: ../tasks/TASK-0061-test-ui-performance-refinements.md#acceptance-criteria
description: |
  Audit every TASK-0061 criterion against the current exact product revision
  `bba7f2528abccf14dcdd313681c8fd8bf538d40c`. Reuse existing durable tests;
  add only genuinely missing deterministic positive/negative assertions in
  `test/front/**` or `test/back/**`. Include all three settings pages, Russian
  copy, legend/controls/table/search, overlay/help geometry, one-screen/delete,
  10×10/warning/arrows, live Plotly contracts, active-only/revisions/cache and
  exact debounce. Run the complete dependency-independent frontend and backend
  suites without local application runtime. Do not weaken tests to match
  implementation and do not read or touch dependency files. Return a
  criterion-by-criterion pass/fail matrix, exact changed paths, counts and any
  product defect requiring an owning-role follow-up.
allowed_paths:
  - test/front/**
  - test/back/**
acceptance_criteria:
  - Every TASK-0061 criterion has direct current evidence or a precise failing gap.
  - New tests cover only missing contracts and fail for the intended regression.
  - Complete frontend and dependency-independent backend suites pass.
  - No product/dependency/runtime file is changed.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing, tester/backend-unit-testing, tester/backend-api-testing]
---
