---
id: HND-0159
type: report
from: e2e
to: orchestrator
title: Output API regression stopped after exact restoration
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  Final HND-0149 continuation passed exact session restoration 1/16, failed 0
  and left 15 not_run. GET /api/layouts returned HTTP 200 at baseline, but shape/
  parity/immutability assertions were not completed inside the browser availability
  window. No contract defect observed; TASK-0042 owns the shell boundary.
---
