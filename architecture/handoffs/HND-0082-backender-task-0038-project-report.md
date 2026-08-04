---
id: HND-0082
type: report
from: backender
to: orchestrator
title: Verified EngeeDSP Project contract added and Manifest resolution required
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#verification-and-results
applied_skills: [backender/backender-workflow]
skipped_requested_skills: []
description: |
  Changed only Project.toml: exact EngeeDSP UUID, compat 0.74.0 and verified
  production-system source URL/rev. Genie/Test entries are unchanged; no API,
  math, fallback, registry assumption, tests or Manifest changes. Stdlib TOML,
  Pkg.Types.read_project and diff checks PASS.

  Bootstrap/backend execution stops before app loading because direct dep
  EngeeDSP is absent from tracked Manifest. Exact downstream requirement is
  standard Pkg.resolve() against the verified source, followed by instantiate,
  identity verification and rerun of bootstrap/backend/Engee contracts.
---
