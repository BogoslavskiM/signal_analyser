---
id: HND-0268
type: report
from: engee_user
to: orchestrator
title: TASK-0069 lifecycle probe normalized to current production registry
task_section: ../tasks/TASK-0069-localize-engee-runtime-sigterm.md#acceptance-criteria
description: |
  The read-only lifecycle probe now accepts exactly one target app at either
  documented/legacy or observed current production location and treats
  STARTED/running as case-insensitive active states. It still requires root and
  API HTTP 200, the exact revision and no maintenance content. Syntax-only
  verification passed. LOG-0003 was linked in the suspected bug record; no
  production restart, product, dependency or Git changes occurred.
applied_skills: [engee-user/engee-user-workflow, engee-user/engee-contract-testing]
skipped_requested_skills: []
---
