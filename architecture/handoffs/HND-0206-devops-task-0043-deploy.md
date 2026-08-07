---
id: HND-0206
type: task
from: orchestrator
to: devops
title: Deploy immutable runtime revision with fail-closed env injection
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - lib/config.jl
  - app/bootstrap.jl
  - app/api.jl
  - app/routes.jl
  - test/back/app/runtime_revision_api_test.jl
description: |
  Stage and commit exactly five reviewed TASK-0043 paths after repeating the
  explicit-fixture backend gate. Preserve unrelated work. Before replacing the
  healthy production process, prove the production lifecycle can launch the new
  exact checkout with SIGNAL_ANALYSER_RUNTIME_REVISION equal to the newly created
  lowercase 40-hex commit SHA. A spare-port pod preflight is allowed. Only after
  that proof may production be updated/restarted. After readiness, require
  /api/status.runtime_revision == local == private == production SHA and
  Cache-Control no-store. If authoritative env injection cannot be guaranteed,
  leave the current production process healthy and report a blocked deployment;
  do not use Git/file/default fallback. Never inspect/use/stage/modify Project.toml
  or Manifest.toml. Production only; no devhub/fallback.
acceptance_criteria:
  - Only five supplied paths are committed and pushed.
  - Exact env injection is proven before healthy-process replacement.
  - Local/private/production/status SHAs are identical lowercase 40-hex values.
  - Status is no-store and root/state/static assets remain healthy.
  - Failure leaves the existing production service healthy and clearly reported.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
