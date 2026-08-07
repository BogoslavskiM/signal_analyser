---
id: HND-0210
type: task
from: orchestrator
to: backender
title: Replace unavailable env source with fail-closed checkout attestation
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Supersede only the unavailable environment source from HND-0200/HND-0204.
  At bootstrap resolve exact lowercase 40-hex HEAD from the application Git
  checkout and require a clean runtime surface limited to app/**, lib/**,
  public/** and run.jl, including staged and untracked changes. Read once into
  the existing immutable RuntimeRevision constant. Missing Git/repository,
  command failure, dirty runtime paths or malformed SHA must fail startup. Do not
  inspect/check Project.toml or Manifest.toml, do not use env/file/default
  fallback, and preserve status/no-store behavior. Own only lib/config.jl and
  app/bootstrap.jl; do not edit tests, run.jl, frontend or architecture.
acceptance_criteria:
  - Runtime HEAD and scoped-clean checks are exact and fail closed.
  - Dependency paths are absent from every command/check.
  - Environment and metadata-file fallbacks are removed.
  - Process-lifetime immutability and existing status contract remain unchanged.
requested_skills: [backender/backender-workflow, backender/backend-design, backender/api-contract-planning]
design_ref: null
design_version: null
---
