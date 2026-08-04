---
id: HND-0028
type: task
from: orchestrator
to: e2e
title: Quick regression после TASK-0026
task_section: ../tasks/TASK-0026-e2e-visual-analysis-skill.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0026
  target_status: unavailable
  target_link: https://engee.com
  planned_scope: Проверить доступность project-locked production target и
  выполнить доступный quick suite. Если доступен UI target, применить
  e2e/visual-analysis к уже существующим table/settings dynamic states; без
  baseline rewrite и без devhub/fallback.
acceptance_criteria:
  - Report содержит availability и 75% quick metric с полным списком findings.
  - Visual evidence имеет target, viewport, state и scenario step.
---
