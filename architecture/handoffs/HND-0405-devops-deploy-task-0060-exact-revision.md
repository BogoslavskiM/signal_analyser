---
id: HND-0405
type: task
from: orchestrator
to: devops
title: Deploy exact final TASK-0060 revision
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
paths:
  - public/js/settings.js
description: |
  Update the production Engee checkout to the exact already-pushed revision and
  expose the updated frontend asset. Start or restart only the production
  SignalAnalyser runtime when required, using the mandated absolute
  `engee.genie.start` call and log path. Do not read, copy, use or touch
  Project.toml or Manifest.toml; no package recovery/environment sync is
  requested. Preserve unrelated applications and processes.
acceptance_criteria:
  - Production checkout and runtime report the exact expected revision.
  - Root/status return HTTP 200 with ready=true and ok=true.
  - Exactly one SignalAnalyser registration serves the revision.
  - No dependency or unrelated file is touched.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
