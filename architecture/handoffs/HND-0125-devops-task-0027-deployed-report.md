---
id: HND-0125
type: report
from: devops
to: orchestrator
title: Detailed-layout and persistent Display reorder UI deployed
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
applied_skills: [devops/devops-workflow]
description: |
  Exact six allowed paths committed, pushed and deployed as
  a6add263120f41aa1ae66497f3effac6bb493cff. Full frontend suite passes 4/4.
  Local/private/production SHA match; production checkout is clean and runtime
  RUNNING. External root and /api/status return HTTP 200. External app.js,
  app.css, settings.css and theme.css SHA-256 each match the committed asset.
  Unrelated architecture/design/user work and dependency files remained
  untouched; no merge, devhub or fallback was used.
---
