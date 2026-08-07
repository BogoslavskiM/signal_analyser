---
id: HND-0194
type: task
from: orchestrator
to: devops
title: Deploy native Inspector keyboard activation fix
task_section: ../tasks/TASK-0054-fix-inspector-keyboard-activation.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
  - test/front/run_inspector_keyboard_browser_test.js
description: |
  Publish only reviewed TASK-0054 product/regressions. Focused 1117/1117, full
  frontend 1464/1464 and local browser 28/28 pass; Orchestrator independently
  reviewed diff and repeated browser/full suites. Stage exactly four paths,
  preserve unrelated architecture/design/user work, run full deploy/restart and
  verify app.js plus root/status/state. Never inspect/use/stage/modify Project.toml
  or Manifest.toml. Production only; no merge/devhub/fallback.
acceptance_criteria:
  - Only four supplied paths are committed.
  - Local/private/production SHA match and runtime is RUNNING.
  - Root/APIs and app.js return HTTP 200 and match commit.
  - Unrelated/dependency/credential state remains untouched.
requested_skills: []
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
