---
id: HND-0211
type: task
from: orchestrator
to: tester
title: Replace env tests with checkout-attestation regression
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
description: |
  Update only test/back/app/runtime_revision_api_test.jl for HND-0210. Cover
  exact committed HEAD, process immutability after HEAD changes, malformed SHA
  validation, missing Git/repository and command failure, plus dirty staged,
  unstaged and untracked files under app/lib/public/run.jl. Prove changes outside
  the runtime surface do not invalidate it, and dependency filenames are absent
  from implementation commands/checks. Preserve exact status/no-store tests.
  Use disposable temp repositories and clean them automatically. Do not edit
  product, frontend, architecture or dependency files.
acceptance_criteria:
  - All fail-closed Git and scoped-clean cases are deterministic.
  - No test reads or uses Project.toml/Manifest.toml.
  - Focused and full backend suites pass without an environment fixture.
  - Existing status response and process immutability assertions remain covered.
requested_skills: [tester/tester-workflow, tester/backend-api-testing]
design_ref: null
design_version: null
---
