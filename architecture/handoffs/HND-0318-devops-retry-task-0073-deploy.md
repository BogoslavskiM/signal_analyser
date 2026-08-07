---
id: HND-0318
type: task
from: orchestrator
to: devops
title: Retry transient production pod gate and exact allowlisted deployment
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
  HND-0317 is an undetermined transient pod/platform gate failure before any
  mutation. Recheck production pod status once and, if reachable/started,
  execute the same exact allowlisted commit/push/deploy pipeline. Do not stage
  backend work that may be changing concurrently or any architecture/agent/
  skill file. Project.toml and Manifest.toml remain prohibited: do not read,
  use, modify, sync, instantiate or stage them. No local application runtime.
  Start only production Engee with auto_stop=false and attest exact new SHA,
  one process, root 200 and /api/status ready/ok. If the same gate fails, store
  sanitized evidence and stop without Git mutation.
acceptance_criteria:
  - Pod gate either becomes reachable or returns a second precise diagnosis.
  - On success, commit includes exactly the five allowlisted paths.
  - On success, production serves the exact new SHA and is ready.
requested_skills: [devops/devops-workflow]
---
