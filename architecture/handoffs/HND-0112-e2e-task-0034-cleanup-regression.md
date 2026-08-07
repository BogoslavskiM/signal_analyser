---
id: HND-0112
type: task
from: orchestrator
to: e2e
title: Quick regression physical obsolete workspace cleanup
task_section: ../tasks/TASK-0034-remove-obsolete-workspace-dom.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0034
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 4861fb9eb2bf1160524b8577278ad1ca0abe2723
  planned_scope: Verify availability and runtime DOM/source absence of all six
  obsolete selectors while retained session import/export, help, add signal,
  Display, Settings and Signals table remain available. No geometry redesign.
acceptance_criteria:
  - Planned/pass/fail/not-run and exact target/revision are explicit.
  - Six selectors are absent and retained smoke controls remain observable.
  - No product, dependency, Git, deployment or runtime state changes occur.
requested_skills: []
---
