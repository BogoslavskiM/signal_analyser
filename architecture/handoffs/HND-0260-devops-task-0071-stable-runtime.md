---
id: HND-0260
type: task
from: orchestrator
to: devops
title: Запустить exact production app с auto_stop=false и доказать стабильность
task_section: ../tasks/TASK-0071-restore-stable-runtime-auto-stop-false.md#scope
devops_request: deploy
source_branch: neuro_signal_analyser_ui_refinement
revision: cac83c5f445352a50f04aeeeb269b47007766d79
failure_owner: devops
evidence_status: collected
diagnosis_ref: ../engee_bugs/ENGEE-prod-current-julia-1.12.4-genie-auto-stop-sigterm.md
description: |
  Recover only the already-published exact clean revision in production Engee.
  Run the mandatory pod status/start gate, then start app.jl with explicit
  auto_stop=false and the normal log_file. Run the persistent TASK-0069 probe
  immediately and after at least 720 quiet seconds. Accept only STARTED plus
  root/API 200 exact revision on both probes and no new SIGTERM/maintenance.
  Do not stage/deploy local dirty work, access dependency files, mutate Git or
  start a local/localhost application. If SIGTERM repeats, collect the bounded
  controller/pod/app event window and return to Orchestrator/Engee User.
acceptance_criteria:
  - All TASK-0071 acceptance criteria are evidenced.
  - auto_stop=false is explicit in the production start invocation.
  - No product, dependency or Git files are changed.
requested_skills:
  - devops/deployment-diagnostics
---
