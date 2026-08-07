---
id: HND-0380
type: task
from: orchestrator
to: devops
title: Deploy final popup, modebar and responsive-shell fix
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: 545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c
paths:
  - public/css/app.css
  - public/css/layouts.css
  - public/css/theme.css
  - public/js/app.js
  - public/js/layouts.js
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
  - test/front/public/js/design_v2.static.test.js
  - test/front/public/js/layouts.behavior.test.js
  - test/front/public/js/layouts.static.test.js
description: |
  Commit and push exactly the ten allowlisted product/test paths, update the
  clean production checkout to the resulting exact SHA and restart exactly one
  SignalAnalyser runtime through the required absolute engee.genie.start call.
  Do not stage architecture, agents, skills, screenshots, Playwright artifacts
  or unrelated dirty-worktree content. Do not read, use or touch Project.toml
  or Manifest.toml. Preserve unrelated pod processes. Verify application log,
  root/status readiness, exact runtime SHA and single runtime ownership.
acceptance_criteria:
  - Commit contains exactly the ten allowlisted paths.
  - Production checkout and runtime use the exact result SHA.
  - Exactly one SignalAnalyser runtime serves root HTTP 200.
  - /api/status returns ready=true, ok=true and the exact SHA.
  - No protected dependency file or unrelated content is touched.
requested_skills: [devops/devops-workflow]
---
