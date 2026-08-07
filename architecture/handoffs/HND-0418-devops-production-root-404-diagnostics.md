---
id: HND-0418
type: task
from: orchestrator
to: devops
title: Diagnose production SignalAnalyser HTTP 404
task_section: ../tasks/TASK-0084-diagnose-production-root-404.md#scope
devops_request: get_logs
source_branch: neuro_signal_analyser_ui_refinement
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
remote_project_dir: /user/apps/signal_analyser
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
healthcheck_url: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
log_scope: tail
line_limit: 500
patterns: [ERROR, Exception, Stacktrace, LoadError, readiness, 404]
description: |
  HND-0417 visible foreground Chrome received HTTP 404 for the main document.
  Run get_logs diagnostics only: enforce production pod status/start gate,
  task lock and mandatory remote-only exact-checkout cleanliness preflight,
  then correlate checkout SHA, application log and target HTTP response. Do not
  start/restart the application or perform feature Git/deploy stages. Classify
  the owner from evidence; 404/availability alone is not an Engee defect.
acceptance_criteria:
  - Exact production checkout/pod/log/HTTP evidence is sanitized and persisted.
  - Lock acquisition/release and remote worktree cleanup states are reported.
  - Failure owner and next recovery criterion are explicit.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
