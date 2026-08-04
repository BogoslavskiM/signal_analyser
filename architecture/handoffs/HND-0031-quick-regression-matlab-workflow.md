---
id: HND-0031
type: task
from: orchestrator
to: e2e
title: Quick regression после TASK-0028
task_section: ../tasks/TASK-0028-background-matlab-critical-scenarios.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0028
  target_status: unavailable
  target_link: https://engee.com
  planned_scope: Проверить project-locked production target и доступный quick
  suite. Использовать HND-0024 только как reference input, не как passed E2E.
  При недоступности вернуть blocker без devhub/fallback.
acceptance_criteria:
  - Availability и 75% quick metric представлены отдельно от MATLAB catalog coverage.
  - Remaining MATLAB gaps не маскируются результатом quick regression.
---
