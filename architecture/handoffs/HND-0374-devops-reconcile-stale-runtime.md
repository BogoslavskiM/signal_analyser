---
id: HND-0374
type: task
from: orchestrator
to: devops
title: Reconcile stale production runtime after hotfix deploy
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: 545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c
description: |
  The clean production checkout and new bootstrap are at expected_revision, but
  the external gateway still reports the previous runtime SHA. This cannot be a
  status-code implementation bug because RUNTIME_REVISION is read from checkout
  HEAD at bootstrap; it is evidence the gateway still owns a stale runtime.
  Perform read-only process/listener/status checks, identify duplicate or stale
  application ownership, stop only the exact stale SignalAnalyser runtime using
  supported Engee/runtime commands, and start exactly one process through the
  mandated absolute engee.genie.start call. Do not change product/test code or
  dependencies. Verify exact runtime SHA, one process/listener, root 200 and
  ready/ok. Preserve all unrelated pod processes and files.
acceptance_criteria:
  - Stale/duplicate runtime ownership is evidenced before mutation.
  - Only the exact stale SignalAnalyser runtime is stopped.
  - Exactly one runtime serves expected_revision afterward.
  - Root HTTP 200 and /api/status ready=true, ok=true, exact SHA.
  - No source or dependency file is changed.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
