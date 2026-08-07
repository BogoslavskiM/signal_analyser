---
id: HND-0343
type: task
from: orchestrator
to: devops
title: Publish and deploy state-lite performance architecture with live Plotly
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
paths:
  - app/api.jl
  - app/routes.jl
  - lib/domain/signal_analyser_state.jl
  - lib/services/signal_analyser_service.jl
  - lib/services/signal_inventory_service.jl
  - lib/services/signal_output_service.jl
  - lib/services/signal_session_service.jl
  - lib/services/signal_settings_service.jl
  - lib/services/workspace_batch_import_service.jl
  - public/css/layouts.css
  - public/index.html
  - public/js/api.js
  - public/js/app.js
  - public/js/layouts.js
  - test/back/app/signal_analyser_api_test.jl
  - test/back/lib/active_output_contract_test.jl
  - test/back/lib/multilayout_integration_test.jl
  - test/back/lib/pane_outputs_test.jl
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
  - test/front/public/js/layouts.behavior.test.js
  - test/front/public/js/state_lite_active_output.static.test.js
description: |
  HND-0342 passes complete backend 4,051/4,051 and frontend 8/8. Commit and
  push only the explicit allowlist on the existing feature branch, then update
  the verified production checkout to the exact new SHA and start/restart only
  in production Engee. Preserve the accepted live Plotly implementation; do not
  author product/test changes. Do not stage architecture, agents, skills or any
  unrelated dirty-worktree files. Project.toml and Manifest.toml are explicitly
  user-protected: do not read, use, stage, modify, sync or instantiate them.
  Before remote work perform the required production pod status/start gate.
  Verify a single process, HTTP 200 root, ready/ok status and exact runtime SHA.
acceptance_criteria:
  - Commit contains exactly the 22 allowlisted paths and no dependency/architecture files.
  - Remote feature branch contains the new commit.
  - Production checkout and runtime serve the exact new SHA.
  - One production process, root 200 and status ready/ok are attested.
requested_skills: [devops/devops-workflow]
---
