---
id: HND-0254
type: report
from: devops
to: orchestrator
title: External SIGTERM and route loss confirmed after Ready
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
description: |
  LOG-0002 confirms the exact clean feature revision reached Genie Ready and
  served HEAD/GET 200, then received external signal 15 without a preceding
  product exception. The log stopped, no matching app process remained, and
  foreground maintenance was reproduced by the bounded current probe as HTTP
  404. The earlier reported 500 was not reproduced in this capture. Checkout,
  branch and paths are correct. Application is not operational. No restart,
  Git/product/test/dependency mutation or environment sync occurred; the pod
  was raised only for diagnostics. Owner classification: Engee User for runtime
  lifecycle localization.
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics, devops/technical-maintenance-screen-diagnostics]
failure_owner: engee_user
evidence_status: collected
diagnosis_ref: ../logs/LOG-0002-task-0059-maintenance/SUMMARY.md
log_refs:
  - ../logs/LOG-0002-task-0059-maintenance/application.log
  - ../logs/LOG-0002-task-0059-maintenance/runtime-status.txt
  - ../logs/LOG-0002-task-0059-maintenance/main-document-response.txt
  - ../logs/LOG-0002-task-0059-maintenance/browser-console.log
  - ../logs/LOG-0002-task-0059-maintenance/network-errors.log
  - ../logs/LOG-0002-task-0059-maintenance/technical-maintenance-screen.png
source_branch: neuro_signal_analyser_ui_refinement
revision: cac83c5f445352a50f04aeeeb269b47007766d79
---
