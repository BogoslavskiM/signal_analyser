---
id: HND-0300
type: task
from: orchestrator
to: devops
title: Deploy published feature SHA through Engee eval_code capability
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: deploy
expected_revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
description: |
  Use the available production Engee tools explicitly:
  mcp__codex_apps__engee_prod_mind_engee_status/start and eval_code. Through
  pure Julia execution on the pod, inspect `/user/apps/signal_analyser`, fetch
  and checkout exact published SHA 555b681 without touching dependency files,
  verify clean worktree/SHA, terminate only the existing exact application
  process if needed, and start `/user/apps/signal_analyser/app.jl` with
  `engee.genie.start(..., log_file=..., auto_stop=false)`. Never use
  geniepkg_instantiate. Attest one process, exact runtime SHA, root/status 200
  and functionally ready GET /api/layouts. Do not merge neuro_dev and do not
  change local files.
acceptance_criteria:
  - Production checkout is exact SHA 555b681 and clean.
  - App starts with explicit auto_stop=false and one process.
  - Root, status and ready layout attest the same revision.
  - No dependency/environment or neuro_dev mutation occurs.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
