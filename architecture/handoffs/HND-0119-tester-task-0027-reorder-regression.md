---
id: HND-0119
type: task
from: orchestrator
to: tester
title: Test persistent Display reorder frontend lifecycle
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
description: |
  Add durable test/front coverage for HND-0118: mouse drop and Alt+Arrow exact
  full permutation request; pending aria/data guard; no optimistic reorder;
  200 full snapshot/active ID; 409 current without replay; 422 and network
  rollback/error; focus restoration; serialized intent queue. Retain design-v1
  static geometry contracts for 1024/1280/1440 and all existing cleanup tests.
acceptance_criteria:
  - Focused behavior/static and full frontend suite pass.
  - Exact payload and 200/409/422/network states are asserted.
  - Test report lists browser-only geometry/drag gaps for E2E.
requested_skills:
  - tester/frontend-static-behavior-testing
---
