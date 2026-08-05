---
id: HND-0087
type: task
from: orchestrator
to: e2e
title: Quick regression после TASK-0037 constructor bootstrap fix
task_section: ../tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0037
  target_status: available_with_known_deferred_finding
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/
  runtime_revision: 3c06387ea5f4c6617b67a8081922fe52be22f381
  planned_scope: Launch an independent browser, verify application availability,
  root/status routing and observable initial bootstrap behavior. Report the
  known `/api/state` EngeeDSP failure as deferred TASK-0038 evidence; do not
  change Project.toml/Manifest.toml, deploy, use devhub/fallback or reinterpret
  it as a constructor regression unless route registration itself fails.
acceptance_criteria:
  - Report contains exact target/revision, availability and planned/passed/failed/not-run counts.
  - Success rate uses passed/planned with mandatory availability and 75 percent threshold.
  - Product findings become follow-up candidates and do not reopen terminal TASK-0037.
requested_skills: []
---
