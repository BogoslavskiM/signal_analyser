---
id: HND-0212
type: report
from: backender
to: orchestrator
title: Fail-closed scoped Git runtime attestation ready
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Replaced the unavailable environment loader with exact HEAD commit resolution
  from the application checkout and a porcelain cleanliness gate limited to
  app/lib/public/run.jl. Staged, unstaged or untracked runtime changes, missing
  Git/repository, command failure and malformed SHA fail bootstrap. No env/file/
  default fallback exists. RuntimeRevision, process constant, status payload and
  no-store behavior remain unchanged. Only lib/config.jl and app/bootstrap.jl
  changed; dependency paths are absent from every command/check.
applied_skills: [backender/backender-workflow, backender/backend-design, backender/api-contract-planning]
design_ref: null
design_version: null
design_status: n/a
---
