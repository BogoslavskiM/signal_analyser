---
id: HND-0253
type: task
from: orchestrator
to: devops
title: Получить production logs для HTTP 500 maintenance state
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: get_logs
source_branch: neuro_signal_analyser_ui_refinement
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
log_scope: tail
line_limit: 500
patterns: [ERROR, Exception, Stacktrace, LoadError, readiness, maintenance, 500, 404]
description: |
  User confirms the maintenance page corresponds to HTTP 500 and correctly
  means the application is not working. HND-0252 independently observed Server
  maintenance after the nominal successful restart. Collect bounded sanitized
  production application logs, verify process/status/checkout revision and
  classify the evidence owner. This get_logs request must not restart, deploy,
  stage, commit or push. Do not read/copy/instantiate/modify Project.toml or
  Manifest.toml and do not use environment sync.
acceptance_criteria:
  - Sanitized LOG package captures the maintenance/500 time range or explicitly proves logs missing/unreadable.
  - Exact branch/SHA, process/readiness and app/log paths are reported.
  - Failure owner is classified from evidence; no nominal STARTED response is treated as application health.
  - No product/test/dependency/Git mutation occurs.
requested_skills:
  - devops/engee-deployment-diagnostics
---
