---
id: HND-0110
type: task
from: orchestrator
to: e2e
title: Quick regression authoritative Display reorder contract
task_section: ../tasks/TASK-0032-display-tab-order-contract.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0032
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: bbe0c53e28520feb1799c5dc1bc71db7e865fee3
  planned_scope: Verify availability and exercise POST /api/displays reorder on
  a safely created/restored Display set: exact permutation 200, active ID
  preservation, no-op revision, malformed/duplicate/missing/unknown 422,
  stale 409 rollback and final restoration. Do not depend on unimplemented
  frontend persistent reorder UI.
acceptance_criteria:
  - Exact target/revision and availability are explicit.
  - Planned/pass/fail/not-run and 75 percent metric are explicit.
  - 200/422/409/no-op/active/session-safe restoration evidence is reported.
  - No persistent user state, product, dependency, Git or deployment changes remain.
requested_skills: []
---
