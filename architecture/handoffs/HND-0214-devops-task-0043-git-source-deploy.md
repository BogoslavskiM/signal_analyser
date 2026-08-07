---
id: HND-0214
type: task
from: orchestrator
to: devops
title: Deploy platform-compatible runtime revision attestation
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths:
  - lib/config.jl
  - app/bootstrap.jl
  - test/back/app/runtime_revision_api_test.jl
description: |
  Commit/push exactly the three reviewed delta paths on parent
  4a30206c7d2770eae7d44a7692b543558a6318df, then update the recovered production
  checkout from a2320652445725678629ad24b325211d3100e275 to the new cumulative
  HEAD. Before managed start prove app/lib/public/run.jl are clean with the exact
  same scoped command used by bootstrap. Start through the normal managed Genie
  lifecycle; no revision env is required. Require runtime RUNNING, root/state
  HTTP 200, /api/status HTTP 200 with no-store and runtime_revision equal to
  local/private/production HEAD. If start fails, restore the healthy a232065
  runtime. Preserve unrelated architecture/design/user work. Never inspect/use/
  stage/modify Project.toml or Manifest.toml. Production only; no devhub/fallback.
acceptance_criteria:
  - Only three delta paths are committed and pushed.
  - Scoped production runtime surface is clean before start.
  - Local/private/production/status revisions are identical exact lowercase 40-hex.
  - Status is no-store and root/state/static health remains HTTP 200.
  - Any failure safely restores a232065 production runtime.
requested_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
