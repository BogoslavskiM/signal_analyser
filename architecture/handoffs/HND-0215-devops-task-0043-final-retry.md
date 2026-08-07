---
id: HND-0215
type: task
from: orchestrator
to: devops
title: Complete managed runtime revision deployment without early interruption
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Resume only production update/start for exact published SHA
  38d4134ea962b264ebabe0e7e9814c48368a975c. Production is currently recovered
  healthy at a2320652445725678629ad24b325211d3100e275. Fast-forward to the exact
  target, prove app/lib/public/run.jl clean, then call normal managed
  engee.genie.start with wait=true and allow its full 300-second timeout without
  interruption. No revision env. On success require status runtime_revision exact
  SHA and no-store plus root/state/assets 200. On definitive timeout/failure,
  restore a232065 and report exact logs. Do not alter source/Git history or use
  dependency files. Production only; no fallback/devhub.
acceptance_criteria:
  - Managed start is allowed to complete or reach its own timeout.
  - Exact target or exact rollback revision is unambiguous.
  - Successful status directly attests target SHA and no-store.
  - Production is healthy at completion in either branch.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
