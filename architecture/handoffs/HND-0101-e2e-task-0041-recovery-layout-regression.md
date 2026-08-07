---
id: HND-0101
type: task
from: orchestrator
to: e2e
title: Quick regression restored runtime and authoritative layout API
task_section: ../tasks/TASK-0041-restore-production-after-maintenance.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0041
  target_status: available
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  planned_scope: Re-run the HND-0096 checks after DevOps recovery: mandatory
  availability/product DOM, GET authoritative layout snapshot, safe no-op or
  fully restored mutation, malformed HTTP 422, stale HTTP 409 with no partial
  mutation, and final state equality. Do not require unimplemented TASK-0030 UI.
acceptance_criteria:
  - Exact target/revision, availability and planned/pass/fail/not-run metric are explicit.
  - Layout 200/422/409 evidence and final restoration are explicit.
  - No product, dependency, Git, deployment or persistent runtime state changes occur.
requested_skills: []
---
