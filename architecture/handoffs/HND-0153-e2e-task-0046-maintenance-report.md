---
id: HND-0153
type: report
from: e2e
to: orchestrator
title: Per-pane output API regression blocked by maintenance
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  HND-0149 planned 16 checks; 0 pass, 0 fail, 16 not_run because exact production
  URL/API returned maintenance HTTP 404 before baseline. No contract failure was
  observed and no mutation began. Continue the same handoff after recovery.
---
