---
id: HND-0274
type: task
from: orchestrator
to: devops
title: Correlate production layout loading hang and restore profiling runtime
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: get_logs
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  On production Engee only, correlate bounded pod/readiness/application logs
  with HND-0273 around active_pane_layout_change and the subsequent 60-second
  Loading layout recovery failure. Determine whether the sole application
  process is running, whether the request remained in flight or failed, and
  whether any SIGTERM/rebootstrap/resource fault occurred. Preserve exact old
  baseline revision cac83c5f445352a50f04aeeeb269b47007766d79; do not deploy
  current local design work. If the runtime is unhealthy, recover that exact
  revision with explicit auto_stop=false and attest root plus /api/status.
  Never use localhost/devhub/fallback, and do not modify product, tests,
  architecture or dependency files. Do not run geniepkg_instantiate unless an
  evidenced package-environment deployment failure exists.
acceptance_criteria:
  - Bounded correlated evidence explains the hang as far as production logs permit.
  - Exact revision and sole-process health are attested after diagnostics/recovery.
  - Root and /api/status return 200 and readiness is suitable for a fresh E2E rerun.
requested_skills: [devops/devops-workflow, devops/deployment-diagnostics]
---
