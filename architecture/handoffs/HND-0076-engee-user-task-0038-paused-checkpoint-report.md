---
id: HND-0076
type: report
from: engee_user
to: orchestrator
title: EngeeDSP production identity paused checkpoint
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#verification-and-results
applied_skills:
  - engee-user/engee-user-workflow
  - engee-user/required-functionality-analysis
  - engee-user/engee-contract-testing
skipped_requested_skills: []
description: |
  status: paused_by_user
  Environment: production https://engee.com, Julia 1.12.4.
  EngeeDSP UUID is f9bbbd0e-0dd6-4072-898a-88f8f1250a99; observed system
  version/compat is 0.74.0, revision master, tree SHA
  9b155bb681eab1b19016ad7eeb1d5062d60f37e3. Observed source is
  https://gitlab.kpm-ritm.ru/engee/backend/kernels/engeelibraries/EngeeDSP.jl.git.
  No matching reachable registry entry was observed; metadata came from the
  production system Project/Manifest under /usr/local/ijulia-core/environments/v1.12.

  A strict clean child environment failed to import without EngeeDSP in deps
  and succeeded after adding the exact UUID. Public
  EngeeDSP.Functions.pspectrum and documented findpeaks forms were verified.
  Application-shaped pspectrum and findpeaks probes passed.

  Pending after resume: run the unchanged persistent
  test/engee/engee_package_contract_tests.jl in the strict production child
  environment; confirm cleanup of a possible temporary pod path matching
  /user/hnd0075_task0038_*; produce the final evidence matrix; then hand exact
  UUID plus compat 0.74.0 to Backender. Do not invent a registry or fallback.

  Local workspace files changed by Engee User: none. Product, Git, deployment
  and Playwright were untouched. Production pod was left running.
---
