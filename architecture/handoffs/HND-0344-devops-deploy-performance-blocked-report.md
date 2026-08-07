---
id: HND-0344
type: deployment_failure
from: devops
to: orchestrator
title: Production Engee pod gate blocked performance deployment before Git
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
source_branch: neuro_signal_analyser_ui_refinement
revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
failure_owner: undetermined
evidence_status: collected
diagnosis_ref: ../logs/LOG-0007-deploy-performance-interactive-plotly/SUMMARY.md
log_refs: [../logs/LOG-0007-deploy-performance-interactive-plotly/application.log]
description: |
  Authenticated production pod status returned HTTP 503/unknown and pod start
  produced no ready result. DevOps stopped before staging, commit, push, remote
  checkout, application start or readiness. All 22 allowlisted files remain
  unstaged at source revision 555b6815de9a5d78fd31224f86d47638e18a6bc6.
  Project.toml and Manifest.toml were not read or changed. This is an external
  production availability gate, not application or Plotly evidence.
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
---
