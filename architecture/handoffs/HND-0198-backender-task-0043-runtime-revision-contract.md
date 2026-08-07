---
id: HND-0198
type: task
from: orchestrator
to: backender
title: Design immutable runtime revision API contract
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Diagnose a minimal read-only contract that exposes the exact immutable code
  revision served by the running process through /api/status. Inspect current
  bootstrap/status code and tests, compare safe startup-time sources, and propose
  exact paths, validation, fallback/fail-closed behavior and tests. Coordinate
  conceptually with DevOps lifecycle, but do not edit product files yet. Never
  inspect/use/modify Project.toml or Manifest.toml. Production only.
acceptance_criteria:
  - Proposed field semantics distinguish code revision from mutable state revision.
  - Revision is immutable for process lifetime and validated as a 40-hex Git SHA.
  - Missing/invalid source behavior cannot silently attest the wrong revision.
  - Exact minimal implementation and test paths are listed.
requested_skills: [backender/backend-workflow]
design_ref: null
design_version: null
---
