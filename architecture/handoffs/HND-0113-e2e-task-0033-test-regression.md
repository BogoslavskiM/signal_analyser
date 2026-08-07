---
id: HND-0113
type: task
from: orchestrator
to: e2e
title: Quick regression UI cleanup test update
task_section: ../tasks/TASK-0033-test-ui-cleanup.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0033
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 4861fb9eb2bf1160524b8577278ad1ca0abe2723
  planned_scope: Mandatory availability and a minimal Display A-to-B/plot-title
  smoke confirming the updated authoritative tab/title assertion reflects the
  browser. This task is test-only; do not rewrite Playwright solely for parity.
acceptance_criteria:
  - Exact target/revision and metric are explicit.
  - Active tab and plot title remain consistent through a Display switch.
  - No product/runtime state remains changed.
requested_skills: []
---
