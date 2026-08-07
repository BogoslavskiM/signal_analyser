---
id: HND-0349
type: task
from: orchestrator
to: devops
title: Resume production deployment after pod maintenance completion
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
  The user reports pod maintenance is complete and explicitly authorizes the
  application update. Resume the complete deploy pipeline from the mandatory
  production Engee status/start gate. Commit and push exactly the 22 allowlisted
  product/test paths on the existing feature branch, update the verified
  production checkout to the exact new SHA, and start/restart only through
  engee.genie.start with the recorded app/log paths. Do not stage architecture,
  agents, skills or unrelated dirty-worktree files. Project.toml and
  Manifest.toml remain user-protected: do not read, use, modify, stage, sync or
  instantiate them. Verify one runtime process, root HTTP 200, ready/ok status
  and exact runtime SHA. Do not author product/test code.
acceptance_criteria:
  - Production pod gate reaches ready before remote/Git pipeline work.
  - Commit contains exactly the 22 allowlisted paths and no protected files.
  - Feature branch, production checkout and runtime use the exact new SHA.
  - One process, root HTTP 200 and ready/ok status are attested.
requested_skills: [devops/devops-workflow]
---
