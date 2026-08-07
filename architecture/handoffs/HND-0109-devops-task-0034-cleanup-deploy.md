---
id: HND-0109
type: task
from: orchestrator
to: devops
title: Deploy obsolete frontend cleanup and regression
task_section: ../tasks/TASK-0034-remove-obsolete-workspace-dom.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
description: |
  After HND-0105 completes, publish only the reviewed TASK-0034 product cleanup
  and TASK-0033 test updates. Preserve all unrelated architecture/design/user
  work. Run the complete deploy pipeline and return exact feature/private/
  production SHA plus external root/status. Do not inspect, use, stage or
  modify Project.toml/Manifest.toml. Production only; no merge/devhub/fallback.
acceptance_criteria:
  - Only the three supplied paths are staged/committed.
  - Branch/private/production SHA match and app is RUNNING.
  - External product DOM and /api/status are HTTP 200.
  - Unrelated and dependency files remain untouched.
requested_skills: []
---
