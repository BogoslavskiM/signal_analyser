---
id: HND-0364
type: report
from: tester
to: orchestrator
title: Active-output terminalization and design-v2 local gates passed
task_section: ../tasks/TASK-0075-fix-production-active-output-pending.md#acceptance-criteria
description: |
  Tester added deterministic lifecycle coverage for no-wait readiness, failed
  and completed-without-publication tasks, exact 64-poll terminalization,
  stale/cache preservation and restart prevention. The frontend regression
  proves a terminal active-output error replaces loading and does not schedule
  another poll. The dependency-independent backend corpus passes 4,132/4,132;
  the complete frontend corpus passes 9/9, including design-v2 and overlays.
acceptance_criteria:
  - Backend dependency-independent corpus: 4,132/4,132 passed.
  - Frontend complete corpus: 9/9 files passed.
  - Julia syntax and git diff checks: passed.
  - Production visual/runtime verification remains E2E ownership after deploy.
applied_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing, tester/frontend-static-behavior-testing]
---
