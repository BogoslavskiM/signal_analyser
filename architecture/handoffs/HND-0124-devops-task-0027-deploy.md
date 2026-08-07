---
id: HND-0124
type: task
from: orchestrator
to: devops
title: Deploy final detailed-layout and persistent Display reorder UI
task_section: ../tasks/TASK-0027-table-settings-visual-density.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - public/css/app.css
  - public/css/settings.css
  - public/css/theme.css
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
description: |
  Publish only the reviewed TASK-0027 product and regression paths. Full
  frontend suite independently passes 4/4 and diff/syntax checks pass. Preserve
  all unrelated architecture/design/user work. Run the complete production
  deployment pipeline and return exact feature/private/production SHA plus
  external root/status and loaded asset evidence. Do not inspect, use, stage or
  modify Project.toml or Manifest.toml. Production only; no merge, devhub or
  fallback.
acceptance_criteria:
  - Only the six supplied paths are staged and committed.
  - Branch, private remote and production SHA match and runtime is RUNNING.
  - External product DOM and /api/status are HTTP 200; deployed JS/CSS are the committed assets.
  - Unrelated, dependency and credential state remain untouched.
requested_skills: []
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---
