---
id: HND-0168
type: report
from: e2e
to: orchestrator
title: Coordinated recovery regression partially completed
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#verification-and-results
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
description: |
  HND-0165 passed availability 3/3 and backend 4x4 plus sixteen typed/bound pane
  updates. Exact session and layouts restoration hashes matched baseline. Later
  browser reload hit ERR_SSL_PROTOCOL_ERROR, leaving real 16-host DOM, tab actions
  and viewport geometry not_run. Total 4/12 pass, 0 fail, 8 not_run; transport
  lifecycle is correlated by concurrent DevOps HND-0164.
---
