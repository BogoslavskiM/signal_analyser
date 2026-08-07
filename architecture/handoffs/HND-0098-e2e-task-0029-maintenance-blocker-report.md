---
id: HND-0098
type: report
from: e2e
to: orchestrator
title: Production maintenance blocked layout contract regression
task_section: ../tasks/TASK-0029-multilayout-state-contract.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  e2e_mode: quick_regression
  target: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  requested_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  availability: failed
  planned: 8
  passed: 0
  failed: 1
  not_run: 7
  success_rate: 0%
  operational_result: blocked

  Exact URL returned HTTP 404 maintenance HTML with title "Server
  maintenance" and no application DOM. Runtime identity, smoke, GET layouts,
  422 validation, 409 stale rollback and final restoration checks were not
  run. No layout request was sent, state was not changed and restoration was
  unnecessary.

  Evidence screenshot:
  /private/tmp/e2e-hnd-0096-20260804-evidence/HND-0096-maintenance-1440x900.png
  SHA256: 4ea5b6b1645e4d4a3b6a80036eae4e006116dd998f1e06b81684ccff69b409af
  Browser was independently launched/closed; MATLAB, dependency files, Git,
  deployment and devhub/fallback were untouched.
---
