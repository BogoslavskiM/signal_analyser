---
id: HND-0203
type: task
from: orchestrator
to: tester
title: Add immutable runtime revision backend regression
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Add deterministic backend tests for the HND-0200/HND-0201 contract in test/**
  only. Cover valid exact preservation; missing, empty, padded, uppercase,
  non-hex, 39-char and 41-char rejection; one-time process immutability; exact
  /api/status field; unchanged existing fields; and Cache-Control no-store route
  wiring. Register the suite if a new test file is warranted. Do not edit product,
  frontend, architecture or dependency files. Use explicit fixture environment
  values and restore test-process environment exactly.
acceptance_criteria:
  - Positive and all strict rejection classes are deterministic.
  - Environment mutation after initialization cannot change the exported value.
  - Existing backend suites remain green.
  - Test environment is restored even on failure.
requested_skills: [tester/tester-workflow, tester/backend-api-testing]
design_ref: null
design_version: null
---
