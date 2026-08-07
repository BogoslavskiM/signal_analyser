---
id: HND-0186
type: task
from: orchestrator
to: devops
title: Deploy expanded Inspector row fix
task_section: ../tasks/TASK-0053-fix-inspector-expanded-row.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - public/js/app.js
  - public/css/app.css
  - test/front/public/js/app.behavior.test.js
  - test/front/public/js/app.static.test.js
description: |
  Publish only the reviewed TASK-0053 Inspector disclosure fix/regressions.
  Focused 1109/1109, full frontend 1456/1456 and browser geometry 9/9 pass;
  Orchestrator independently reviewed diff and repeated full suite 6/6. Stage
  only four exact paths, preserve all architecture/design/user work, run complete
  production deploy/restart/attestation and verify changed asset hashes. Never
  inspect/use/stage/modify Project.toml or Manifest.toml. Production only; no
  merge/devhub/fallback.
acceptance_criteria:
  - Only four supplied paths are committed.
  - Local/private/production SHA match and runtime is RUNNING.
  - Root/APIs and changed assets return HTTP 200 and match commit.
  - Unrelated/dependency/credential state remains untouched.
requested_skills: []
design_ref: ../design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
design_status: ready
---
