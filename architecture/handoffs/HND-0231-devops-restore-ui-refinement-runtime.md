---
id: HND-0231
type: task
from: orchestrator
to: devops
title: Развернуть и аттестовать UI refinement base runtime в production Engee
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_refinement
source_branch: neuro_signal_analyser_ui_refinement
paths: []
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  E2E HND-0230 found the production application shell unavailable. Without
  staging or committing local dirty changes, update the verified production
  Engee checkout to exact origin/neuro_signal_analyser_ui_refinement revision
  cac83c5f445352a50f04aeeeb269b47007766d79 and start only in production Engee
  with engee.genie.start(app_path, log_file=log_file). Prove readiness, exact
  runtime revision and application URL. If start/readiness fails, automatically
  apply bounded deployment diagnostics and route the evidenced owner. Preserve
  all user/agent working changes. By explicit user instruction do not read,
  modify, stage, sync or use Project.toml/Manifest.toml; do not run
  geniepkg_instantiate or environment sync. Never start locally or use localhost.
acceptance_criteria:
  - Production checkout and runtime expose exact expected revision.
  - Root, app-shell and status/readiness are reachable at the production URL.
  - Exact Engee start call, URL, revision and bounded logs/diagnosis are reported.
  - Local dirty changes and dependency files remain untouched and unstaged.
requested_skills: []
---
