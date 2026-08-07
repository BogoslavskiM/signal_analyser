---
id: HND-0347
type: deployment_failure
from: devops
to: orchestrator
title: Production pod gate still unavailable after bounded retry
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
source_branch: neuro_signal_analyser_ui_refinement
revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
failure_owner: undetermined
evidence_status: blocked
diagnosis_ref: ../logs/LOG-0008-hnd-0346-pod-gate/SUMMARY.md
log_refs: [../logs/LOG-0008-hnd-0346-pod-gate/application.log]
description: |
  After the bounded cooldown, production engee_status again returned upstream
  HTTP 503 with pod state unknown; required engee_start failed with
  INVALID_ARGUMENT. DevOps stopped before staging, commit, push, remote update,
  application start or readiness. No dependency/environment action ran and the
  exact 22-path allowlist remains unstaged at the original SHA.
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
