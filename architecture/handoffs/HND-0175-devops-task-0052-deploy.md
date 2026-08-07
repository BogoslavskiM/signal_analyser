---
id: HND-0175
type: task
from: orchestrator
to: devops
title: Deploy healthy-API bootstrap ordering fix
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
description: |
  Publish only the reviewed TASK-0052 bootstrap fix and regressions. Syntax 5/5,
  focused 848/848, full frontend 1451/1451 and deterministic Chromium 5/5 pass;
  Orchestrator independently reviewed diff and repeated full suite 6/6. Stage
  only the five exact paths and preserve all architecture/design/user work.
  Run complete production deploy/restart/attestation and return exact SHA plus
  external root/status/state/layouts/assets evidence. Do not inspect/use/stage/
  modify Project.toml or Manifest.toml. Production only; no merge/devhub/fallback.
acceptance_criteria:
  - Only five supplied paths are staged and committed.
  - Local/private/production SHA match and runtime is RUNNING.
  - Product root/APIs and changed assets return HTTP 200 and match commit.
  - Unrelated work, dependency files and credentials remain untouched.
requested_skills: []
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
