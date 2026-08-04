---
id: HND-0072
type: task
from: orchestrator
to: devops
title: Continue bounded production readiness for TASK-0037 exact revision
task_section: ../tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - architecture/tasks/TASK-0036-apply-frontend-design-patterns.md
  - architecture/tasks/TASK-0037-fix-multilayout-bootstrap-constructor.md
  - architecture/handoffs/HND-0071-devops-task-0037-published-startup-pending-report.md
  - architecture/handoffs/HND-0072-devops-continue-task-0037-readiness.md
description: |
  continuation_of: HND-0070
  Current production checkout is exact SHA
  7d1329e2f930ee8348439afd4a0c406fde88e2ef and replacement PID 2073 was alive
  at report time but had not opened HTTP yet. Commit/push only the listed
  Orchestrator records, update production to the resulting exact SHA, then
  continue bounded readiness of the existing PID before considering any
  replacement. Inspect process state, listener and startup diagnostics. If the
  process has exited, perform one controlled restart with the established
  production host/port. Verify /, /api/status and /api/state. Do not merge or
  use fallback.
acceptance_criteria:
  - Local, remote and production checkout exact SHA are reported.
  - Existing process is not replaced while alive merely because compilation is slow.
  - Required routes return non-404 HTTP responses or a precise terminal blocker is returned.
requested_skills: []
---
