---
id: HND-0105
type: task
from: orchestrator
to: devops
title: Deploy authoritative Display reorder contract
task_section: ../tasks/TASK-0032-display-tab-order-contract.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - lib/services/signal_analyser_service.jl
description: |
  Publish and deploy only the reviewed TASK-0032 backend path on the existing
  feature branch. Preserve every unrelated dirty/untracked user or agent file.
  Run the complete conditional pipeline and return exact local/remote/Engee
  SHA plus external URL/status. Project.toml and Manifest.toml are forbidden:
  do not inspect, stage, use or modify them. Production engee.com only; no
  devhub/fallback or merge.
acceptance_criteria:
  - Only the supplied product path is staged/committed for TASK-0032.
  - Feature branch, private remote and production checkout share exact SHA.
  - Application is RUNNING and external root/status are verified.
  - Dependency files and unrelated worktree changes remain untouched.
requested_skills: []
---
