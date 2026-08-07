---
id: HND-0373
type: task
from: orchestrator
to: devops
title: Deploy production DOM and settings hotfix
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: eb4f81eb695ddafef032646aff6245f4f380c4f8
paths:
  - public/css/layouts.css
  - public/js/layouts.js
  - public/js/settings.js
  - test/front/public/js/layouts.behavior.test.js
  - test/front/public/js/settings.static.test.js
description: |
  Commit and push exactly the five allowlisted hotfix/test paths, fast-forward
  the clean production checkout to the exact new SHA and restart only through
  engee.genie.start using the absolute app/log paths. Do not stage architecture,
  agents, skills, screenshots/artifacts or unrelated dirty-worktree content.
  Do not read/use/touch Project.toml or Manifest.toml. Verify root/status, exact
  runtime SHA and application log readiness. Do not edit product/test code.
acceptance_criteria:
  - Commit contains exactly the five allowlisted paths.
  - Production checkout and runtime use the exact result SHA.
  - Root HTTP 200 and status ready=true, ok=true.
  - No protected dependency file or unrelated content is touched.
requested_skills: [devops/devops-workflow]
---
