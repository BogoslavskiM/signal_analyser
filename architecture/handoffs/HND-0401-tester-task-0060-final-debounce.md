---
id: HND-0401
type: task
from: orchestrator
to: tester
title: Add deterministic TASK-0060 debounce and regression coverage
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Add deterministic fake-timer/static coverage for the final TASK-0060
  contract. Assert 150 ms trailing settings coalescing, 350 ms noncritical
  UI-state coalescing where that path exists, immediate blur/Enter and semantic
  actions, no duplicate mutation, and cancellation/flush across authoritative
  screen/pane/revision changes. Keep product code read-only. Re-run the complete
  frontend corpus and report exact counts. Do not touch dependency files.
allowed_paths:
  - test/front/**
acceptance_criteria:
  - Tests fail against the missing contract and pass with the frontend patch.
  - Boundary timing and repeated-input coalescing are deterministic.
  - Immediate actions and exactly-one mutation behavior remain covered.
  - Stale timer/context publication is rejected.
  - Complete frontend corpus passes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
