---
id: HND-0006
type: report
from: tester
to: orchestrator
title: TASK-0018 Inspector row-action regression exposes pending-state defect
task_section: ../tasks/TASK-0018-test-inspector-frontend-regression.md#verification-and-results
description: >
  Static contract passes. Behavior and whole front regression fail because row
  duplicate actions do not rerender to disabled and aria-busy=true while the
  request is pending. Focused failure: app.behavior.test.js:589. Required
  frontend remedy: rerender row actions on signalsActionBusy transitions, then
  rerun the same tests.
---
