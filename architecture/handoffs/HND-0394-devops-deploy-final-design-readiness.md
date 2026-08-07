---
id: HND-0394
type: task
from: orchestrator
to: devops
title: Deploy final design-readiness correction
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: e0d1253433505943569c2a6b5e07555d5504be0b
paths:
  - public/css/layouts.css
  - public/css/settings.css
  - public/index.html
  - public/js/app.js
  - public/js/layouts.js
  - public/js/settings.js
  - test/front/public/js/page_minimum_checkmark.static.test.js
description: |
  Commit and push exactly the seven allowlisted final UI/test paths, update the
  clean production checkout and restart exactly one SignalAnalyser runtime by
  the absolute-path Engee call. Local product JS syntax, diff check and complete
  frontend corpus pass 10/10. Do not stage architecture, skills, Playwright
  artifacts or unrelated changes. Do not read, use or touch Project.toml or
  Manifest.toml. If the gateway retains the previous SHA, immediately use the
  already-proven supported stop for this exact app path followed by one start;
  preserve unrelated applications/processes.
acceptance_criteria:
  - Commit contains exactly the seven allowlisted paths.
  - Production checkout and runtime use the exact result SHA.
  - Root/status return HTTP 200, ready=true and ok=true.
  - Exactly one supported SignalAnalyser registration serves the result SHA.
  - No dependency or unrelated file is touched.
requested_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
