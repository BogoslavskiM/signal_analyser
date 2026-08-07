---
id: HND-0420
type: report
from: engee_user
to: orchestrator
title: Production EngeeDSP math contract audited
task_section: ../tasks/TASK-0079-engee-math-contract-audit.md#scope
applied_skills: [engee-user/engee-user-workflow, engee-user/required-functionality-analysis, engee-user/engee-contract-testing, engee-user/bug-reporting]
skipped_requested_skills: []
environment: https://engee.com
julia_version: 1.12.4
engeedsp_version: 0.72.0
engeedsp_tree: 4941c08f227519cbc82caab7bc519851f44b0586
uploaded_suite_sha256: 5075d3797a36a3a67f712f1f2e5057a7bd2a4b5e75de62c074056032d1fd82dc
supported_contract_passed: 343
supported_contract_failed: 0
aggregate_passed: 365
documented_validation_regressions: 3
verdict: confirmed_bug
bug_ref: ../engee_bugs/ENGEE-0.72.0-pspectrum-validation-gaps.md
stub_authorization: false
result: accepted
description: |
  Production established EngeeDSP.Functions.pspectrum as the sole Engee math
  entrypoint. Time is product-owned. Spectrum returns linear average power and
  Hz with real one-sided or complex centered two-sided topology; a unit real
  cosine peaks near 0.5 and a unit complex exponential near 1.0. Spectrogram
  returns frequency-by-time linear power with segment centers in seconds.
  Persistence returns power-by-frequency percentage occurrence and positive
  linear power levels. Application-shaped supported contracts passed 343/343,
  including exact orientation, real/complex, two-sample, zero and nonfinite
  scenarios. One sample and invalid time inputs are rejected.

  Three intentionally failing regressions confirm EngeeDSP 0.72.0 validation
  gaps: complex input accepts TwoSided=false, and Persistence accepts
  NumPowerBins 19 and 1025. Current product dispatch cannot reach these cases,
  so no stub or fallback is authorized. Product gaps remain product-owned:
  complex Time magnitude presentation, non-MATLAB Normalize Y, ignored Time ROI
  for Spectrogram/Persistence, and undispatched Persistence settings.

  The active project does not own EngeeDSP in Project/Manifest and inherits
  0.72.0 from the system LOAD_PATH, differing from prior 0.74.0 evidence. A
  fresh child also failed before tests on a missing fzf_jll artifact, while the
  byte-identical suite passed in the initialized production worker. These are
  deployment risks for DevOps, not permission to change dependency files in
  the backend task.
---
