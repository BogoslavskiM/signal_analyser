---
id: HND-0317
type: deployment_failure
from: devops
to: orchestrator
title: Production pod gate blocked mutation-dispatch deployment
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
failure_owner: undetermined
evidence_status: blocked
diagnosis_ref: ../logs/LOG-0005-hnd-0316-engee-pod-gate/SUMMARY.md
description: |
  Production Engee authentication succeeded, but status was unknown behind an
  upstream HTTP 503 and the required pod-start attempt returned
  INVALID_ARGUMENT. The gate failed before checkout, app, log or runtime
  evidence. No file was staged, committed, pushed or deployed; source remains
  555b6815de9a5d78fd31224f86d47638e18a6bc6. This evidence does not identify a
  product or Engee function/package defect.
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
