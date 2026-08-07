---
id: HND-0259
type: report
from: engee_user
to: orchestrator
title: Production Genie SIGTERM локализован до app auto-stop lifecycle
task_section: ../tasks/TASK-0069-localize-engee-runtime-sigterm.md#acceptance-criteria
failure_owner: engee_runtime_lifecycle
evidence_status: collected_incomplete_causation
diagnosis_ref: ../engee_bugs/ENGEE-prod-current-julia-1.12.4-genie-auto-stop-sigterm.md
log_refs:
  - ../logs/LOG-0002-task-0059-maintenance/SUMMARY.md
description: |
  Production introspection shows an undocumented engee.genie.start default
  auto_stop=true. The exact revision reached Ready and served 200, then its app
  process received SIGTERM and disappeared roughly 628 seconds after activity,
  while the pod itself stopped only around its separate 1800-second inactivity
  timeout. Route loss is repeatable; the signal sender is not exposed, so the
  auto-stop cause remains suspected rather than confirmed. A persistent
  read-only probe was added at test/engee/genie_runtime_lifecycle_contract.jl.
  Recovery is DevOps-owned: start the exact published revision with explicit
  auto_stop=false and require passing probes immediately and after at least
  720 quiet seconds. No product stub is authorized.
applied_skills:
  - engee-user/engee-user-workflow
  - engee-user/required-functionality-analysis
  - engee-user/engee-contract-testing
  - engee-user/bug-reporting
skipped_requested_skills: []
---
