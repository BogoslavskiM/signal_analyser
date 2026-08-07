---
id: HND-0187
type: report
from: devops
to: orchestrator
title: Expanded Inspector row fix deployed
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - public/css/app.css
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
applied_skills: [devops/devops-workflow]
description: |
  Exact four paths committed, pushed and deployed as
  3871bca726d78f5d4011745cd5b8ecd80c2214e2. Local/private/production SHA match,
  runtime RUNNING, root/status/state HTTP 200 and changed app.js/app.css assets
  byte-match the commit. Frontend suite 6/6 passes. No out-of-scope, dependency,
  credential, merge, devhub or fallback changes.
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
