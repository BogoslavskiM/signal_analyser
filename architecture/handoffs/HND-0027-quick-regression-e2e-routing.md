---
id: HND-0027
type: task
from: orchestrator
to: e2e
title: Quick regression после TASK-0025
task_section: ../tasks/TASK-0025-post-task-e2e-routing.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0025
  target_status: unavailable
  target_link: https://engee.com
  planned_scope: Проверить доступность project-locked production target и
  выполнить доступный quick suite. Для недоступного target вернуть blocker,
  не использовать devhub/fallback. Если target доступен, посчитать passed /
  planned * 100; operational только при обязательной доступности и >=75%.
acceptance_criteria:
  - Report содержит target availability, planned/passed/failed/skipped/timed-out/not-run и success rate.
  - Findings не меняют terminal done TASK-0025; они возвращаются отдельными follow-up candidates.
---
