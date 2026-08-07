---
id: HND-0176
type: report
from: devops
to: orchestrator
title: Healthy-API bootstrap fix deployed
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - public/js/layouts.js
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/layouts.behavior.test.js
  - test/front/public/js/layouts.static.test.js
applied_skills: [devops/devops-workflow]
description: |
  Exact five paths committed, pushed and deployed as
  17482dc4aef3d86e79815a36ae950045f74fd142. Local/private/production SHA match,
  runtime RUNNING, root/status/state/layouts HTTP 200, and changed app.js/layouts.js
  byte-match committed assets. Syntax 5/5 and frontend 6/6 pass. No out-of-scope,
  dependency, credential, merge, devhub or fallback changes.
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
