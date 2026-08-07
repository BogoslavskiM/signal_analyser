---
id: HND-0144
type: task
from: orchestrator
to: devops
title: Deploy authoritative multi-layout panes and responsive UI
task_section: ../tasks/TASK-0030-multilayout-frontend.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - lib/services/signal_analyser_service.jl
  - public/index.html
  - public/js/api.js
  - public/js/app.js
  - public/js/layouts.js
  - public/css/layouts.css
  - test/back/lib/pane_outputs_test.jl
  - test/back/lib/multilayout_integration_test.jl
  - test/front/public/js/layouts.behavior.test.js
  - test/front/public/js/layouts.static.test.js
description: |
  Publish only the reviewed TASK-0030/TASK-0045/TASK-0046 product and TASK-0031
  regression paths. Ready design is TASK-0044 v2. Frontend suite passes 6/6
  files and 1435/1435 assertions; backend passes 2446/2446 assertions;
  Orchestrator independently repeated both full suites without failure. Preserve
  all unrelated architecture/design/user work. Run the complete production
  deployment pipeline and return exact feature/private/production SHA, restart,
  external root/status/API/layout and deployed asset evidence. Do not inspect,
  use, stage or modify Project.toml or Manifest.toml. Production only; no merge,
  devhub or fallback.
acceptance_criteria:
  - Only the ten supplied paths are staged and committed.
  - Branch, private remote and production SHA match and runtime is RUNNING.
  - External root, /api/status, /api/state and /api/layouts respond successfully.
  - Deployed layouts.js/layouts.css and changed assets match the committed files.
  - Unrelated, dependency and credential state remain untouched.
requested_skills: []
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
