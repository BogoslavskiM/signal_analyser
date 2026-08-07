---
id: HND-0381
type: deployment_failure
from: devops
to: orchestrator
title: Production serves preceding runtime after final UI deploy
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
source_branch: neuro_signal_analyser_ui_refinement
revision: e0d1253433505943569c2a6b5e07555d5504be0b
failure_owner: undetermined
diagnosis_ref: ../logs/LOG-0013-popup-modebar-responsive-revision-mismatch/SUMMARY.md
log_refs:
  - ../logs/LOG-0013-popup-modebar-responsive-revision-mismatch/application.log
evidence_status: collected
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
skipped_requested_skills: []
description: |
  The exact ten-path commit was pushed and the production checkout advanced to
  e0d1253. Two canonical absolute-path starts returned STARTED and root/status
  are healthy, but the public gateway still serves preceding runtime revision
  545bef2. Package recovery is not applicable; dependency files were neither
  read nor changed.
---
