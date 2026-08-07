---
id: HND-0245
type: task
from: orchestrator
to: devops
title: Восстановить exact production runtime для stall profile
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
paths: []
description: |
  Restore and attest the already-published exact revision after HND-0244 showed
  the production target unavailable in foreground Chrome. Do not stage, commit
  or publish any current local work: this request only restores the existing
  remote revision and production runtime. Start only in production Engee with
  engee.genie.start(app_path, log_file=log_file), verify readiness, application
  URL and served revision. On failure collect bounded sanitized diagnostics and
  classify ownership. Do not read, copy, instantiate from or modify
  Project.toml/Manifest.toml; environment sync is explicitly not requested.
acceptance_criteria:
  - Production checkout and served runtime attest the exact expected revision.
  - Application shell and readiness are reachable from the production URL.
  - No local product/task/test/dependency changes are staged or published.
  - Failed restoration returns sanitized diagnosis_ref/log_refs and evidence-based owner classification.
requested_skills:
  - devops/engee-deployment-diagnostics
---
