---
id: HND-0208
type: task
from: orchestrator
to: devops
title: Diagnose TASK-0043 new runtime on an isolated spare port
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Keep the healthy production process on a2320652445725678629ad24b325211d3100e275.
  In an isolated clean checkout/worktree of exact SHA
  4a30206c7d2770eae7d44a7692b543558a6318df, start run.jl on a spare loopback
  port with SIGNAL_ANALYSER_RUNTIME_REVISION set explicitly to that exact SHA.
  Capture startup logs, local root/status HTTP, runtime_revision and no-store.
  Then terminate only the spare process and remove only its disposable checkout
  if one was created. Do not switch routing, stop PID 1059, edit code/Git, or use
  dependency files. If direct startup passes, identify the managed-launch env
  limitation precisely; if it fails, report the exact application error.
acceptance_criteria:
  - Existing external production remains HTTP 200 throughout and after diagnosis.
  - Spare process is bound only to loopback and is cleaned up explicitly.
  - Exact startup command/environment and logs are reported.
  - Root/status/runtime_revision/no-store evidence is unambiguous or exact failure is captured.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
