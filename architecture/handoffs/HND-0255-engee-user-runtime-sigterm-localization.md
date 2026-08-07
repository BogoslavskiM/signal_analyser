---
id: HND-0255
type: deployment_failure
from: orchestrator
to: engee_user
title: Локализовать Engee SIGTERM и production route loss
task_section: ../tasks/TASK-0069-localize-engee-runtime-sigterm.md#scope
source_branch: neuro_signal_analyser_ui_refinement
revision: cac83c5f445352a50f04aeeeb269b47007766d79
failure_owner: engee_user
evidence_status: collected
diagnosis_ref: ../logs/LOG-0002-task-0059-maintenance/SUMMARY.md
log_refs:
  - ../logs/LOG-0002-task-0059-maintenance/application.log
  - ../logs/LOG-0002-task-0059-maintenance/runtime-status.txt
  - ../logs/LOG-0002-task-0059-maintenance/main-document-response.txt
description: |
  Localize the production Engee pod/runtime lifecycle after a correct
  engee.genie.start reached Ready/200 and then received unexplained external
  SIGTERM. Determine documented/help/observed lifetime behavior, repeatability,
  route-loss semantics and a concrete DevOps recovery/redeploy gate. Persist a
  minimal contract test/probe under test/engee when possible. This is not an
  Engee math/function fallback case: do not authorize or request any product
  stub, fake success or local runtime. Do not access or modify dependency files.
acceptance_criteria:
  - TASK-0069 criteria are answered with exact production evidence.
  - Verdict and repeatability are explicit; stub_authorization is false.
  - Any confirmed/suspected Engee issue has a linked bug record/test as required.
  - Concrete next DevOps action and recovery trigger are returned.
requested_skills:
  - engee-user/required-functionality-analysis
  - engee-user/engee-contract-testing
  - engee-user/bug-reporting
---
