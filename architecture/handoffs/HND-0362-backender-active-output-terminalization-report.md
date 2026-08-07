---
id: HND-0362
type: report
from: backender
to: orchestrator
title: Active-output background lifecycle now always terminalizes
task_section: ../tasks/TASK-0075-fix-production-active-output-pending.md#acceptance-criteria
description: |
  Backender wrapped the complete active-task lifecycle so ready/error state is
  published under revision/context guards, added scheduler yield on pending
  polls, a 64-poll bound and restart prevention. Focused no-wait polling passes
  19/19: normal output becomes ready in two polls and a stuck task becomes an
  explicit terminal error at the bound. Active-only calculation, lightweight
  data=[], last-good cache, cancellation, rollback and API shape are unchanged.
  Full backend corpus passes 4,051/4,051 across 102 testsets.
acceptance_criteria:
  - Normal no-wait pending-to-ready polling: passed.
  - Stuck/exception terminalization without restart loop: passed.
  - Complete backend corpus: 4,051/4,051 passed.
applied_skills: [backender/backender-workflow, backender/state-model, backender/calculation-planning, backender/apply-calculation-flow, backender/api-contract-planning]
---
