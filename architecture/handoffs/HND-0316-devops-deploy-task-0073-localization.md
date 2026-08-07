---
id: HND-0316
type: task
from: orchestrator
to: devops
title: Publish and deploy mutation-dispatch fix with accepted localization
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
paths:
  - public/index.html
  - public/css/layouts.css
  - public/js/app.js
  - test/front/public/js/app.static.test.js
  - test/front/public/js/app.behavior.test.js
description: |
  HND-0314/HND-0315 pass deterministic review. Commit and push only the five
  explicit allowlisted files above on the existing feature branch, then update
  the verified production checkout to that exact new SHA and restart only in
  production Engee with auto_stop=false. Do not stage architecture, agent,
  skill, backend or any other dirty-worktree changes. Project.toml and
  Manifest.toml are user-protected: do not read, use, stage, modify, sync or
  instantiate them. Do not run a local application. Verify one production
  process, HTTP 200 root, /api/status ready/ok and exact runtime_revision.
acceptance_criteria:
  - Commit contains exactly the five allowlisted paths and no dependency files.
  - Remote feature branch contains the commit.
  - Production checkout and runtime serve the exact new SHA.
  - One process, auto_stop=false, root 200 and status ready/ok are attested.
requested_skills: [devops/devops-workflow]
---
