---
id: HND-0096
type: task
from: orchestrator
to: e2e
title: Quick regression authoritative multi-layout backend contract
task_section: ../tasks/TASK-0029-multilayout-state-contract.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0029
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  planned_scope: Verify mandatory availability and exact runtime identity, then
  exercise the existing authoritative layout API at least for GET snapshot,
  revision-aware no-op or safe reversible mutation, malformed validation and
  stale revision rollback without leaving changed user state. Include a minimal
  product DOM smoke. Do not require multi-layout UI, which remains TASK-0030.
  The deferred TASK-0038 dependency-file approach is out of scope.
acceptance_criteria:
  - Report includes exact target/revision and mandatory availability result.
  - Planned/passed/failed/not-run and passed/planned success rate are explicit.
  - Layout API evidence distinguishes 200, 422 and 409 behavior and confirms no partial state mutation.
  - No product, backend, dependency, Git, deployment or runtime configuration files are changed.
requested_skills: []
---
