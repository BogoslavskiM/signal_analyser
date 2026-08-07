---
id: HND-0213
type: report
from: tester
to: orchestrator
title: Scoped Git runtime attestation regression passed
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Updated the single runtime revision test file for exact committed HEAD,
  process immutability, malformed/missing/failed Git, staged/unstaged/untracked
  runtime dirtiness, dirty run.jl and allowed out-of-scope changes. Status/no-store
  assertions remain. Focused 43/43 and full backend 2489/2489 pass without an
  environment fixture; Orchestrator independently repeated full 2489/2489.
  Disposable repositories were removed and dependency files were not used.
applied_skills: [tester/tester-workflow, tester/backend-api-testing]
design_ref: null
design_version: null
design_status: n/a
---
