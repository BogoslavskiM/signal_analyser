---
id: HND-0085
type: research
from: orchestrator
to: engee_user
title: Сгенерировать EngeeDSP Manifest evidence в isolated production copy
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#verification-and-results
description: |
  Production-only continuation after HND-0079. Obtain the current local
  Project.toml and tracked Manifest.toml as inputs, create an isolated temporary
  production project copy, run standard Pkg.resolve() and Pkg.instantiate()
  against the verified EngeeDSP source, and verify Project/Manifest consistency.
  Do not touch /user/apps/signal_analyser, Git, deployment, product code or
  persistent tests. Store the resulting machine-generated Manifest.toml and a
  concise checksum/identity evidence note only under
  architecture/engee_bugs/TASK-0038-production-manifest.toml and
  architecture/engee_bugs/TASK-0038-production-manifest-evidence.md, then
  remove only the enumerated temporary production paths. The first artifact is
  resolver evidence for Backender, not a bug report.
acceptance_criteria:
  - Artifact is created by Pkg.resolve, not hand edited, and matches current Project.toml hash.
  - EngeeDSP UUID/version/source/rev/tree identity is explicitly verified.
  - No production application checkout/runtime or Git state is changed.
  - Exact temporary paths are enumerated and cleaned after artifact delivery.
requested_skills:
  - engee-user/engee-contract-testing
---
