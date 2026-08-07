---
id: HND-0145
type: report
from: devops
to: orchestrator
title: Authoritative multi-layout feature deployed
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
applied_skills: [devops/devops-workflow]
description: |
  Exact ten paths committed, pushed and deployed as
  8c0d37e525268b2acf4781a4cb61e823a50639f8. Local/private/production SHA match;
  production checkout is clean and runtime RUNNING. Root, /api/status,
  /api/state and /api/layouts return HTTP 200. api.js, app.js, layouts.js,
  layouts.css and normalized index HTML match committed assets by SHA-256.
  Frontend suite passes 6/6; persisted backend evidence is 2446/2446. No paths
  outside scope were staged; unrelated work and dependency files remained
  untouched; no merge, devhub or fallback was used.
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
