---
id: HND-0406
type: task
from: orchestrator
to: devops
title: Production-checkout-only deploy of exact TASK-0060 revision
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
remote_project_dir: /user/apps/signal_analyser
expected_revision: bba7f2528abccf14dcdd313681c8fd8bf538d40c
paths:
  - public/js/settings.js
documented_external_blockers:
  - Local source root contains unrelated user-owned architecture/skills/agent changes; it is explicitly out of deploy scope and must not be inspected as a deploy worktree gate.
description: |
  The exact SHA is already pushed and the production checkout was independently
  verified clean at `76cb9c6...`. Perform the update entirely in that clean
  production checkout: fetch the requested branch, fast-forward it to the exact
  SHA, verify `public/js/settings.js`, and start/restart only the production app
  when needed. Do not use the dirty local source root for checkout/add/commit/
  push and do not modify, stash or clean it. If a local Git verification context
  is mandatory, use an isolated temporary clean checkout; never treat the
  documented unrelated local changes as a production update blocker. Do not
  read, use, copy or touch dependency files and do not instantiate packages.
acceptance_criteria:
  - Clean production checkout reaches the exact expected revision.
  - Root/status return HTTP 200 with ready=true and ok=true.
  - Exactly one SignalAnalyser registration serves the revision.
  - Local user work and dependency files remain untouched.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
