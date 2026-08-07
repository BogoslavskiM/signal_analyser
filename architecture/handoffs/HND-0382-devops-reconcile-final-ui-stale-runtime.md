---
id: HND-0382
type: task
from: orchestrator
to: devops
title: Reconcile stale SignalAnalyser runtime for final UI revision
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: e0d1253433505943569c2a6b5e07555d5504be0b
description: |
  This repeats the evidenced stale-runtime pattern resolved in HND-0374:
  checkout is exact and canonical start succeeds, while the gateway still owns
  the preceding runtime SHA. Use read-only process/listener/status checks to
  identify the exact stale SignalAnalyser runtime. Stop only that stale runtime
  through a supported Engee/runtime command, then perform one absolute-path
  engee.genie.start and verify exactly one SignalAnalyser owner. Do not change
  or stage source. Do not read, use or touch Project.toml or Manifest.toml.
  Preserve every unrelated pod process, including other applications.
acceptance_criteria:
  - Stale SignalAnalyser ownership is evidenced before stopping it.
  - Only the exact stale SignalAnalyser runtime is stopped.
  - Exactly one runtime serves expected_revision afterward.
  - Root HTTP 200 and /api/status ready=true, ok=true, exact SHA.
  - No source or dependency file is changed.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
