---
id: HND-0365
type: task
from: orchestrator
to: devops
title: Deploy production design v2 and active-output terminalization
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
expected_revision: c7e0f9a4bbe145be14a197c25d0c8700c0f205ee
paths:
  - lib/domain/signal_analyser_state.jl
  - lib/services/signal_output_service.jl
  - public/css/layouts.css
  - public/css/settings.css
  - public/css/theme.css
  - public/icons/copy.svg
  - public/icons/engee-logo.svg
  - public/icons/eye.svg
  - public/icons/help-circle.svg
  - public/icons/import.svg
  - public/icons/save.svg
  - public/icons/trash.svg
  - public/index.html
  - public/js/app.js
  - public/js/layouts.js
  - public/js/settings.js
  - test/back/lib/active_output_contract_test.jl
  - test/front/public/js/design_v2.static.test.js
  - test/front/public/js/layouts.behavior.test.js
description: |
  Commit and push exactly the 19 allowlisted product/test paths, update the
  verified production checkout to the exact new SHA and start/restart only via
  engee.genie.start with the recorded app/log paths. Do not stage architecture,
  agents, skills, screenshots/artifacts or unrelated dirty-worktree files.
  Project.toml and Manifest.toml remain user-protected: do not read, use,
  modify, stage, sync or instantiate them. Verify one runtime process, root
  HTTP 200, ready/ok status and exact runtime SHA. Do not author product code.
acceptance_criteria:
  - Production pod gate reaches ready before Git/deployment mutation.
  - Commit contains exactly the 19 allowlisted paths and no protected files.
  - Feature branch, production checkout and runtime use the exact new SHA.
  - One process, root HTTP 200 and ready/ok status are attested.
  - No dependency file is read, changed, staged, synced or instantiated.
requested_skills: [devops/devops-workflow]
---
