---
id: HND-0079
type: report
from: engee_user
to: orchestrator
title: Production EngeeDSP contract verified
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#verification-and-results
applied_skills:
  - engee-user/engee-user-workflow
  - engee-user/required-functionality-analysis
  - engee-user/engee-contract-testing
skipped_requested_skills: []
description: |
  Production https://engee.com, Julia 1.12.4. Verified EngeeDSP UUID
  f9bbbd0e-0dd6-4072-898a-88f8f1250a99, compat/version 0.74.0, revision
  master, tree SHA 9b155bb681eab1b19016ad7eeb1d5062d60f37e3 and source
  https://gitlab.kpm-ritm.ru/engee/backend/kernels/engeelibraries/EngeeDSP.jl.git.
  No matching reachable registry entry was observed.

  In a strict JULIA_LOAD_PATH=@:@stdlib child environment import failed without
  EngeeDSP in deps and succeeded with the exact UUID. Public pspectrum and
  findpeaks entrypoints were confirmed. Unchanged persistent test files matched
  local SHA-256. Production job finished DONE, exit 0: target lock 6/6,
  findpeaks matrix 16/16, pspectrum contract 291/291; total 313/313 PASS.

  Removed only three enumerated HND-0075 temporary directories; final matching
  /user enumeration was empty. No local files, product, Git, deployment,
  application state or persistent tests changed. No Engee discrepancy remained.
---
