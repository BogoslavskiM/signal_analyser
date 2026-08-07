---
id: HND-0346
type: task
from: orchestrator
to: devops
title: Retry production deploy after bounded pod-gate cooldown
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
  Retry HND-0343 once after the bounded cooldown and independent design audit.
  Start with the mandatory production Engee status/start gate. If ready, commit,
  push and deploy exactly the 22 allowlisted files; verify exact runtime SHA,
  one process, root 200 and ready/ok. If the gate is still unavailable, stop
  before Git mutation and refresh bounded sanitized diagnostics. Do not stage
  architecture, agents, skills, unrelated work or dependencies. Project.toml
  and Manifest.toml must not be read, used, modified, staged, synced or
  instantiated. Do not author product/test changes.
acceptance_criteria:
  - Ready gate leads to an exact allowlist commit/push/deploy and healthy runtime.
  - Unavailable gate stops before Git and produces sanitized classified evidence.
requested_skills: [devops/devops-workflow]
---
