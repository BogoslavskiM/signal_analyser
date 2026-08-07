---
id: HND-0199
type: task
from: orchestrator
to: devops
title: Design production source for immutable runtime revision
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: diagnose
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Diagnose how the managed Engee production update/start lifecycle can provide
  the exact checked-out 40-hex commit SHA to the running process at bootstrap.
  Compare environment injection, repository HEAD resolution and committed build
  metadata against the actual lifecycle. Recommend a fail-closed source and
  deployment verification that does not persist credentials. Read-only only; no
  deploy, restart, Git mutation or product edits. Never inspect/use/modify
  Project.toml or Manifest.toml. Production only; no devhub/fallback.
acceptance_criteria:
  - Recommendation maps source/local/private/production SHA to runtime field exactly.
  - Missing/invalid revision behavior and operational failure mode are explicit.
  - Required deploy/start changes, if any, are exact and minimal.
  - No external state is mutated.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
