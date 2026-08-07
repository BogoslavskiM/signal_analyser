---
id: HND-0171
type: task
from: orchestrator
to: e2e
title: Post-task verify runtime stability with fixed browser bootstrap
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#verification-and-results
description: |
  Execute once after TASK-0052 is deployed. On the fixed exact production SHA,
  verify five minutes of root/status availability plus three clean browser
  bootstraps, with product DOM/layout trigger/panes and no false load error.
  Correlate any transport failure with managed runtime evidence; do not mutate
  application session or repository/Git/dependencies.
acceptance_criteria:
  - Runtime/product availability totals and browser product totals are separate.
  - Three clean bootstraps pass and no maintenance/lifecycle transition occurs.
requested_skills: [e2e/e2e-workflow, e2e/visual-analysis]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---
