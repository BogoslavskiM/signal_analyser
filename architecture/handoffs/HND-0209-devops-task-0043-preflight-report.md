---
id: HND-0209
type: report
from: devops
to: orchestrator
title: Managed runtime source limitation isolated
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Production remained healthy at a2320652445725678629ad24b325211d3100e275,
  PID 1059, root/status HTTP 200. Process inspection proved the managed runtime
  has no SIGNAL_ANALYSER_RUNTIME_REVISION variable. A detached exact-4a30206
  worktree was tested only on loopback; a normal Julia process cannot load Genie
  without the managed app environment. No spare process survived. The disposable
  worktree and log were removed, while production checkout/PID/routing remained
  unchanged. Platform-compatible revision sourcing must not depend on env.
applied_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
