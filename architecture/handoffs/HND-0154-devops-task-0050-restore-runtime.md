---
id: HND-0154
type: task
from: orchestrator
to: devops
title: Restore exact post-deploy production runtime
task_section: ../tasks/TASK-0050-restore-post-deploy-runtime.md#scope
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Restore/verify existing production checkout and Genie application at exact SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8 after post-deploy E2E observed
  maintenance HTTP 404. Inspect status/listener/logs, restart when required, and
  verify product DOM plus /api/status, /api/state and /api/layouts with repeated
  external probes. Do not stage/commit/update source. Project.toml and
  Manifest.toml are forbidden and must not be inspected, used or changed.
  Production engee.com only; no devhub/fallback.
acceptance_criteria:
  - Exact local/private/production branch and SHA are attested.
  - Runtime is RUNNING and repeated external product/API probes return HTTP 200.
  - Every pipeline stage is performed, not_needed, blocked or not_run.
  - No source, tests, architecture, dependencies or credentials change.
requested_skills: []
---
